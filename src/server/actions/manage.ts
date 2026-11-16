"use server";
// Actions de gestion d'une boutique. Chacune : session + appartenance à l'équipe + permission, Zod strict,
// boutique résolue côté serveur (store_id), écriture filtrée par store_id, journal d'audit, puis rafraîchissement.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { one, q, tx } from "@/lib/db";
import { isCmMobile, normalizeCmPhone, slugify } from "@/lib/format";
import { audit, requirePermission, type Staff } from "@/server/auth";
import { getStore, type StoreFull } from "@/server/repo";
import { alertLowStock } from "@/server/notify";
import { insertLines, nextOrderNumber } from "@/server/orders";
import { availability } from "@/server/stock";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().finite().min(0).max(1_000_000_000);
const text = (max: number) => z.string().trim().max(max);

/** Contexte commun : contrôle d'accès puis boutique. */
async function ctx(storeSlug: string, permission: string): Promise<{ staff: Staff; store: StoreFull }> {
  const staff = await requirePermission(permission);
  const store = await getStore(z.string().regex(/^[a-z0-9-]{2,40}$/).parse(storeSlug));
  if (!store) throw new Error("Boutique introuvable");
  return { staff, store };
}

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> | null {
  const r = schema.safeParse(data);
  return r.success ? r.data : null;
}

/* ───────────── Commandes ───────────── */

const OrderUpdate = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }).strict(),
  z.object({ action: z.literal("deliver"), courier: text(60).min(1), courierFee: z.coerce.number().int().min(0).max(1_000_000), deliveredOn: date, discount: z.coerce.number().int().min(0).max(10_000_000) }).strict(),
  z.object({ action: z.literal("cancel"), reason: text(80).min(1) }).strict(),
  z.object({ action: z.literal("note"), note: text(1000) }).strict(),
]);

/** Confirmer, livrer (livreur, frais facturés, date, remise), annuler (motif) ou annoter une commande. */
export async function updateOrder(storeSlug: string, number: string, input: z.input<typeof OrderUpdate>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "orders.update");
  const d = parse(OrderUpdate, input);
  if (!d) return fail("Données invalides.");
  const res = await tx(async (t) => {
    const o = await t.one<{ id: string; status: string; subtotal: number; shipping: number; payment_fee: number; payment_status: string }>(
      "SELECT id, status, subtotal, shipping, payment_fee, payment_status FROM ecom.orders WHERE store_id = $1 AND number = $2 FOR UPDATE", [store.id, number]);
    if (!o) return fail("Commande introuvable.");
    const closed = o.status === "completed" || o.status === "cancelled";
    const event = (label: string) => t.q("INSERT INTO ecom.order_events (store_id, order_id, label, actor) VALUES ($1,$2,$3,$4)", [store.id, o.id, label, staff.name]);
    if (d.action === "note") {
      await t.q("UPDATE ecom.orders SET note = $3 WHERE store_id = $1 AND id = $2", [store.id, o.id, d.note]);
      return { ok: true, message: "Note enregistrée." } as ActionResult;
    }
    if (closed) return fail("Cette commande est déjà terminée.");
    if (d.action === "confirm") {
      if (o.status !== "pending") return fail("Commande déjà confirmée.");
      await t.q("UPDATE ecom.orders SET status = 'confirmed' WHERE id = $1", [o.id]);
      await event("Confirmée par téléphone");
      return { ok: true, message: "Commande confirmée." } as ActionResult;
    }
    if (d.action === "cancel") {
      await t.q("UPDATE ecom.orders SET status = 'cancelled', fulfillment_status = 'unfulfilled', cancel_reason = $2 WHERE id = $1", [o.id, d.reason]);
      await event(`Annulée : ${d.reason}`);
      await t.q("INSERT INTO ecom.notifications (store_id, kind, title, body, link) VALUES ($1,'cancel',$2,$3,$4)",
        [store.id, `Commande annulée : ${number}`, `${d.reason} · par ${staff.name}`, `/b/${store.slug}/commandes/${number}`]);
      return { ok: true, message: "Commande annulée, le stock est libéré." } as ActionResult;
    }
    // Livrée : remise plafonnée au sous-total, total recalculé ici ; paiement à la livraison → payée.
    const discount = Math.min(d.discount, o.subtotal);
    const total = o.subtotal - discount + o.shipping + o.payment_fee;
    await t.q(
      `UPDATE ecom.orders SET status = 'completed', fulfillment_status = 'delivered', payment_status = 'paid', courier = $2, courier_fee = $3,
         delivered_at = ($4::date + time '17:00') AT TIME ZONE 'Africa/Douala', discount = $5, total = $6, settled = ($2 = 'Moi') WHERE id = $1`,
      [o.id, d.courier, d.courierFee, d.deliveredOn, discount, total]);
    await event(`Livrée par ${d.courier}${o.payment_status === "paid" ? "" : ", paiement encaissé"}`);
    return { ok: true, message: "Commande livrée : comptée dans le chiffre d'affaires." } as ActionResult;
  });
  if (res.ok) await audit(staff, store.id, { confirm: "Commande confirmée", deliver: "Commande livrée", cancel: "Commande annulée", note: "Note de commande" }[d.action], number, d.action === "deliver" ? { courier: d.courier, courierFee: d.courierFee, discount: d.discount } : d.action === "cancel" ? { reason: d.reason } : {});
  revalidatePath(`/b/${store.slug}`, "layout");
  return res;
}

const OrderIn = z.object({
  firstName: text(60).min(1), lastName: text(60), phone: z.string().max(30), cityId: z.uuid(), neighborhood: text(80), landmark: text(160), note: text(1000),
  channel: z.enum(["whatsapp", "appel", "facebook", "instagram", "tiktok", "boutique", "autre"]),
  lines: z.array(z.object({ sku: z.string().regex(/^[A-Za-z0-9-]{1,40}$/), qty: z.number().int().min(1).max(99) }).strict()).min(1).max(30),
}).strict();
export type OrderInput = z.input<typeof OrderIn>;

/**
 * Saisir une commande reçue hors boutique (`number` vide) ou modifier une commande en cours : articles, quantités, client, ville.
 * Prix et stock recalculés ici : un article déjà dans la commande garde son prix d'origine, un nouvel article prend le prix actuel.
 */
export async function saveOrder(storeSlug: string, number: string, input: OrderInput): Promise<ActionResult & { number?: string }> {
  const { staff, store } = await ctx(storeSlug, "orders.update");
  const d = parse(OrderIn, input);
  if (!d) return fail("Vérifiez le client, la ville et les articles.");
  const phone = normalizeCmPhone(d.phone);
  if (!isCmMobile(phone)) return fail("Numéro de mobile camerounais attendu (6 XX XX XX XX).");
  const qty = new Map<string, number>();
  for (const l of d.lines) qty.set(l.sku, (qty.get(l.sku) ?? 0) + l.qty);
  const res = await tx<ActionResult & { number?: string; lines?: { sku: string; name: string }[] }>(async (t) => {
    await t.q("SELECT pg_advisory_xact_lock(hashtext($1))", [store.id]); // même verrou que les commandes de la boutique : le stock lu reste juste
    const city = await t.one<{ name: string; fee: number }>("SELECT name, fee FROM ecom.cities WHERE store_id = $1 AND id = $2", [store.id, d.cityId]);
    if (!city) return fail("Ville inconnue.");
    const o = number ? await t.one<{ id: string; status: string; archived: boolean; payment_status: string; discount: number; payment_fee: number }>(
      "SELECT id, status, archived, payment_status, discount, payment_fee FROM ecom.orders WHERE store_id = $1 AND number = $2 FOR UPDATE", [store.id, number]) : undefined;
    if (number && !o) return fail("Commande introuvable.");
    if (o && (o.archived || !["pending", "confirmed", "processing", "packed"].includes(o.status))) return fail("Une commande livrée, annulée ou archivée ne se modifie plus.");
    const old = o ? await t.q<{ sku: string; unit_price: number; quantity: number }>("SELECT sku, unit_price, quantity FROM ecom.order_lines WHERE order_id = $1", [o.id]) : [];
    const oldQty = (sku: string) => old.filter((l) => l.sku === sku).reduce((n, l) => n + l.quantity, 0);
    const linesChanged = old.length !== qty.size || [...qty].some(([sku, n]) => oldQty(sku) !== n);
    if (o?.payment_status === "paid" && linesChanged) return fail("Commande déjà payée en ligne : les articles ne peuvent plus changer.");
    const rows = await t.q<{ sku: string; title: string; price: number; name: string }>(
      `SELECT v.sku, v.title, v.price, p.name FROM ecom.variants v JOIN ecom.products p ON p.id = v.product_id WHERE v.store_id = $1 AND v.sku = ANY($2::text[])`, [store.id, [...qty.keys()]]);
    if (rows.length !== qty.size) return fail("Un article n'existe plus dans le catalogue.");
    const stock = await availability(t.q as never, store.id);
    const short = rows.find((r) => (stock.get(r.sku) ?? 0) + oldQty(r.sku) < qty.get(r.sku)!);
    if (short) return fail(`Stock insuffisant pour ${short.name} (${(stock.get(short.sku) ?? 0) + oldQty(short.sku)} disponible).`);
    const lines = rows.map((r) => ({ ...r, price: old.find((l) => l.sku === r.sku)?.unit_price ?? r.price, qty: qty.get(r.sku)! }));
    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
    const discount = Math.min(o?.discount ?? 0, subtotal);
    const total = subtotal + city.fee - discount + (o?.payment_fee ?? 0);
    const customer = { firstName: d.firstName, lastName: d.lastName, phone, whatsapp: phone, email: "" };
    let id = o?.id;
    let num = number;
    if (o) {
      await t.q(`UPDATE ecom.orders SET customer = customer || $2::jsonb, city = $3, neighborhood = $4, landmark = $5, note = $6, subtotal = $7, shipping = $8, discount = $9, total = $10 WHERE id = $1`,
        [o.id, JSON.stringify({ firstName: d.firstName, lastName: d.lastName, phone }), city.name, d.neighborhood, d.landmark, d.note, subtotal, city.fee, discount, total]);
      await t.q("DELETE FROM ecom.order_lines WHERE order_id = $1", [o.id]);
    } else {
      num = await nextOrderNumber(t, store);
      id = (await t.one<{ id: string }>(
        `INSERT INTO ecom.orders (store_id, number, status, payment_status, fulfillment_status, payment_method, customer, city, neighborhood, landmark, note, subtotal, shipping, total, source)
         VALUES ($1,$2,'confirmed','unpaid','unfulfilled','cod',$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [store.id, num, customer, city.name, d.neighborhood, d.landmark, d.note, subtotal, city.fee, total, { channel: d.channel, campaign: "" }]))!.id;
    }
    await insertLines(t, store.id, id!, lines);
    await t.q("INSERT INTO ecom.order_events (store_id, order_id, label, actor) VALUES ($1,$2,$3,$4)", [store.id, id!,
      o ? `Commande modifiée : ${lines.map((l) => `${l.name} × ${l.qty}`).join(", ")} · total ${total.toLocaleString("fr-FR")} FCFA` : `Commande saisie par l'équipe (${d.channel})`, staff.name]);
    return { ok: true, message: o ? "Commande modifiée." : `Commande ${num} enregistrée.`, number: num, lines };
  });
  if (!res.ok) return res;
  await audit(staff, store.id, number ? "Commande modifiée" : "Commande saisie", res.number ?? number, { lines: d.lines });
  await alertLowStock(store.id, store.slug, store.settings.lowStock, res.lines ?? []);
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: res.message, number: res.number };
}

/** Archiver une commande (test, doublon) : grisée, exclue des statistiques, du stock et de la comptabilité. Réversible. */
export async function archiveOrder(storeSlug: string, number: string, archived: boolean): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "orders.update");
  const n = parse(z.string().regex(/^[A-Z]{1,3}-\d{4}-\d{6}$/), number);
  if (!n || typeof archived !== "boolean") return fail("Commande invalide.");
  const row = await one<{ id: string }>("UPDATE ecom.orders SET archived = $3 WHERE store_id = $1 AND number = $2 RETURNING id", [store.id, n, archived]);
  if (!row) return fail("Commande introuvable.");
  await q("INSERT INTO ecom.order_events (store_id, order_id, label, actor) VALUES ($1,$2,$3,$4)", [store.id, row.id, archived ? "Archivée (hors statistiques)" : "Désarchivée", staff.name]);
  await audit(staff, store.id, archived ? "Commande archivée" : "Commande désarchivée", n);
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: archived ? "Commande archivée." : "Commande rétablie." };
}

/** Note interne d'une commande (formulaire de la fiche commande). */
export async function saveOrderNote(storeSlug: string, number: string, _prev: unknown, f: FormData): Promise<ActionResult> {
  return updateOrder(storeSlug, number, { action: "note", note: String(f.get("note") ?? "") });
}

/** Le livreur a reversé l'argent de ses commandes livrées non réglées. */
export async function settleCourier(storeSlug: string, courier: string): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "orders.settle");
  const name = parse(text(60).min(1), courier);
  if (!name) return fail("Livreur invalide.");
  const rows = await q<{ number: string }>(
    "UPDATE ecom.orders SET settled = true WHERE store_id = $1 AND courier = $2 AND status = 'completed' AND NOT settled AND payment_method = 'cod' RETURNING number", [store.id, name]);
  await audit(staff, store.id, "Reversement livreur reçu", name, { orders: rows.map((r) => r.number) });
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: `${rows.length} commande(s) réglée(s).` };
}

/* ───────────── Achats, dépenses, pertes, campagnes ───────────── */

const Fees = z.object({ transport: money, customs: money, shipping: money, packaging: money, bank: money, other: money }).strict();
// Prix d'achat TOTAL saisi (ce que montre la facture du fournisseur) ; le prix unitaire est calculé ici.
const Purchase = z.object({ product: text(80).min(1), supplier: text(80), date, quantity: z.coerce.number().int().min(1).max(1_000_000), total: money.positive(), fees: Fees }).strict()
  .transform((d) => ({ ...d, unitPrice: Math.round((d.total / d.quantity) * 10_000) / 10_000 }));

export async function addPurchase(storeSlug: string, input: z.input<typeof Purchase>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "books.write");
  const d = parse(Purchase, input);
  if (!d) return fail("Produit, quantité et prix d'achat sont obligatoires.");
  // SKU rattachés : ceux des achats précédents du même produit, sinon ceux de la fiche boutique du même nom.
  const prev = await one<{ skus: string[] }>("SELECT skus FROM ecom.lots WHERE store_id = $1 AND product = $2 ORDER BY purchased_on DESC LIMIT 1", [store.id, d.product]);
  const fromCatalog = prev ? [] : (await q<{ sku: string }>("SELECT v.sku FROM ecom.variants v JOIN ecom.products p ON p.id = v.product_id WHERE p.store_id = $1 AND lower(p.name) = lower($2)", [store.id, d.product])).map((r) => r.sku);
  await q("INSERT INTO ecom.lots (store_id, product, skus, supplier, purchased_on, quantity, unit_price, fees) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [store.id, d.product, prev?.skus ?? fromCatalog, d.supplier, d.date, d.quantity, d.unitPrice, d.fees]);
  await audit(staff, store.id, "Achat ajouté", d.product, { quantity: d.quantity, unitPrice: d.unitPrice });
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: "Achat enregistré, le stock est augmenté." };
}

const LotId = z.uuid();

/** Modifier un achat (quantité, prix, frais, date…) : le stock et le coût de revient sont recalculés à partir de lui. */
export async function updatePurchase(storeSlug: string, id: string, input: z.input<typeof Purchase>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "books.write");
  const d = parse(Purchase, input);
  if (!d || !LotId.safeParse(id).success) return fail("Produit, quantité et prix d'achat sont obligatoires.");
  const before = await one<{ quantity: number; unit_price: string }>(
    "SELECT quantity, unit_price FROM ecom.lots WHERE id = $1 AND store_id = $2", [id, store.id]);
  if (!before) return fail("Achat introuvable.");
  await q("UPDATE ecom.lots SET product = $3, supplier = $4, purchased_on = $5, quantity = $6, unit_price = $7, fees = $8 WHERE id = $1 AND store_id = $2",
    [id, store.id, d.product, d.supplier, d.date, d.quantity, d.unitPrice, d.fees]);
  await audit(staff, store.id, "Achat modifié", d.product, { avant: { quantity: before.quantity, unitPrice: Number(before.unit_price) }, après: { quantity: d.quantity, unitPrice: d.unitPrice } });
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: "Achat modifié, le stock est recalculé." };
}

export async function deletePurchase(storeSlug: string, id: string): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "books.write");
  if (!LotId.safeParse(id).success) return fail("Achat introuvable.");
  const gone = await one<{ product: string; quantity: number }>("DELETE FROM ecom.lots WHERE id = $1 AND store_id = $2 RETURNING product, quantity", [id, store.id]);
  if (!gone) return fail("Achat introuvable.");
  await audit(staff, store.id, "Achat supprimé", gone.product, { quantity: gone.quantity });
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: "Achat supprimé, le stock est recalculé." };
}

const Charge = z.object({ date, category: text(60).min(1), description: text(160), amount: z.coerce.number().positive().max(1_000_000_000), method: text(40), monthly: z.boolean(), included: z.boolean() }).strict();

export async function addCharge(storeSlug: string, input: z.input<typeof Charge>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "books.write");
  const d = parse(Charge, input);
  if (!d) return fail("Catégorie et montant obligatoires.");
  await q("INSERT INTO ecom.charges (store_id, spent_on, category, description, amount, payment_method, included_in_cost, monthly) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [store.id, d.date, d.category, d.description, d.amount, d.method, d.included, d.monthly]);
  await audit(staff, store.id, "Dépense ajoutée", d.category, { amount: d.amount, monthly: d.monthly });
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: d.monthly ? "Dépense ajoutée, répétée chaque mois." : "Dépense ajoutée." };
}

const Loss = z.object({ date, product: text(80).min(1), quantity: z.coerce.number().int().min(1).max(100_000), reason: text(60).min(1), note: text(200) }).strict();

export async function addLoss(storeSlug: string, input: z.input<typeof Loss>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "books.write");
  const d = parse(Loss, input);
  if (!d) return fail("Produit, quantité et motif obligatoires.");
  await q("INSERT INTO ecom.losses (store_id, lost_on, product, quantity, reason, note) VALUES ($1,$2,$3,$4,$5,$6)", [store.id, d.date, d.product, d.quantity, d.reason, d.note]);
  await audit(staff, store.id, "Perte enregistrée", d.product, { quantity: d.quantity, reason: d.reason });
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: "Perte enregistrée, le stock est diminué." };
}

const Campaign = z.object({
  platform: text(40).min(1), name: text(60).min(1), products: text(120), cities: text(120), start: date, end: date.or(z.literal("")),
  spend: z.coerce.number().positive().max(1_000_000_000), currency: z.enum(["XAF", "EUR"]),
}).strict();

export async function addCampaign(storeSlug: string, input: z.input<typeof Campaign>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "books.write");
  const d = parse(Campaign, input);
  if (!d) return fail("Plateforme, nom, date de début et budget obligatoires.");
  if (d.end && d.end < d.start) return fail("La fin doit être après le début.");
  const code = slugify(d.name).slice(0, 40);
  const taken = await one("SELECT 1 FROM ecom.campaigns WHERE store_id = $1 AND code = $2", [store.id, code]);
  if (taken) return fail("Une campagne porte déjà ce nom : choisissez-en un autre.");
  await q("INSERT INTO ecom.campaigns (store_id, code, platform, name, products, cities, start_on, end_on, spend, currency, rate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    [store.id, code, d.platform, d.name, d.products, d.cities, d.start, d.end || null, d.spend, d.currency, d.currency === "EUR" ? store.settings.eurRate : 1]);
  await audit(staff, store.id, "Campagne ajoutée", d.name, { spend: d.spend, currency: d.currency });
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: `Campagne ajoutée (code ${code}).` };
}

const CampaignEdit = z.discriminatedUnion("action", [
  z.object({ action: z.literal("stop"), end: date }).strict(),
  z.object({ action: z.literal("resume") }).strict(),
  z.object({ action: z.literal("budget"), add: z.coerce.number().positive().max(1_000_000_000) }).strict(),
]);

/** Arrêter une campagne (date de fin), la relancer, ou ajouter du budget : ses résultats suivent la nouvelle période. */
export async function editCampaign(storeSlug: string, id: string, input: z.input<typeof CampaignEdit>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "books.write");
  const d = parse(CampaignEdit, input);
  if (!d || !z.uuid().safeParse(id).success) return fail("Données invalides.");
  const sql = d.action === "stop" ? "UPDATE ecom.campaigns SET end_on = $3 WHERE id = $1 AND store_id = $2 AND start_on <= $3 RETURNING name"
    : d.action === "resume" ? "UPDATE ecom.campaigns SET end_on = NULL WHERE id = $1 AND store_id = $2 RETURNING name"
    : "UPDATE ecom.campaigns SET spend = spend + $3 WHERE id = $1 AND store_id = $2 RETURNING name";
  const row = await one<{ name: string }>(sql, d.action === "resume" ? [id, store.id] : [id, store.id, d.action === "stop" ? d.end : d.add]);
  if (!row) return fail(d.action === "stop" ? "La date d'arrêt doit être après le début." : "Campagne introuvable.");
  await audit(staff, store.id, { stop: "Campagne arrêtée", resume: "Campagne relancée", budget: "Budget de campagne ajouté" }[d.action], row.name, d);
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true, message: { stop: "Campagne arrêtée.", resume: "Campagne relancée.", budget: "Budget ajouté." }[d.action] };
}

/* ───────────── Messages et avis ───────────── */

export async function setMessageHandled(storeSlug: string, id: string, handled: boolean): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "messages.update");
  if (!parse(z.uuid(), id)) return fail("Message invalide.");
  await q("UPDATE ecom.messages SET handled = $3 WHERE store_id = $1 AND id = $2", [store.id, id, handled]);
  await audit(staff, store.id, handled ? "Message traité" : "Message rouvert", id);
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true };
}

/** Panier abandonné relancé (WhatsApp, appel) ou remis à relancer. */
export async function setCartContacted(storeSlug: string, id: string, contacted: boolean): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "carts.update");
  if (!parse(z.uuid(), id)) return fail("Panier invalide.");
  await q("UPDATE ecom.carts SET status = $3 WHERE store_id = $1 AND id = $2 AND status <> 'ordered'", [store.id, id, contacted ? "contacted" : "open"]);
  await audit(staff, store.id, contacted ? "Panier relancé" : "Panier remis à relancer", id);
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true };
}

const ReviewIn = z.object({ productSlug: z.string().regex(/^[a-z0-9-]{1,80}$/), name: text(40).min(2), city: text(40), rating: z.coerce.number().int().min(1).max(5), text: text(600).min(5), source: text(60).min(1), consent: z.literal(true), photo: z.string().url().startsWith("https://").max(500).nullable() }).strict();

export async function addReview(storeSlug: string, input: z.input<typeof ReviewIn>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "reviews.write");
  const d = parse(ReviewIn, input);
  if (!d) return fail("Vérifiez les champs : l'accord du client est obligatoire.");
  const product = await one("SELECT 1 FROM ecom.products WHERE store_id = $1 AND slug = $2", [store.id, d.productSlug]);
  if (!product) return fail("Produit introuvable.");
  await q("INSERT INTO ecom.reviews (store_id, product_slug, name, city, rating, text, photo, source, consent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)",
    [store.id, d.productSlug, d.name, d.city, d.rating, d.text, d.photo, d.source]);
  await audit(staff, store.id, "Avis publié", d.productSlug, { name: d.name, rating: d.rating });
  revalidatePath(`/b/${store.slug}`, "layout");
  revalidatePath(`/s/${store.slug}`, "layout");
  return { ok: true, message: "Avis publié sur la fiche produit." };
}

export async function deleteReview(storeSlug: string, id: string): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "reviews.write");
  if (!parse(z.uuid(), id)) return fail("Avis invalide.");
  await q("DELETE FROM ecom.reviews WHERE store_id = $1 AND id = $2", [store.id, id]);
  await audit(staff, store.id, "Avis retiré", id);
  revalidatePath(`/b/${store.slug}`, "layout");
  revalidatePath(`/s/${store.slug}`, "layout");
  return { ok: true };
}

/* ───────────── Images ───────────── */

/** Envoi d'une image (avis client, produit) : type vérifié par signature, 10 Mo max, ré-encodée sans EXIF. */
export async function uploadImage(storeSlug: string, folder: "products" | "reviews" | "stores", form: FormData): Promise<{ ok: true; src: string; srcSet: string; width: number; height: number } | { ok: false; error: string }> {
  const { staff, store } = await ctx(storeSlug, "media.upload");
  if (!["products", "reviews", "stores"].includes(folder)) return { ok: false, error: "Dossier invalide." };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Aucun fichier." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "Image trop lourde (10 Mo maximum)." };
  try {
    const { storeImage } = await import("@/lib/storage");
    const img = await storeImage(Buffer.from(await file.arrayBuffer()), { folder, storeSlug: store.slug });
    await audit(staff, store.id, "Image envoyée", folder);
    return { ok: true, ...img };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Envoi impossible." };
  }
}

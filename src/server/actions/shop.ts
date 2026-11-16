"use server";
// Actions publiques de la boutique : commande, message de contact, inscription aux nouveautés, statut de paiement.
// Aucune donnée venue du navigateur n'est crue : prix, stock, frais et total sont recalculés ici.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { one, q, tx } from "@/lib/db";
import { env, onlinePayEnabled } from "@/lib/env";
import { isCmMobile, normalizeCmPhone } from "@/lib/format";
import { clientIpHash, randomToken, rateLimit, safeEqual, sha256 } from "@/lib/security";
import { createCheckout } from "@/server/kpay";
import { reconcilePayment } from "@/server/payments";
import { getStore } from "@/server/repo";
import type { Slip } from "@/lib/slip-pdf";
import { PAY_LABEL, type PayMethod } from "@/lib/payment";
import { alertLowStock, notify } from "@/server/notify";
import { availability } from "@/server/stock";
import { insertLines, nextOrderNumber } from "@/server/orders";

const storeSlug = z.string().regex(/^[a-z0-9-]{2,40}$/);
const name = z.string().trim().min(1).max(60);

const OrderIn = z.object({
  idempotencyKey: z.uuid(),
  lines: z.array(z.object({ sku: z.string().regex(/^[A-Za-z0-9-]{1,40}$/), qty: z.number().int().min(1).max(5) }).strict()).min(1).max(20),
  firstName: name, lastName: name, phone: z.string().max(30), whatsapp: z.string().max(30), email: z.email().max(120).or(z.literal("")),
  cityId: z.uuid(), neighborhood: z.string().trim().min(1).max(80), landmark: z.string().trim().max(160), note: z.string().trim().max(500),
  payment: z.enum(["cod", "mobile_money", "card"]),
  source: z.object({ channel: z.string().regex(/^[\w.-]{1,60}$/), campaign: z.string().regex(/^[\w.-]{0,60}$/) }).strict().nullable(),
}).strict();

export type PlacedOrder = {
  ok: true; number: string; token: string; placedAt: string; paid: boolean; storeName: string;
  lines: { name: string; variant: string; quantity: number; unitPrice: number }[]; subtotal: number; shipping: number; total: number;
  payment: { method: "cod" } | { method: "mobile_money" | "card"; gatewayUrl: string };
};
export type OrderError = { ok: false; error: string; field?: string };

/** Passe une commande : validation stricte, stock vérifié sous verrou, numéro attribué, paiement en ligne lancé si choisi. */
export async function placeOrder(slug: string, input: z.input<typeof OrderIn>): Promise<PlacedOrder | OrderError> {
  const store = await getStore(storeSlug.parse(slug));
  if (!store || store.status !== "active") return { ok: false, error: "Boutique indisponible." };
  const d = OrderIn.safeParse(input);
  if (!d.success) return { ok: false, error: "Vérifiez les informations de la commande." };
  const v = d.data;
  const phone = normalizeCmPhone(v.phone);
  if (!isCmMobile(phone)) return { ok: false, error: "Numéro de mobile camerounais attendu.", field: "phone" };
  const whatsapp = v.whatsapp ? normalizeCmPhone(v.whatsapp) : phone;
  if (!isCmMobile(whatsapp)) return { ok: false, error: "Numéro WhatsApp invalide.", field: "whatsapp" };
  const online = v.payment !== "cod";
  if (online && !onlinePayEnabled()) return { ok: false, error: "Le paiement en ligne arrive bientôt : choisissez le paiement à la livraison." };
  if (!(await rateLimit(`order:${await clientIpHash()}`, 10, 3600))) return { ok: false, error: "Trop de commandes en peu de temps. Réessayez plus tard ou écrivez-nous." };

  const token = randomToken(24);
  const res = await tx(async (t) => {
    // Rejeu (double clic) : renvoie la commande déjà créée sans en créer une deuxième.
    const again = await t.one<{ number: string }>("SELECT number FROM ecom.orders WHERE store_id = $1 AND idempotency_key = $2", [store.id, v.idempotencyKey]);
    if (again) return { ok: false, error: "Commande déjà envoyée.", field: "duplicate" } as OrderError;
    // Une seule création de commande à la fois par boutique : le stock lu ici ne peut pas être pris par une autre commande.
    await t.q("SELECT pg_advisory_xact_lock(hashtext($1))", [store.id]);
    const city = await t.one<{ name: string; fee: number }>("SELECT name, fee FROM ecom.cities WHERE store_id = $1 AND id = $2 AND active", [store.id, v.cityId]);
    if (!city) return { ok: false, error: "Ville non desservie.", field: "city" } as OrderError;
    const skus = [...new Set(v.lines.map((l) => l.sku))];
    const rows = await t.q<{ sku: string; title: string; price: number; name: string }>(
      `SELECT v.sku, v.title, v.price, p.name FROM ecom.variants v JOIN ecom.products p ON p.id = v.product_id
       WHERE v.store_id = $1 AND p.status = 'active' AND v.sku = ANY($2::text[])`, [store.id, skus]);
    if (rows.length !== skus.length) return { ok: false, error: "Un article n'est plus disponible. Rechargez la page." } as OrderError;
    const stock = await availability(t.q as never, store.id);
    const lines = v.lines.map((l) => ({ ...rows.find((r) => r.sku === l.sku)!, qty: l.qty }));
    const short = lines.find((l) => (stock.get(l.sku) ?? 0) < l.qty);
    if (short) return { ok: false, error: `Stock insuffisant pour ${short.name} (${stock.get(short.sku) ?? 0} disponible).` } as OrderError;
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const shipping = city.fee;
    const total = subtotal + shipping;
    const number = await nextOrderNumber(t, store);
    const o = await t.one<{ id: string; placed_at: Date }>(
      `INSERT INTO ecom.orders (store_id, number, status, payment_status, fulfillment_status, payment_method, customer, city, neighborhood, landmark, note,
         subtotal, shipping, total, source, access_hash, idempotency_key)
       VALUES ($1,$2,'pending',$3,'unfulfilled',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id, placed_at`,
      [store.id, number, online ? "pending" : "unpaid", v.payment, { firstName: v.firstName, lastName: v.lastName, phone, whatsapp, email: v.email },
        city.name, v.neighborhood, v.landmark, v.note, subtotal, shipping, total, v.source, sha256(token), v.idempotencyKey]);
    await insertLines(t, store.id, o!.id, lines);
    await t.q("UPDATE ecom.carts SET status = 'ordered', order_number = $3, updated_at = now() WHERE store_id = $1 AND key = $2", [store.id, v.idempotencyKey, number]);
    await t.q("INSERT INTO ecom.notifications (store_id, kind, title, body, link) VALUES ($1,'order',$2,$3,$4)", [store.id, `Nouvelle commande ${number}`,
      `${v.firstName} ${v.lastName} · ${city.name} · ${total.toLocaleString("fr-FR")} FCFA`, `/b/${store.slug}/commandes/${number}`]);
    await t.q("INSERT INTO ecom.order_events (store_id, order_id, label, actor) VALUES ($1,$2,$3,'Client')", [store.id, o!.id,
      `Commande passée sur la boutique${v.source?.campaign ? ` (campagne ${v.source.campaign})` : v.source ? ` (${v.source.channel})` : ""}`]);
    return { ok: true as const, id: o!.id, number, placedAt: o!.placed_at.toISOString(), subtotal, shipping, total, lines };
  });
  if (!res.ok) {
    if (res.field === "duplicate") return { ok: false, error: "Cette commande a déjà été envoyée : vérifiez vos messages ou notre WhatsApp." };
    return res;
  }

  const summary = {
    ok: true as const, number: res.number, token, placedAt: res.placedAt, paid: false, storeName: store.name,
    lines: res.lines.map((l) => ({ name: l.name, variant: l.title, quantity: l.qty, unitPrice: l.price })), subtotal: res.subtotal, shipping: res.shipping, total: res.total,
  };
  revalidatePath(`/b/${store.slug}`, "layout");
  await alertLowStock(store.id, store.slug, store.settings.lowStock, res.lines.map((l) => ({ sku: l.sku, name: l.name })));
  if (!online) return { ...summary, payment: { method: "cod" } };

  // Paiement en ligne : la commande existe déjà ; seule une vérification KPay (webhook ou retour) la passera en « payée ».
  const back = `${env().APP_URL.replace(/\/$/, "")}/s/${store.slug}/commande/confirmation/${res.number}?t=${token}`;
  const externalId = `${res.number}-1`;
  await q("INSERT INTO ecom.payments (store_id, order_id, provider, method, external_id, amount) VALUES ($1,$2,'kpay',$3,$4,$5)", [store.id, res.id, v.payment, externalId, res.total]);
  const init = await createCheckout({ amount: res.total, externalId, description: `Commande ${res.number} · ${store.name}`, returnUrl: back })
    .catch(() => ({ ok: false as const, message: "réseau" }));
  if (!init.ok) {
    await q("UPDATE ecom.payments SET status = 'FAILED', updated_at = now() WHERE external_id = $1", [externalId]);
    await q("INSERT INTO ecom.order_events (store_id, order_id, label) VALUES ($1,$2,'Paiement en ligne refusé au lancement')", [store.id, res.id]);
    return { ok: false, error: `Votre commande ${res.number} est enregistrée, mais le paiement n'a pas pu démarrer. Nous vous appelons pour la régler à la livraison.` };
  }
  await q("UPDATE ecom.payments SET provider_payment_id = $2, gateway_url = $3, updated_at = now() WHERE external_id = $1", [externalId, init.id, init.url]);
  return { ...summary, payment: { method: v.payment, gatewayUrl: init.url } };
}

/** Statut d'une commande pour sa page de confirmation : numéro + jeton secret reçu à la commande (jamais le numéro seul). */
export async function orderPaymentStatus(slug: string, number: string, token: string): Promise<{ paid: boolean; failed: boolean } | null> {
  const store = await getStore(storeSlug.parse(slug));
  if (!store || typeof number !== "string" || typeof token !== "string" || token.length > 100) return null;
  const o = await one<{ payment_status: string; access_hash: string | null; id: string }>("SELECT id, payment_status, access_hash FROM ecom.orders WHERE store_id = $1 AND number = $2", [store.id, number.slice(0, 40)]);
  if (!o?.access_hash || !safeEqual(o.access_hash, sha256(token))) return null;
  if (o.payment_status === "paid") return { paid: true, failed: false };
  // Retour de la page de paiement : on demande le statut à KPay (jamais la redirection seule).
  const p = await one<{ id: string; status: string }>("SELECT id, status FROM ecom.payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1", [o.id]);
  const status = p && p.status === "PENDING" ? await reconcilePayment(p.id).catch(() => p.status) : p?.status;
  return { paid: status === "COMPLETED", failed: status === "FAILED" || status === "CANCELLED" };
}

/** Facture d'une commande payée en ligne : numéro + jeton secret, jamais le numéro seul. */
export async function orderInvoice(slug: string, number: string, token: string): Promise<Slip | null> {
  const store = await getStore(storeSlug.parse(slug));
  if (!store || typeof number !== "string" || typeof token !== "string" || token.length > 100) return null;
  const o = await one<{ id: string; access_hash: string | null; placed_at: Date; customer: { firstName: string; lastName: string }; city: string; subtotal: number; shipping: number; discount: number; total: number; payment_method: PayMethod; payment_status: string }>(
    "SELECT id, access_hash, placed_at, customer, city, subtotal, shipping, discount, total, payment_method, payment_status FROM ecom.orders WHERE store_id = $1 AND number = $2", [store.id, number.slice(0, 40)]);
  if (!o?.access_hash || !safeEqual(o.access_hash, sha256(token)) || o.payment_status !== "paid") return null;
  const [lines, p] = await Promise.all([
    q<{ name: string; variant: string; quantity: number; unit_price: number }>("SELECT name, variant, quantity, unit_price FROM ecom.order_lines WHERE order_id = $1 ORDER BY position", [o.id]),
    one<{ reference: string | null; charged: number | null; updated_at: Date }>("SELECT reference, charged, updated_at FROM ecom.payments WHERE order_id = $1 AND status = 'COMPLETED' ORDER BY updated_at DESC LIMIT 1", [o.id]),
  ]);
  return {
    store: store.name, number, placedAt: o.placed_at.toISOString(), subtotal: o.subtotal, shipping: o.shipping, discount: o.discount || undefined, total: o.total, paid: true,
    paymentLabel: PAY_LABEL[o.payment_method], trackUrl: "", lines: lines.map((l) => ({ name: l.name, variant: l.variant, quantity: l.quantity, unitPrice: l.unit_price })),
    invoice: { customer: `${o.customer.firstName} ${o.customer.lastName}`, city: o.city, paidAt: (p?.updated_at ?? o.placed_at).toISOString(), reference: p?.reference ?? "", charged: p?.charged ?? 0 },
  };
}

const MessageIn = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().max(30), message: z.string().trim().min(5).max(2000) }).strict();

export async function sendContactMessage(slug: string, input: z.input<typeof MessageIn>): Promise<{ ok: boolean; error?: string }> {
  const store = await getStore(storeSlug.parse(slug));
  if (!store || store.status !== "active") return { ok: false, error: "Boutique indisponible." };
  const d = MessageIn.safeParse(input);
  const phone = d.success ? normalizeCmPhone(d.data.phone) : null;
  if (!d.success || !isCmMobile(phone)) return { ok: false, error: "Vérifiez votre nom, votre numéro et votre message." };
  if (!(await rateLimit(`contact:${await clientIpHash()}`, 5, 3600))) return { ok: false, error: "Trop de messages envoyés. Réessayez plus tard." };
  const m = await one<{ id: string }>("INSERT INTO ecom.messages (store_id, name, phone, message) VALUES ($1,$2,$3,$4) RETURNING id", [store.id, d.data.name, phone, d.data.message]);
  await notify(store.id, "message", `Nouveau message de ${d.data.name}`, d.data.message.slice(0, 140), `/b/${store.slug}/messages/${m?.id ?? ""}`);
  revalidatePath(`/b/${store.slug}`, "layout");
  return { ok: true };
}

export async function subscribe(slug: string, rawPhone: string): Promise<{ ok: boolean; error?: string }> {
  const store = await getStore(storeSlug.parse(slug));
  if (!store || store.status !== "active") return { ok: false, error: "Boutique indisponible." };
  const phone = normalizeCmPhone(String(rawPhone).slice(0, 30));
  if (!isCmMobile(phone)) return { ok: false, error: "Numéro WhatsApp camerounais attendu." };
  if (!(await rateLimit(`sub:${await clientIpHash()}`, 5, 3600))) return { ok: false, error: "Réessayez plus tard." };
  await q("INSERT INTO ecom.subscribers (store_id, phone) VALUES ($1,$2) ON CONFLICT (store_id, phone) DO UPDATE SET unsubscribed_at = NULL", [store.id, phone]);
  return { ok: true };
}

const CartIn = z.object({
  key: z.uuid(),
  lines: OrderIn.shape.lines,
  firstName: z.string().trim().max(60), lastName: z.string().trim().max(60), phone: z.string().max(30), cityId: z.uuid().or(z.literal("")),
}).strict();

/**
 * Panier en cours de saisie (formulaire de commande pas encore validé) : enregistré dès qu'un numéro joignable est saisi,
 * pour pouvoir relancer le client. Prix recalculés ici. Une commande validée le marque « commandé ».
 */
export async function saveCart(slug: string, input: z.input<typeof CartIn>): Promise<void> {
  const store = await getStore(storeSlug.parse(slug));
  const d = CartIn.safeParse(input);
  if (!store || store.status !== "active" || !d.success) return;
  const phone = normalizeCmPhone(d.data.phone);
  if (!isCmMobile(phone)) return;
  if (!(await rateLimit(`cart:${await clientIpHash()}`, 60, 3600))) return;
  const v = d.data;
  const rows = await q<{ sku: string; title: string; price: number; name: string }>(
    `SELECT v.sku, v.title, v.price, p.name FROM ecom.variants v JOIN ecom.products p ON p.id = v.product_id
     WHERE v.store_id = $1 AND p.status = 'active' AND v.sku = ANY($2::text[])`, [store.id, v.lines.map((l) => l.sku)]);
  const lines = v.lines.flatMap((l) => { const r = rows.find((x) => x.sku === l.sku); return r ? [{ sku: r.sku, name: r.name, variant: r.title, unitPrice: r.price, quantity: l.qty }] : []; });
  if (!lines.length) return;
  const city = v.cityId ? await one<{ name: string }>("SELECT name FROM ecom.cities WHERE id = $1 AND store_id = $2", [v.cityId, store.id]) : undefined;
  await q(`INSERT INTO ecom.carts (store_id, key, customer, city, lines, total) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (store_id, key) DO UPDATE SET customer = EXCLUDED.customer, city = EXCLUDED.city, lines = EXCLUDED.lines, total = EXCLUDED.total, updated_at = now()
     WHERE ecom.carts.status = 'open'`,
    [store.id, v.key, { firstName: v.firstName, lastName: v.lastName, phone }, city?.name ?? "", JSON.stringify(lines), lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0)]);
}

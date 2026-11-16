"use server";
// Paramètres, contenu et catalogue d'une boutique. Même règle que manage.ts : session + permission, Zod strict,
// écriture filtrée par store_id, journal d'audit, rafraîchissement de l'outil et de la boutique publique.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { one, q, tx } from "@/lib/db";
import { normalizeCmPhone } from "@/lib/format";
import { validIds } from "@/lib/pixels";
import type { Section } from "@/lib/types";
import { audit, requirePermission, type Staff } from "@/server/auth";
import { DEFAULT_WA, getStore, type StoreFull } from "@/server/repo";
import type { ActionResult } from "./manage";

const fail = (error: string): ActionResult => ({ ok: false, error });
const text = (max: number) => z.string().trim().max(max);
const slugRe = /^[a-z0-9-]{2,60}$/;
const lines = (s: string, max = 40) => s.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, max);

async function ctx(storeSlug: string, permission: string): Promise<{ staff: Staff; store: StoreFull }> {
  const staff = await requirePermission(permission);
  const store = await getStore(z.string().regex(/^[a-z0-9-]{2,40}$/).parse(storeSlug));
  if (!store) throw new Error("Boutique introuvable");
  return { staff, store };
}
const refresh = (slug: string) => { revalidatePath(`/b/${slug}`, "layout"); revalidatePath(`/s/${slug}`, "layout"); };
const get = (f: FormData, k: string) => String(f.get(k) ?? "");

/* ───────────── Paramètres de la boutique ───────────── */

const Settings = z.object({
  name: text(60).min(2), tagline: text(120), status: z.enum(["active", "draft"]),
  phone: z.string().max(30), whatsapp: z.string().max(30), email: z.email().max(120).or(z.literal("")), hours: text(80),
  facebook: z.url().startsWith("https://").max(200).or(z.literal("")), instagram: z.url().startsWith("https://").max(200).or(z.literal("")), tiktok: z.url().startsWith("https://").max(200).or(z.literal("")),
  eurRate: z.coerce.number().positive().max(10_000), taxRate: z.coerce.number().min(0).max(100), lowStock: z.coerce.number().int().min(0).max(10_000),
  withdrawRate: z.preprocess((x) => String(x).replace(",", "."), z.coerce.number().min(0).max(20)), stateTax: z.coerce.number().int().min(0).max(100_000), cartDelay: z.coerce.number().int().min(5).max(1440),
  waConfirm: text(1000), waShip: text(1000), waDelivered: text(1000), waCart: text(1000),
  couriers: z.string().max(2000), chargeCategories: z.string().max(2000),
}).strict();

export async function saveStoreSettings(storeSlug: string, _: ActionResult | undefined, f: FormData): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "settings.update");
  const d = Settings.safeParse(Object.fromEntries(["name", "tagline", "status", "phone", "whatsapp", "email", "hours", "facebook", "instagram", "tiktok", "eurRate", "taxRate", "lowStock", "withdrawRate", "stateTax", "cartDelay", "waConfirm", "waShip", "waDelivered", "waCart", "couriers", "chargeCategories"].map((k) => [k, get(f, k).trim()])));
  if (!d.success) return fail("Vérifiez les champs (liens en https://, email valide, taux numériques).");
  const v = d.data;
  const phone = v.phone ? normalizeCmPhone(v.phone) : "";
  const whatsapp = v.whatsapp ? normalizeCmPhone(v.whatsapp) : "";
  if (phone === null || whatsapp === null) return fail("Téléphone ou WhatsApp : numéro camerounais attendu.");
  const wa = { confirm: v.waConfirm || DEFAULT_WA.confirm, ship: v.waShip || DEFAULT_WA.ship, delivered: v.waDelivered || DEFAULT_WA.delivered, cart: v.waCart || DEFAULT_WA.cart };
  const settings = { ...store.settings, eurRate: v.eurRate, taxRate: v.taxRate / 100, lowStock: v.lowStock, withdrawRate: v.withdrawRate / 100, stateTax: v.stateTax, cartDelay: v.cartDelay, wa, lists: { ...store.settings.lists, couriers: lines(v.couriers), chargeCategories: lines(v.chargeCategories) } };
  await q(`UPDATE ecom.stores SET name = $2, tagline = $3, status = $4, contact = $5, social = $6, settings = $7 WHERE id = $1`, [
    store.id, v.name, v.tagline, v.status, { phone, whatsapp, email: v.email, hours: v.hours }, { facebook: v.facebook, instagram: v.instagram, tiktok: v.tiktok }, settings]);
  await audit(staff, store.id, "Paramètres modifiés", store.slug, { status: v.status, eurRate: v.eurRate, taxRate: v.taxRate, lowStock: v.lowStock, withdrawRate: v.withdrawRate, stateTax: v.stateTax, cartDelay: v.cartDelay });
  refresh(store.slug);
  return { ok: true, message: "Paramètres enregistrés." };
}

/** Logo : image déjà envoyée et ré-encodée par uploadImage, URL de notre stockage uniquement. */
export async function setStoreLogo(storeSlug: string, src: string): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "settings.update");
  const ok = z.url().startsWith(`${process.env.AWS_ENDPOINT_URL_S3}/`).safeParse(src);
  if (!ok.success) return fail("Image invalide.");
  await q("UPDATE ecom.stores SET logo = $2, favicon = $2 WHERE id = $1", [store.id, src]);
  await audit(staff, store.id, "Logo remplacé", store.slug);
  refresh(store.slug);
  return { ok: true, message: "Logo remplacé." };
}

/* ───────────── Pixels ───────────── */

const PixelsIn = z.object({ metaPixelIds: z.array(z.string().max(30)).max(10), tiktokPixelId: z.string().max(40), ga4Id: z.string().max(30), googleAdsId: z.string().max(30), gtmId: z.string().max(30) }).strict();

export async function savePixels(storeSlug: string, input: z.input<typeof PixelsIn>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "settings.update");
  const d = PixelsIn.safeParse(input);
  if (!d.success) return fail("Identifiants invalides.");
  const clean = validIds({ ...d.data, metaPixelIds: d.data.metaPixelIds.filter(Boolean) });
  const rejected = d.data.metaPixelIds.filter(Boolean).length - clean.metaPixelIds.length + (["tiktokPixelId", "ga4Id", "googleAdsId", "gtmId"] as const).filter((k) => d.data[k] && !clean[k]).length;
  if (rejected) return fail("Un identifiant n'a pas le bon format.");
  await q("UPDATE ecom.stores SET tracking = $2 WHERE id = $1", [store.id, clean]);
  await audit(staff, store.id, "Pixels modifiés", store.slug, { meta: clean.metaPixelIds.length, tiktok: !!clean.tiktokPixelId, ga4: !!clean.ga4Id, ads: !!clean.googleAdsId, gtm: !!clean.gtmId });
  refresh(store.slug);
  return { ok: true, message: "Pixels enregistrés : ils se chargent après l'accord du visiteur." };
}

/* ───────────── Éditeur (sections + thème) ───────────── */

const str = (max: number) => z.string().max(max);
const href = z.string().max(200).regex(/^(\/[\w\-/?=&.#%]*)?$/, "lien interne commençant par /");
const SectionIn: z.ZodType<Section> = z.discriminatedUnion("type", [
  z.object({ id: str(40), type: z.literal("hero"), enabled: z.boolean(), eyebrow: str(80), title: str(120), text: str(400), ctaLabel: str(40), ctaHref: href, secondaryLabel: str(40), secondaryHref: href, productSlug: str(80) }).strict(),
  z.object({ id: str(40), type: z.literal("trust"), enabled: z.boolean(), items: z.array(str(80)).max(6) }).strict(),
  z.object({ id: str(40), type: z.literal("categories"), enabled: z.boolean(), title: str(120) }).strict(),
  z.object({ id: str(40), type: z.literal("products"), enabled: z.boolean(), title: str(120), tabs: z.boolean(), limit: z.number().int().min(1).max(24) }).strict(),
  z.object({ id: str(40), type: z.literal("banner"), enabled: z.boolean(), title: str(120), text: str(400), ctaLabel: str(40), ctaHref: href }).strict(),
  z.object({ id: str(40), type: z.literal("posts"), enabled: z.boolean(), title: str(120) }).strict(),
  z.object({ id: str(40), type: z.literal("newsletter"), enabled: z.boolean(), title: str(120), text: str(400) }).strict(),
  z.object({ id: str(40), type: z.literal("featured"), enabled: z.boolean(), title: str(120), text: str(400), productSlug: str(80) }).strict(),
  z.object({ id: str(40), type: z.literal("imageText"), enabled: z.boolean(), title: str(120), text: str(600), productSlug: str(80), ctaLabel: str(40), ctaHref: href, reverse: z.boolean() }).strict(),
  z.object({ id: str(40), type: z.literal("richtext"), enabled: z.boolean(), title: str(120), text: str(1200) }).strict(),
  z.object({ id: str(40), type: z.literal("faq"), enabled: z.boolean(), title: str(120), items: z.array(z.object({ q: str(200), a: str(800) }).strict()).max(12) }).strict(),
]);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const ThemeIn = z.object({ colors: z.object({ ink: color, bg: color, accent: color, accentDeep: color, accentSoft: color, night: color, onNight: color }).strict(), headingFont: z.enum(["serif", "sans"]) }).strict();

export async function publishStore(storeSlug: string, input: { sections: unknown; theme: unknown }): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "content.publish");
  const sections = z.array(SectionIn).max(30).safeParse(input.sections);
  const theme = ThemeIn.safeParse(input.theme);
  if (!sections.success || !theme.success) return fail("Une section contient une valeur invalide (les liens doivent commencer par /).");
  await q("UPDATE ecom.stores SET sections = $2, theme = $3 WHERE id = $1", [store.id, JSON.stringify(sections.data), theme.data]);
  await audit(staff, store.id, "Boutique publiée (éditeur)", store.slug, { sections: sections.data.length });
  refresh(store.slug);
  return { ok: true, message: "Modifications publiées." };
}

/* ───────────── Livraison (villes) ───────────── */

const CityIn = z.object({ id: z.uuid().or(z.literal("")), name: text(60).min(2), fee: z.coerce.number().int().min(0).max(100_000), etaMin: z.coerce.number().int().min(10).max(20_160), etaMax: z.coerce.number().int().min(10).max(20_160), active: z.boolean(), neighborhoods: z.string().max(6000) }).strict();

export async function saveCity(storeSlug: string, _: ActionResult | undefined, f: FormData): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "delivery.update");
  const d = CityIn.safeParse({ id: get(f, "id"), name: get(f, "name"), fee: get(f, "fee") || 0, etaMin: get(f, "etaMin"), etaMax: get(f, "etaMax"), active: f.get("active") === "on", neighborhoods: get(f, "neighborhoods") });
  if (!d.success) return fail("Ville, frais et délais (en minutes) obligatoires.");
  const v = d.data;
  if (v.etaMax < v.etaMin) return fail("Le délai maximum doit être après le minimum.");
  const quarters = lines(v.neighborhoods, 200);
  if (v.id) await q("UPDATE ecom.cities SET name = $3, fee = $4, eta_min = $5, eta_max = $6, active = $7, neighborhoods = $8 WHERE store_id = $1 AND id = $2", [store.id, v.id, v.name, v.fee, v.etaMin, v.etaMax, v.active, quarters]);
  else await q("INSERT INTO ecom.cities (store_id, name, fee, eta_min, eta_max, active, neighborhoods, position) VALUES ($1,$2,$3,$4,$5,$6,$7,(SELECT coalesce(max(position),0)+1 FROM ecom.cities WHERE store_id = $1))", [store.id, v.name, v.fee, v.etaMin, v.etaMax, v.active, quarters]);
  await audit(staff, store.id, v.id ? "Ville modifiée" : "Ville ajoutée", v.name, { fee: v.fee, etaMin: v.etaMin, etaMax: v.etaMax, active: v.active });
  refresh(store.slug);
  return { ok: true, message: "Ville enregistrée." };
}

/* ───────────── Produits ───────────── */

const VariantIn = z.object({ id: z.uuid().or(z.literal("")), title: text(60).min(1), sku: z.string().regex(/^[A-Z0-9-]{3,40}$/), price: z.coerce.number().int().min(0).max(100_000_000), compareAt: z.coerce.number().int().min(0).max(100_000_000).nullable() }).strict();
const ProductIn = z.object({
  name: text(120).min(2), slug: z.string().regex(slugRe), short: text(400), status: z.enum(["active", "draft", "archived"]), categoryPath: z.string().max(120), brand: text(60),
  seoTitle: text(70), seoDescription: text(170), variants: z.array(VariantIn).min(1).max(30),
  soldOutWhenEmpty: z.boolean(),
  /** Produit des achats (stock) auquel la fiche se rattache : ses SKU y sont reliés. Vide = aucun. */
  stockProduct: text(80),
  /** Images envoyées avant le premier enregistrement (création seulement). */
  images: z.array(z.lazy(() => ImageIn)).max(20),
}).strict();
const ImageIn = z.object({ src: z.url().refine((s) => s.startsWith(`${process.env.AWS_ENDPOINT_URL_S3}/`)), srcSet: z.string().max(2000), width: z.number().int().positive(), height: z.number().int().positive(), alt: text(160), kind: z.enum(["photo", "creative"]) }).strict();

export async function saveProduct(storeSlug: string, currentSlug: string, input: z.input<typeof ProductIn>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "catalog.update");
  const d = ProductIn.safeParse(input);
  if (!d.success) return fail(d.error.issues.some((i) => i.path.includes("sku")) ? "SKU : majuscules, chiffres et tirets (3 à 40)." : "Vérifiez les champs du produit.");
  const v = d.data;
  if (v.variants.some((x) => x.compareAt !== null && x.compareAt <= x.price)) return fail("Le prix barré doit être supérieur au prix.");
  if (!(await one("SELECT 1 FROM ecom.categories WHERE store_id = $1 AND path = $2", [store.id, v.categoryPath]))) return fail("Catégorie inconnue.");
  if (v.stockProduct && !(await one("SELECT 1 FROM ecom.lots WHERE store_id = $1 AND product = $2", [store.id, v.stockProduct]))) return fail("Produit en stock inconnu.");
  const res = await tx(async (t) => {
    const existing = currentSlug === "nouveau" ? null : await t.one<{ id: string }>("SELECT id FROM ecom.products WHERE store_id = $1 AND slug = $2 FOR UPDATE", [store.id, currentSlug]);
    if (currentSlug !== "nouveau" && !existing) return fail("Produit introuvable.");
    const clash = await t.one<{ id: string }>("SELECT id FROM ecom.products WHERE store_id = $1 AND slug = $2", [store.id, v.slug]);
    if (clash && clash.id !== existing?.id) return fail("Cette adresse est déjà utilisée par un autre produit.");
    const id = existing
      ? (await t.q("UPDATE ecom.products SET name=$3, slug=$4, short=$5, status=$6, category_path=$7, brand=$8, seo_title=$9, seo_description=$10, sold_out_when_empty=$11 WHERE store_id=$1 AND id=$2", [store.id, existing.id, v.name, v.slug, v.short, v.status, v.categoryPath, v.brand || null, v.seoTitle, v.seoDescription, v.soldOutWhenEmpty]), existing.id)
      : (await t.one<{ id: string }>("INSERT INTO ecom.products (store_id, name, slug, short, status, category_path, brand, seo_title, seo_description, sold_out_when_empty, position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,(SELECT coalesce(max(position),0)+1 FROM ecom.products WHERE store_id=$1)) RETURNING id",
          [store.id, v.name, v.slug, v.short, v.status, v.categoryPath, v.brand || null, v.seoTitle, v.seoDescription, v.soldOutWhenEmpty]))!.id;
    if (!existing) for (const [i, im] of v.images.entries()) {
      await t.q("INSERT INTO ecom.product_images (store_id, product_id, src, src_set, alt, width, height, kind, position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [store.id, id, im.src, im.srcSet, im.alt || v.name, im.width, im.height, im.kind, i + 1]);
    }
    const keep = v.variants.filter((x) => x.id).map((x) => x.id);
    await t.q("DELETE FROM ecom.variants WHERE store_id = $1 AND product_id = $2 AND NOT (id = ANY($3::uuid[]))", [store.id, id, keep]);
    for (const [i, x] of v.variants.entries()) {
      const dup = await t.one<{ id: string }>("SELECT id FROM ecom.variants WHERE store_id = $1 AND sku = $2", [store.id, x.sku]);
      if (dup && dup.id !== x.id) throw new Error(`SKU ${x.sku} déjà utilisé`);
      if (x.id) await t.q("UPDATE ecom.variants SET title=$4, sku=$5, price=$6, compare_at=$7, position=$8 WHERE store_id=$1 AND product_id=$2 AND id=$3", [store.id, id, x.id, x.title, x.sku, x.price, x.compareAt, i]);
      else await t.q("INSERT INTO ecom.variants (store_id, product_id, title, sku, price, compare_at, position) VALUES ($1,$2,$3,$4,$5,$6,$7)", [store.id, id, x.title, x.sku, x.price, x.compareAt, i]);
    }
    // Rattachement au stock : les SKU de la fiche quittent les autres achats et rejoignent ceux du produit choisi.
    const skus = v.variants.map((x) => x.sku);
    await t.q("UPDATE ecom.lots SET skus = array(SELECT unnest(skus) EXCEPT SELECT unnest($2::text[])) WHERE store_id = $1 AND skus && $2::text[] AND product <> $3", [store.id, skus, v.stockProduct]);
    if (v.stockProduct) await t.q("UPDATE ecom.lots SET skus = array(SELECT DISTINCT unnest(skus || $2::text[])) WHERE store_id = $1 AND product = $3", [store.id, skus, v.stockProduct]);
    return { ok: true, message: "Produit enregistré." } as ActionResult;
  }).catch((e: Error) => fail(e.message.startsWith("SKU") ? e.message : "Enregistrement impossible."));
  if (res.ok) {
    await audit(staff, store.id, currentSlug === "nouveau" ? "Produit créé" : "Produit modifié", v.slug, { status: v.status, prices: v.variants.map((x) => [x.sku, x.price]), stockProduct: v.stockProduct, soldOutWhenEmpty: v.soldOutWhenEmpty });
    refresh(store.slug);
    if (currentSlug !== v.slug) redirect(`/b/${store.slug}/produits/${v.slug}`);
  }
  return res;
}

/** Ajoute une image déjà envoyée (uploadImage) à la galerie d'un produit. */
export async function addProductImage(storeSlug: string, productSlug: string, img: { src: string; srcSet: string; width: number; height: number; alt: string; kind: "photo" | "creative" }): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "catalog.update");
  const d = z.object({ src: z.url().startsWith(`${process.env.AWS_ENDPOINT_URL_S3}/`), srcSet: z.string().max(2000), width: z.number().int().positive(), height: z.number().int().positive(), alt: text(160), kind: z.enum(["photo", "creative"]) }).strict().safeParse(img);
  if (!d.success) return fail("Image invalide.");
  const p = await one<{ id: string }>("SELECT id FROM ecom.products WHERE store_id = $1 AND slug = $2", [store.id, productSlug]);
  if (!p) return fail("Produit introuvable.");
  await q("INSERT INTO ecom.product_images (store_id, product_id, src, src_set, alt, width, height, kind, position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,(SELECT coalesce(max(position),0)+1 FROM ecom.product_images WHERE product_id=$2))",
    [store.id, p.id, d.data.src, d.data.srcSet, d.data.alt, d.data.width, d.data.height, d.data.kind]);
  await audit(staff, store.id, "Image produit ajoutée", productSlug);
  refresh(store.slug);
  return { ok: true, message: "Image ajoutée." };
}

export async function removeProductImage(storeSlug: string, productSlug: string, src: string): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "catalog.update");
  await q("DELETE FROM ecom.product_images i USING ecom.products p WHERE i.product_id = p.id AND p.store_id = $1 AND p.slug = $2 AND i.src = $3", [store.id, productSlug, String(src).slice(0, 500)]);
  await audit(staff, store.id, "Image produit retirée", productSlug);
  refresh(store.slug);
  return { ok: true };
}

/* ───────────── Articles et pages (Markdown, rendu assaini à l'affichage) ───────────── */

const PostIn = z.object({ title: text(160).min(3), slug: z.string().regex(slugRe), excerpt: text(300), category: text(60), body: z.string().max(60_000).min(10), status: z.enum(["draft", "published"]), product: z.string().max(80) }).strict();

export async function savePost(storeSlug: string, currentSlug: string, _: ActionResult | undefined, f: FormData): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "content.publish");
  const d = PostIn.safeParse({ title: get(f, "title"), slug: get(f, "slug"), excerpt: get(f, "excerpt"), category: get(f, "category"), body: get(f, "body"), status: get(f, "status") || "draft", product: get(f, "product") });
  if (!d.success) return fail("Titre, adresse (minuscules et tirets) et texte obligatoires.");
  const v = d.data;
  const clash = await one<{ slug: string }>("SELECT slug FROM ecom.posts WHERE store_id = $1 AND slug = $2", [store.id, v.slug]);
  if (clash && v.slug !== currentSlug) return fail("Cette adresse est déjà utilisée.");
  const minutes = Math.max(2, Math.round(v.body.split(/\s+/).length / 200));
  const products = v.product ? [v.product] : [];
  if (currentSlug === "nouveau") await q("INSERT INTO ecom.posts (store_id, slug, title, excerpt, category, body_md, product_slugs, minutes, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [store.id, v.slug, v.title, v.excerpt, v.category, v.body, products, minutes, v.status]);
  else await q("UPDATE ecom.posts SET slug=$3, title=$4, excerpt=$5, category=$6, body_md=$7, product_slugs=$8, minutes=$9, status=$10 WHERE store_id=$1 AND slug=$2", [store.id, currentSlug, v.slug, v.title, v.excerpt, v.category, v.body, products, minutes, v.status]);
  await audit(staff, store.id, currentSlug === "nouveau" ? "Article créé" : "Article modifié", v.slug, { status: v.status });
  refresh(store.slug);
  if (currentSlug !== v.slug) redirect(`/b/${store.slug}/articles/${v.slug}`);
  return { ok: true, message: v.status === "published" ? "Article publié." : "Brouillon enregistré." };
}

const PageIn = z.object({ title: text(120).min(2), body: z.string().max(60_000).min(5) }).strict();

export async function savePage(storeSlug: string, pageSlug: string, _: ActionResult | undefined, f: FormData): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "content.publish");
  const d = PageIn.safeParse({ title: get(f, "title"), body: get(f, "body") });
  if (!d.success) return fail("Titre et texte obligatoires.");
  const r = await q("UPDATE ecom.pages SET title = $3, body_md = $4 WHERE store_id = $1 AND slug = $2 RETURNING slug", [store.id, pageSlug, d.data.title, d.data.body]);
  if (!r.length) return fail("Page introuvable.");
  await audit(staff, store.id, "Page modifiée", pageSlug);
  refresh(store.slug);
  return { ok: true, message: "Page publiée." };
}

/* ───────────── Nouvelle boutique ───────────── */

const PRESETS: Record<string, { ink: string; bg: string; accent: string; accentDeep: string; accentSoft: string; night: string; onNight: string }> = {
  or: { ink: "#121211", bg: "#ffffff", accent: "#d6ad45", accentDeep: "#8a6a1f", accentSoft: "#f1d27c", night: "#0c0c0c", onNight: "#f5f3ee" },
  bleu: { ink: "#0f172a", bg: "#ffffff", accent: "#3b5bdb", accentDeep: "#1e3a8a", accentSoft: "#a5b4fc", night: "#0b1020", onNight: "#eef2ff" },
  vert: { ink: "#10201a", bg: "#ffffff", accent: "#2f9e6a", accentDeep: "#166534", accentSoft: "#9be7c1", night: "#0b1712", onNight: "#ecfdf5" },
};
const NewStore = z.object({ name: text(60).min(2), slug: z.string().regex(/^[a-z0-9-]{2,40}$/).refine((s) => !["app", "www", "admin", "api"].includes(s)), theme: z.enum(["or", "bleu", "vert"]) }).strict();

export async function createStore(_: ActionResult | undefined, f: FormData): Promise<ActionResult> {
  const staff = await requirePermission("stores.create");
  const d = NewStore.safeParse({ name: get(f, "name"), slug: get(f, "slug").toLowerCase(), theme: get(f, "theme") || "or" });
  if (!d.success) return fail("Nom et sous-domaine (minuscules, chiffres, tirets) obligatoires.");
  if (await one("SELECT 1 FROM ecom.stores WHERE slug = $1", [d.data.slug])) return fail("Ce sous-domaine est déjà pris.");
  const sections = [
    { id: "s1", type: "hero", enabled: true, eyebrow: "", title: d.data.name, text: "", ctaLabel: "Voir la boutique", ctaHref: "/shop", secondaryLabel: "", secondaryHref: "", productSlug: "" },
    { id: "s2", type: "products", enabled: true, title: "Nos produits", tabs: false, limit: 8 },
  ];
  const s = await one<{ id: string }>("INSERT INTO ecom.stores (slug, name, status, logo, favicon, theme, sections, settings) VALUES ($1,$2,'draft','/nerix-64.png','/nerix-64.png',$3,$4,$5) RETURNING id",
    [d.data.slug, d.data.name, { colors: PRESETS[d.data.theme], headingFont: "serif" }, JSON.stringify(sections), { eurRate: 656, taxRate: 0.25, lowStock: 5, lists: {} }]);
  await q("INSERT INTO ecom.categories (store_id, slug, path, name) VALUES ($1,'general','general','Général')", [s!.id]);
  await audit(staff, s!.id, "Boutique créée", d.data.slug);
  redirect(`/b/${d.data.slug}/parametres`);
}

/* ───────────── Catégories ───────────── */

const CategoryIn = z.object({ name: text(80).min(2), slug: z.string().regex(slugRe), parent: z.string().max(200), description: text(1000) }).strict();

/** Créer ou modifier une catégorie (3 niveaux au plus). Un changement d'adresse ou de parent suit sur les sous-catégories et les produits. */
export async function saveCategory(storeSlug: string, currentPath: string, _prev: unknown, f: FormData): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "catalog.update");
  const d = CategoryIn.safeParse({ name: get(f, "name"), slug: get(f, "slug").toLowerCase(), parent: get(f, "parent"), description: get(f, "description") });
  if (!d.success) return fail("Nom (2 caractères au moins) et adresse (minuscules, chiffres, tirets) obligatoires.");
  const v = d.data;
  const parent = v.parent || null;
  const path = parent ? `${parent}/${v.slug}` : v.slug;
  if (path.split("/").length > 3) return fail("3 niveaux de catégories au plus.");
  if (currentPath && (parent === currentPath || parent?.startsWith(`${currentPath}/`))) return fail("Une catégorie ne peut pas être rangée dans elle-même.");
  const res = await tx(async (t) => {
    if (parent && !(await t.one("SELECT 1 FROM ecom.categories WHERE store_id = $1 AND path = $2", [store.id, parent]))) return fail("Catégorie parente inconnue.");
    if (path !== currentPath && (await t.one("SELECT 1 FROM ecom.categories WHERE store_id = $1 AND path = $2", [store.id, path]))) return fail("Cette adresse existe déjà.");
    if (!currentPath) {
      await t.q("INSERT INTO ecom.categories (store_id, slug, path, parent_path, name, description, position) VALUES ($1,$2,$3,$4,$5,$6,(SELECT coalesce(max(position),0)+1 FROM ecom.categories WHERE store_id=$1))",
        [store.id, v.slug, path, parent, v.name, v.description]);
      return { ok: true, message: "Catégorie créée." } as ActionResult;
    }
    const row = await t.one("UPDATE ecom.categories SET slug=$3, path=$4, parent_path=$5, name=$6, description=$7 WHERE store_id=$1 AND path=$2 RETURNING id", [store.id, currentPath, v.slug, path, parent, v.name, v.description]);
    if (!row) return fail("Catégorie introuvable.");
    if (path !== currentPath) {
      // Sous-catégories et produits suivent la nouvelle adresse (préfixe remplacé).
      await t.q("UPDATE ecom.categories SET path = $3 || substr(path, length($2) + 1), parent_path = $3 || substr(parent_path, length($2) + 1) WHERE store_id = $1 AND path LIKE $2 || '/%'", [store.id, currentPath, path]);
      await t.q("UPDATE ecom.products SET category_path = $3 || substr(category_path, length($2) + 1) WHERE store_id = $1 AND (category_path = $2 OR category_path LIKE $2 || '/%')", [store.id, currentPath, path]);
    }
    return { ok: true, message: "Catégorie enregistrée." } as ActionResult;
  });
  if (!res.ok) return res;
  await audit(staff, store.id, currentPath ? "Catégorie modifiée" : "Catégorie créée", path, currentPath && currentPath !== path ? { from: currentPath } : {});
  refresh(store.slug);
  if (path !== currentPath) redirect(`/b/${store.slug}/categories?c=${encodeURIComponent(path)}`);
  return res;
}

/** Monter ou descendre une catégorie parmi ses sœurs. */
export async function moveCategory(storeSlug: string, path: string, dir: "up" | "down"): Promise<void> {
  const { store } = await ctx(storeSlug, "catalog.update");
  await tx(async (t) => {
    const me = await t.one<{ id: string; position: number; parent_path: string | null }>("SELECT id, position, parent_path FROM ecom.categories WHERE store_id = $1 AND path = $2 FOR UPDATE", [store.id, String(path).slice(0, 200)]);
    if (!me) return;
    const other = await t.one<{ id: string; position: number }>(
      `SELECT id, position FROM ecom.categories WHERE store_id = $1 AND parent_path IS NOT DISTINCT FROM $2 AND position ${dir === "up" ? "<" : ">"} $3 ORDER BY position ${dir === "up" ? "DESC" : "ASC"} LIMIT 1 FOR UPDATE`,
      [store.id, me.parent_path, me.position]);
    if (!other) return;
    await t.q("UPDATE ecom.categories SET position = CASE id WHEN $2 THEN $3 ELSE $4 END WHERE store_id = $1 AND id IN ($2, $5)", [store.id, me.id, other.position, me.position, other.id]);
  });
  refresh(store.slug);
}

/** Supprimer une catégorie vide (sans produit ni sous-catégorie). */
export async function deleteCategory(storeSlug: string, path: string): Promise<void> {
  const { staff, store } = await ctx(storeSlug, "catalog.update");
  const p = String(path).slice(0, 200);
  const row = await one(`DELETE FROM ecom.categories c WHERE c.store_id = $1 AND c.path = $2
      AND NOT EXISTS (SELECT 1 FROM ecom.categories x WHERE x.store_id = $1 AND x.parent_path = $2)
      AND NOT EXISTS (SELECT 1 FROM ecom.products p WHERE p.store_id = $1 AND p.status <> 'archived' AND (p.category_path = $2 OR p.category_path LIKE $2 || '/%')) RETURNING id`, [store.id, p]);
  if (row) await audit(staff, store.id, "Catégorie supprimée", p);
  refresh(store.slug);
  redirect(`/b/${store.slug}/categories`);
}

/* ───────────── Page produit : modèle de la boutique et contenu de chaque produit ───────────── */

const PageKey = z.enum(["assure", "benefits", "blocks", "howto", "reviews", "faq", "related"]);
const ProductPageIn = z.object({
  sections: z.array(z.object({ key: PageKey, enabled: z.boolean() }).strict()).length(7).refine((a) => new Set(a.map((s) => s.key)).size === 7),
  addToCart: z.boolean(), buyNow: z.boolean(),
  assure: z.array(z.object({ icon: z.enum(["cash", "truck", "phone", "refresh", "shield", "gift", "star", "clock"]), text: text(80).min(1) }).strict()).max(6),
}).strict().refine((p) => p.addToCart || p.buyNow, "Gardez au moins un bouton d'achat.");

/** Modèle commun à toutes les pages produit de la boutique. */
export async function saveProductPage(storeSlug: string, input: z.input<typeof ProductPageIn>): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "settings.update");
  const d = ProductPageIn.safeParse(input);
  if (!d.success) return fail(d.error.issues[0]?.message.startsWith("Gardez") ? "Gardez au moins un bouton d'achat (panier ou achat direct)." : "Vérifiez les sections et les garanties (texte obligatoire).");
  await q("UPDATE ecom.stores SET settings = settings || jsonb_build_object('productPage', $2::jsonb) WHERE id = $1", [store.id, JSON.stringify(d.data)]);
  await audit(staff, store.id, "Modèle de page produit modifié", store.slug);
  refresh(store.slug);
  return { ok: true, message: "Page produit enregistrée." };
}

const line = text(300).min(1);
const Block = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["benefits", "safety"]), items: z.array(line).min(1).max(12), hidden: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("text"), title: text(120), body: text(4000).min(1), hidden: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("imageText"), title: text(120), body: text(2000), image: z.string().max(500), reverse: z.boolean(), hidden: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("faq"), items: z.array(z.object({ q: text(200).min(1), a: text(1500).min(1) }).strict()).min(1).max(20), hidden: z.boolean().optional() }).strict(),
]);

/** Contenu de la page d'un produit : avantages, textes, image + texte, FAQ. Une image doit appartenir au produit. */
export async function saveProductBody(storeSlug: string, productSlug: string, blocks: z.input<typeof Block>[]): Promise<ActionResult> {
  const { staff, store } = await ctx(storeSlug, "catalog.update");
  const d = z.array(Block).max(20).safeParse(blocks);
  if (!d.success) return fail("Chaque bloc doit avoir un contenu (une ligne vide n'est pas acceptée).");
  const p = await one<{ id: string }>("SELECT id FROM ecom.products WHERE store_id = $1 AND slug = $2", [store.id, String(productSlug).slice(0, 80)]);
  if (!p) return fail("Produit introuvable.");
  const images = new Set((await q<{ src: string }>("SELECT src FROM ecom.product_images WHERE product_id = $1", [p.id])).map((r) => r.src));
  if (d.data.some((b) => b.type === "imageText" && b.image && !images.has(b.image))) return fail("Choisissez une image de ce produit.");
  await q("UPDATE ecom.products SET body = $2::jsonb WHERE id = $1", [p.id, JSON.stringify(d.data)]);
  await audit(staff, store.id, "Contenu produit modifié", productSlug);
  refresh(store.slug);
  return { ok: true, message: "Contenu de la page enregistré." };
}

import "server-only";
// Lecture des données d'une boutique (schéma ecom). Chaque requête filtre par store_id ; mises en cache par requête HTTP (React cache).
import { cache } from "react";
import { one, q } from "@/lib/db";
import type { Books, Lot } from "@/lib/finance";
import type { Category, City, ContactMessage, Order, Page, Post, Product, ProductBlock, ProductPage, Review, Section, Store, StoreTheme } from "@/lib/types";
import { renderMarkdown } from "./content";
import { availability } from "./stock";

export type Lists = { chargeCategories: string[]; paymentMethods: string[]; couriers: string[]; adPlatforms: string[]; cancelReasons: string[]; lossReasons: string[] };
export type WaTemplates = { confirm: string; ship: string; delivered: string; cart: string };
export type StoreSettings = { eurRate: number; taxRate: number; lowStock: number; withdrawRate: number; stateTax: number; cartDelay: number; wa: WaTemplates; productPage: ProductPage; lists: Lists };
export type StoreFull = Store & { settings: StoreSettings };

type StoreRow = { id: string; slug: string; name: string; tagline: string; status: Store["status"]; logo: string; favicon: string; hero_image: string | null; theme: StoreTheme; sections: Section[]; contact: Partial<Store["contact"]>; social: Partial<Store["social"]>; tracking: Partial<Store["tracking"]>; settings: Partial<StoreSettings>; currency: "XAF"; created_at: Date };

const DEFAULT_LISTS: Lists = {
  chargeCategories: ["Publicité", "Loyer", "Internet", "Électricité", "Salaires", "Transport", "Fournitures", "Autre"],
  paymentMethods: ["Espèces", "Mobile Money", "Virement", "Autre"],
  couriers: [],
  adPlatforms: ["Meta Ads", "TikTok Ads", "Google Ads", "Autre"],
  cancelReasons: ["Client indisponible", "Refus du produit", "Mauvaise adresse", "Numéro incorrect", "Prix contesté", "Autre"],
  lossReasons: ["Casse", "Produit défectueux", "Vol", "Offert", "Autre"],
};

/** Messages WhatsApp en un clic. Variables : {prenom} {nom} {numero} {total} {ville} {boutique} {articles} {suivi}. */
export const DEFAULT_WA: WaTemplates = {
  confirm: "Bonjour {prenom}, ici {boutique}. Nous confirmons votre commande {numero} : {articles}, total {total}, livraison à {ville}. Pouvez-vous nous confirmer votre disponibilité ?",
  ship: "Bonjour {prenom}, votre commande {numero} est en route. Le livreur vous appellera avant d'arriver. Merci de garder {total} prêts si vous payez à la livraison.",
  delivered: "Bonjour {prenom}, votre commande {numero} a bien été livrée. Merci pour votre confiance ! — {boutique}",
  cart: "Bonjour {prenom}, ici {boutique}. Vous avez commencé une commande ({articles}, {total}) sans la valider. Souhaitez-vous que nous la finalisions ensemble ?",
};

/** {delai} dans une garantie = délai de livraison le plus court des villes desservies. */
export const DEFAULT_PRODUCT_PAGE: ProductPage = {
  sections: (["assure", "benefits", "blocks", "howto", "reviews", "faq", "related"] as const).map((key) => ({ key, enabled: true })),
  addToCart: true, buyNow: true,
  assure: [{ icon: "cash", text: "Paiement à la livraison" }, { icon: "truck", text: "Livré en {delai}" }, { icon: "phone", text: "Appel de confirmation" }, { icon: "refresh", text: "Échange sous 7 jours" }],
};
/** Modèle enregistré complété : une section ajoutée plus tard apparaît à la fin, activée. */
function withDefaults(p?: Partial<ProductPage>): ProductPage {
  const saved = (p?.sections ?? []).filter((s) => DEFAULT_PRODUCT_PAGE.sections.some((d) => d.key === s.key));
  return { ...DEFAULT_PRODUCT_PAGE, ...p, sections: [...saved, ...DEFAULT_PRODUCT_PAGE.sections.filter((d) => !saved.some((s) => s.key === d.key))] };
}

const toStore = (r: StoreRow): StoreFull => ({
  id: r.id, slug: r.slug, name: r.name, tagline: r.tagline, status: r.status, logo: r.logo, favicon: r.favicon, heroImage: r.hero_image,
  theme: r.theme, sections: r.sections, contact: { phone: "", whatsapp: "", email: "", hours: "", ...r.contact }, social: { facebook: "", instagram: "", tiktok: "", ...r.social },
  tracking: { metaPixelIds: [], tiktokPixelId: "", ga4Id: "", googleAdsId: "", gtmId: "", ...r.tracking }, currency: r.currency, createdAt: r.created_at.toISOString(),
  settings: {
    eurRate: Number(r.settings.eurRate ?? 656), taxRate: Number(r.settings.taxRate ?? 0.25), lowStock: Number(r.settings.lowStock ?? 5),
    withdrawRate: Number(r.settings.withdrawRate ?? 0.01), stateTax: Number(r.settings.stateTax ?? 54), cartDelay: Number(r.settings.cartDelay ?? 30),
    wa: { ...DEFAULT_WA, ...r.settings.wa }, productPage: withDefaults(r.settings.productPage), lists: { ...DEFAULT_LISTS, ...r.settings.lists },
  },
});

export const listStores = cache(async () => (await q<StoreRow>("SELECT * FROM ecom.stores WHERE status <> 'archived' ORDER BY created_at")).map(toStore));
export const getStore = cache(async (slug: string) => {
  const r = await q<StoreRow>("SELECT * FROM ecom.stores WHERE slug = $1", [slug]);
  return r[0] ? toStore(r[0]) : null;
});

const iso = (d: Date | string | null) => (d === null ? undefined : typeof d === "string" ? d : d.toISOString());
const day = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10));

/** Commandes avec leurs lignes (l'historique se lit à part, seulement là où il s'affiche). */
export const getOrders = cache(async (storeId: string): Promise<Order[]> => {
  const [orders, lines] = await Promise.all([
    q<Record<string, never>>("SELECT * FROM ecom.orders WHERE store_id = $1 ORDER BY placed_at DESC, number DESC", [storeId]),
    q<{ order_id: string; sku: string; name: string; variant: string; unit_price: number; quantity: number }>("SELECT order_id, sku, name, variant, unit_price, quantity FROM ecom.order_lines WHERE store_id = $1 ORDER BY position", [storeId]),
  ]);
  const byOrder = <T extends { order_id: string }>(rows: T[]) => rows.reduce((m, r) => m.set(r.order_id, [...(m.get(r.order_id) ?? []), r]), new Map<string, T[]>());
  const L = byOrder(lines);
  return orders.map((o: Record<string, any>): Order => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: o.id, number: o.number, storeSlug: "", placedAt: iso(o.placed_at)!, status: o.status, paymentStatus: o.payment_status, fulfillmentStatus: o.fulfillment_status,
    paymentMethod: o.payment_method, customer: { firstName: "", lastName: "", phone: "", ...o.customer }, city: o.city, neighborhood: o.neighborhood, landmark: o.landmark,
    lines: (L.get(o.id) ?? []).map((l) => ({ sku: l.sku, name: l.name, variant: l.variant, unitPrice: l.unit_price, quantity: l.quantity })),
    subtotal: o.subtotal, shipping: o.shipping, total: o.total, discount: o.discount || undefined, paymentFee: o.payment_fee || undefined,
    courier: o.courier ?? undefined, courierFee: o.courier_fee ?? undefined, deliveredAt: iso(o.delivered_at), settled: o.settled, source: o.source ?? undefined,
    cancelReason: o.cancel_reason ?? undefined, note: o.note || undefined, archived: o.archived || undefined,
    events: [],
  }));
});

/** Historique d'une commande, ou des dernières commandes de la boutique (journal). */
export const getOrderEvents = cache(async (storeId: string, orderId?: string) =>
  (await q<{ number: string; at: Date; label: string; actor: string }>(
    `SELECT o.number, e.at, e.label, e.actor FROM ecom.order_events e JOIN ecom.orders o ON o.id = e.order_id
     WHERE e.store_id = $1 AND ($2::uuid IS NULL OR e.order_id = $2) ORDER BY e.at DESC, e.id DESC LIMIT 300`, [storeId, orderId ?? null]))
    .map((e) => ({ number: e.number, at: e.at.toISOString(), label: e.label, actor: e.actor })));

/** Registres de gestion : lots, campagnes, charges, pertes + réglages de calcul. */
export const getBooks = cache(async (store: StoreFull): Promise<Books> => {
  const [lots, campaigns, charges, losses] = await Promise.all([
    q<Record<string, any>>("SELECT * FROM ecom.lots WHERE store_id = $1 ORDER BY purchased_on", [store.id]), // eslint-disable-line @typescript-eslint/no-explicit-any
    q<Record<string, any>>("SELECT * FROM ecom.campaigns WHERE store_id = $1 ORDER BY start_on", [store.id]), // eslint-disable-line @typescript-eslint/no-explicit-any
    q<Record<string, any>>("SELECT * FROM ecom.charges WHERE store_id = $1 ORDER BY spent_on", [store.id]), // eslint-disable-line @typescript-eslint/no-explicit-any
    q<Record<string, any>>("SELECT * FROM ecom.losses WHERE store_id = $1 ORDER BY lost_on", [store.id]), // eslint-disable-line @typescript-eslint/no-explicit-any
  ]);
  return {
    taxRate: store.settings.taxRate, eurRate: store.settings.eurRate, lowStock: store.settings.lowStock, withdrawRate: store.settings.withdrawRate, stateTax: store.settings.stateTax,
    lots: lots.map((l): Lot => ({ id: l.id, product: l.product, skus: l.skus, date: day(l.purchased_on), quantity: l.quantity, unitPrice: Number(l.unit_price), supplier: l.supplier,
      fees: { transport: 0, customs: 0, shipping: 0, packaging: 0, bank: 0, other: 0, ...Object.fromEntries(Object.entries(l.fees).map(([k, v]) => [k, Number(v)])) } })),
    campaigns: campaigns.map((c) => ({ id: c.id, code: c.code, platform: c.platform, name: c.name, products: c.products, start: day(c.start_on), end: c.end_on ? day(c.end_on) : null,
      spend: Number(c.spend), currency: c.currency, rate: Number(c.rate), orders: c.orders, deliveredOrders: c.delivered, revenue: c.revenue })),
    charges: charges.map((c) => ({ id: c.id, date: day(c.spent_on), category: c.category, description: c.description, amount: Number(c.amount), paymentMethod: c.payment_method, includedInProductCost: c.included_in_cost, monthly: c.monthly })),
    losses: losses.map((l) => ({ id: l.id, date: day(l.lost_on), product: l.product, quantity: l.quantity, reason: l.reason, note: l.note })),
  };
});

/** Stock disponible par SKU (voir server/stock.ts). */
export const getAvailability = cache(async (storeId: string) => availability(q as never, storeId));

export const getCatalog = cache(async (storeId: string) => {
  const [cats, products, images, variants, stock] = await Promise.all([
    q<{ id: string; slug: string; path: string; parent_path: string | null; name: string; description: string }>("SELECT id, slug, path, parent_path, name, description FROM ecom.categories WHERE store_id = $1 ORDER BY position", [storeId]),
    q<Record<string, any>>("SELECT * FROM ecom.products WHERE store_id = $1 AND status <> 'archived' ORDER BY position, created_at", [storeId]), // eslint-disable-line @typescript-eslint/no-explicit-any
    q<{ product_id: string; src: string; src_set: string; alt: string; width: number; height: number; kind: "photo" | "creative" }>("SELECT product_id, src, src_set, alt, width, height, kind FROM ecom.product_images WHERE store_id = $1 ORDER BY position", [storeId]),
    q<{ id: string; product_id: string; sku: string; title: string; price: number; compare_at: number | null }>("SELECT id, product_id, sku, title, price, compare_at FROM ecom.variants WHERE store_id = $1 ORDER BY position", [storeId]),
    getAvailability(storeId),
  ]);
  const categories: Category[] = cats.map((c) => ({ id: c.id, slug: c.slug, path: c.path, name: c.name, description: c.description, parentPath: c.parent_path }));
  const list: Product[] = products.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, status: p.status, categoryPath: p.category_path, brand: p.brand, short: p.short, tag: p.tag,
    images: images.filter((i) => i.product_id === p.id).map((i) => ({ src: i.src, srcSet: i.src_set, alt: i.alt, width: i.width, height: i.height, kind: i.kind })),
    variants: variants.filter((v) => v.product_id === p.id).map((v) => ({ id: v.id, sku: v.sku, title: v.title, price: v.price, compareAt: v.compare_at, available: stock.get(v.sku) ?? 0 })),
    specs: p.specs, body: p.body as ProductBlock[], seoTitle: p.seo_title, seoDescription: p.seo_description,
  }));
  return { categories, products: list };
});

export const getCities = cache(async (storeId: string, all = false): Promise<(City & { active: boolean })[]> =>
  (await q<{ id: string; name: string; fee: number; eta_min: number; eta_max: number; neighborhoods: string[]; active: boolean }>(
    `SELECT id, name, fee, eta_min, eta_max, neighborhoods, active FROM ecom.cities WHERE store_id = $1 ${all ? "" : "AND active"} ORDER BY position`, [storeId]))
    .map((c) => ({ id: c.id, name: c.name, fee: c.fee, etaMin: c.eta_min, etaMax: c.eta_max, neighborhoods: c.neighborhoods, active: c.active })));

export const getMessages = cache(async (store: Store): Promise<ContactMessage[]> =>
  (await q<{ id: string; name: string; phone: string; message: string; handled: boolean; created_at: Date }>("SELECT id, name, phone, message, handled, created_at FROM ecom.messages WHERE store_id = $1 ORDER BY created_at DESC LIMIT 500", [store.id]))
    .map((m) => ({ id: m.id, storeSlug: store.slug, name: m.name, phone: m.phone, message: m.message, handled: m.handled, createdAt: m.created_at.toISOString() })));

export type AbandonedCart = { id: string; name: string; phone: string; city: string; lines: { name: string; variant: string; quantity: number; unitPrice: number }[]; total: number; status: "open" | "ordered" | "contacted"; orderNumber: string | null; updatedAt: string };

/** Paniers saisis dans le formulaire de commande : à relancer (open), relancés (contacted) ou récupérés (ordered). */
export const getCarts = cache(async (store: Store): Promise<AbandonedCart[]> =>
  (await q<{ id: string; customer: { firstName?: string; lastName?: string; phone?: string }; city: string; lines: AbandonedCart["lines"]; total: number; status: AbandonedCart["status"]; order_number: string | null; updated_at: Date }>(
    "SELECT id, customer, city, lines, total, status, order_number, updated_at FROM ecom.carts WHERE store_id = $1 AND updated_at > now() - interval '60 days' ORDER BY updated_at DESC LIMIT 500", [store.id]))
    .map((c) => ({ id: c.id, name: `${c.customer.firstName ?? ""} ${c.customer.lastName ?? ""}`.trim() || "Client", phone: c.customer.phone ?? "", city: c.city, lines: c.lines, total: c.total,
      status: c.status, orderNumber: c.order_number, updatedAt: new Date(c.updated_at).toISOString() })));

export const getReviews = cache(async (store: Store): Promise<Review[]> =>
  (await q<Record<string, any>>("SELECT * FROM ecom.reviews WHERE store_id = $1 ORDER BY created_at DESC", [store.id])) // eslint-disable-line @typescript-eslint/no-explicit-any
    .map((r) => ({ id: r.id, storeSlug: store.slug, productSlug: r.product_slug, name: r.name, city: r.city, rating: r.rating, text: r.text, photo: r.photo, source: r.source, consent: r.consent, published: r.published, createdAt: r.created_at.toISOString() })));

type PostRow = { slug: string; title: string; excerpt: string; category: string; body_md: string; sources: Post["sources"]; product_slugs: string[]; minutes: number; published_at: Date; status: string };
const toPost = (p: PostRow): Post => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category, publishedAt: p.published_at.toISOString(), minutes: p.minutes, bodyHtml: renderMarkdown(p.body_md), sources: p.sources, productSlugs: p.product_slugs });
export const getPosts = cache(async (storeId: string, all = false) =>
  (await q<PostRow>(`SELECT * FROM ecom.posts WHERE store_id = $1 ${all ? "" : "AND status = 'published' AND published_at <= now()"} ORDER BY published_at DESC`, [storeId])).map(toPost));
export const getPostBySlug = cache(async (storeId: string, slug: string) => {
  const r = await q<PostRow>("SELECT * FROM ecom.posts WHERE store_id = $1 AND slug = $2", [storeId, slug]);
  return r[0] ? { ...toPost(r[0]), bodyMd: r[0].body_md, status: r[0].status } : null;
});
export const getPages = cache(async (storeId: string): Promise<(Page & { bodyMd: string })[]> =>
  (await q<{ slug: string; title: string; body_md: string }>("SELECT slug, title, body_md FROM ecom.pages WHERE store_id = $1 ORDER BY title", [storeId])).map((p) => ({ slug: p.slug, title: p.title, bodyHtml: renderMarkdown(p.body_md), bodyMd: p.body_md })));
export const getPageBySlug = async (storeId: string, slug: string) => (await getPages(storeId)).find((p) => p.slug === slug) ?? null;

/** Journal d'audit (actions de l'équipe). */
export const getAudit = cache(async (storeId: string) =>
  q<{ at: Date; actor_name: string; action: string; target: string }>("SELECT at, actor_name, action, target FROM ecom.audit_log WHERE store_id = $1 ORDER BY at DESC LIMIT 300", [storeId]));

/** Compteurs du menu : commandes à confirmer et messages non traités, par boutique. */
export const getMenuCounts = cache(async () => {
  const rows = await q<{ slug: string; pending: string; unread: string }>(`SELECT s.slug,
      (SELECT count(*) FROM ecom.orders o WHERE o.store_id = s.id AND o.status = 'pending' AND NOT o.archived) pending,
      (SELECT count(*) FROM ecom.messages m WHERE m.store_id = s.id AND NOT m.handled) unread
    FROM ecom.stores s`);
  return { pending: Object.fromEntries(rows.map((r) => [r.slug, Number(r.pending)])), unread: Object.fromEntries(rows.map((r) => [r.slug, Number(r.unread)])) };
});

/** Vue plateforme : toutes les boutiques, commandes et registres réunis. */
export const getPlatform = cache(async () => {
  const stores = await listStores();
  const per = await Promise.all(stores.map(async (s) => ({ store: s, orders: (await getOrders(s.id)).filter((o) => !o.archived).map((o) => ({ ...o, storeSlug: s.slug })), books: await getBooks(s), products: (await getCatalog(s.id)).products.length })));
  const books: Books = {
    taxRate: stores[0]?.settings.taxRate ?? 0.25, eurRate: stores[0]?.settings.eurRate ?? 656, lowStock: stores[0]?.settings.lowStock ?? 5,
    withdrawRate: stores[0]?.settings.withdrawRate ?? 0.01, stateTax: stores[0]?.settings.stateTax ?? 54,
    lots: per.flatMap((p) => p.books.lots), campaigns: per.flatMap((p) => p.books.campaigns), charges: per.flatMap((p) => p.books.charges), losses: per.flatMap((p) => p.books.losses),
  };
  return { stores: per, orders: per.flatMap((p) => p.orders).sort((a, b) => b.placedAt.localeCompare(a.placedAt)), books };
});

export const listStaff = cache(async () =>
  q<{ id: string; name: string; email: string; role: string; active: boolean; last_seen: Date | null }>("SELECT id, name, email, role, active, last_seen FROM ecom.staff ORDER BY created_at"));

/** Quantités livrées par SKU (tri « meilleures ventes »), sans charger les commandes. */
export const getSoldBySku = cache(async (storeId: string) =>
  new Map((await q<{ sku: string; qty: string }>(`SELECT l.sku, sum(l.quantity) qty FROM ecom.order_lines l JOIN ecom.orders o ON o.id = l.order_id
     WHERE l.store_id = $1 AND o.status = 'completed' GROUP BY l.sku`, [storeId])).map((r) => [r.sku, Number(r.qty)])));

/** Suivi public : numéro ET téléphone exigés (jamais de lecture par simple identifiant). Ne renvoie que l'utile au client. */
export async function findOrderForTracking(storeId: string, number: string, phone: string) {
  const r = await q<{ number: string; placed_at: Date; status: Order["status"]; city: string; total: number; payment_status: Order["paymentStatus"] }>(
    "SELECT number, placed_at, status, city, total, payment_status FROM ecom.orders WHERE store_id = $1 AND number = $2 AND customer ->> 'phone' = $3", [storeId, number, phone]);
  return r[0] ?? null;
}

const dayStart = "($2::date)::timestamp AT TIME ZONE 'Africa/Douala'";
const dayEnd = "($3::date)::timestamp AT TIME ZONE 'Africa/Douala'";

/** Trafic d'une boutique sur [from, to[ (dates de Douala) : visiteurs uniques, pages vues, visiteurs des 5 dernières minutes. */
export const getTraffic = cache(async (storeId: string, from: string, to: string) => {
  const [range, live] = await Promise.all([
    q<{ visitors: string; views: string; first: Date | null }>(`SELECT count(DISTINCT visitor) visitors, count(*) views, min(at) first FROM ecom.visits WHERE store_id = $1 AND at >= ${dayStart} AND at < ${dayEnd}`, [storeId, from, to]),
    q<{ live: string }>("SELECT count(DISTINCT visitor) live FROM ecom.visits WHERE store_id = $1 AND at > now() - interval '5 minutes'", [storeId]),
  ]);
  // since : première visite comptée sur la période (le taux de conversion ne compte que les commandes à partir de là).
  return { visitors: Number(range[0]?.visitors ?? 0), views: Number(range[0]?.views ?? 0), live: Number(live[0]?.live ?? 0), since: range[0]?.first ? new Date(range[0].first).toISOString() : null };
});

/** Visiteurs uniques d'une campagne : ceux arrivés par son lien suivi, sinon tous ceux de sa période. */
export async function campaignVisitors(storeId: string, c: { code: string; start: string; end: string | null }, today: string): Promise<{ visitors: number; byCode: boolean }> {
  const end = new Date(Date.parse(`${c.end ?? today}T00:00:00Z`) + 86400_000).toISOString().slice(0, 10);
  const r = await one<{ code: string; period: string }>(
    `SELECT count(DISTINCT visitor) FILTER (WHERE $4 <> '' AND campaign = $4) code, count(DISTINCT visitor) period FROM ecom.visits WHERE store_id = $1 AND at >= ${dayStart} AND at < ${dayEnd}`,
    [storeId, c.start, end, c.code]);
  const code = Number(r?.code ?? 0);
  return code ? { visitors: code, byCode: true } : { visitors: Number(r?.period ?? 0), byCode: false };
}

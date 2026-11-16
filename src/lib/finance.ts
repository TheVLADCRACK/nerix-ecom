// Gestion de la boutique (reprise du classeur ERP) : coût de revient, publicité, charges, pertes, compte de résultat.
// Logique pure, sans base : la même fonction sert au tableau de bord, à la comptabilité et aux tests.
import type { Order } from "./types";

export type Lot = { id: string; product: string; skus: string[]; date: string; quantity: number; unitPrice: number; fees: { transport: number; customs: number; shipping: number; packaging: number; bank: number; other: number }; supplier: string };
/** spend = budget total (initial + ajouts) ; budgetAdds = ajouts datés, dans la devise de la campagne. */
export type Campaign = { id: string; code: string; platform: string; name: string; products: string; start: string; end: string | null; spend: number; currency: "XAF" | "EUR"; rate: number; orders: number; deliveredOrders: number; revenue: number; budgetAdds?: { date: string; amount: number }[] };
export type Charge = { id: string; date: string; category: string; description: string; amount: number; paymentMethod: string; includedInProductCost: boolean; monthly?: boolean };
export type Loss = { id: string; date: string; product: string; quantity: number; reason: string; note: string };
/** withdrawRate : frais de retrait Mobile Money sur l'argent encaissé ; stateTax : taxe de l'État (FCFA) par commande payée. */
export type Books = { lots: Lot[]; campaigns: Campaign[]; charges: Charge[]; losses: Loss[]; taxRate: number; eurRate: number; lowStock: number; withdrawRate: number; stateTax: number };

export const FEE_LABELS: [keyof Lot["fees"], string][] = [["transport", "Transport"], ["customs", "Douane"], ["shipping", "Expédition"], ["packaging", "Emballage"], ["bank", "Frais bancaires"], ["other", "Autres"]];

/** Frais bancaires du classeur : 1,79 % du montant acheté + 350 FCFA. */
export const bankFee = (purchase: number) => Math.round((purchase * 0.0179 + 350) * 100) / 100;
export const lotFees = (l: Lot) => Object.values(l.fees).reduce((a, b) => a + b, 0);
/** Coût de revient unitaire, figé par lot : (achat + tous les frais jusqu'à la réception) ÷ quantité. */
export const unitCost = (l: Lot) => (l.quantity > 0 ? (l.quantity * l.unitPrice + lotFees(l)) / l.quantity : 0);

/** Lot de référence d'un article : le plus récent pour ce SKU ou ce nom de produit. */
export function lotFor(books: Books, sku: string, name = ""): Lot | undefined {
  return books.lots.filter((l) => l.skus.includes(sku) || l.product === name).sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Dépense publicitaire en FCFA. */
export const spendXaf = (c: Campaign) => c.spend * (c.currency === "EUR" ? c.rate : 1);

const DAY = 86400_000;
const t = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00Z`);
const inRange = (d: string | undefined, from: string, to: string) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) < to;

/**
 * Publicité d'une campagne comptée sur [from, to[ : le budget compte le jour où il est engagé (budget initial à la date de début,
 * chaque ajout à sa date), comme dans le classeur. Arrêter ou relancer une campagne ne déplace donc jamais une dépense passée.
 */
export function adsBetween(c: Campaign, from: string, to: string): number {
  const rate = c.currency === "EUR" ? c.rate : 1;
  const adds = c.budgetAdds ?? [];
  const initial = c.spend - adds.reduce((s, a) => s + a.amount, 0);
  return ((inRange(c.start, from, to) ? initial : 0) + adds.filter((a) => inRange(a.date, from, to)).reduce((s, a) => s + a.amount, 0)) * rate;
}

export type Pnl = {
  revenue: number; cogs: number; gross: number; delivery: number; ads: number; charges: number; losses: number; withdraw: number;
  ebt: number; incomeTax: number; stateTax: number; tax: number; net: number; delivered: number; cancelled: number; placed: number; margin: number;
};

/**
 * Compte de résultat sur [from, to[ (dates AAAA-MM-JJ), règles du classeur :
 * CA et coût des ventes = commandes livrées, à la date de livraison ; livraison = frais payés aux partenaires sur ces commandes ;
 * charges hors « inclus dans le coût de revient » ; frais de retrait (1 %) sur tout l'encaissé, quel que soit le moyen de paiement ;
 * impôts = impôt sur le bénéfice positif + taxe de l'État fixe par commande payée.
 */
export function pnl(orders: Order[], books: Books, from: string, to: string): Pnl {
  const done = orders.filter((o) => o.status === "completed" && inRange(o.deliveredAt ?? o.placedAt, from, to));
  const revenue = done.reduce((s, o) => s + o.total, 0);
  const cogs = done.reduce((s, o) => s + o.lines.reduce((x, l) => x + l.quantity * (lotFor(books, l.sku, l.name) ? unitCost(lotFor(books, l.sku, l.name)!) : 0), 0), 0);
  const delivery = done.reduce((s, o) => s + (o.courierFee ?? 0), 0);
  const ads = books.campaigns.reduce((s, c) => s + adsBetween(c, from, to), 0);
  const charges = expandCharges(books.charges, to).filter((c) => !c.includedInProductCost && inRange(c.date, from, to)).reduce((s, c) => s + c.amount, 0);
  const losses = books.losses.filter((l) => inRange(l.date, from, to)).reduce((s, l) => s + l.quantity * (books.lots.find((x) => x.product === l.product) ? unitCost(books.lots.find((x) => x.product === l.product)!) : 0), 0);
  const gross = revenue - cogs;
  const withdraw = revenue * books.withdrawRate;
  const ebt = gross - delivery - ads - charges - losses - withdraw;
  const incomeTax = ebt > 0 ? ebt * books.taxRate : 0;
  const stateTax = done.length * books.stateTax;
  const tax = incomeTax + stateTax;
  return {
    revenue, cogs, gross, delivery, ads, charges, losses, withdraw, ebt, incomeTax, stateTax, tax, net: ebt - tax,
    delivered: done.length,
    cancelled: orders.filter((o) => o.status === "cancelled" && inRange(o.placedAt, from, to)).length,
    placed: orders.filter((o) => inRange(o.placedAt, from, to)).length,
    margin: revenue ? (ebt - tax) / revenue : 0,
  };
}

export const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const pad = (n: number) => String(n).padStart(2, "0");
export const monthRange = (y: number, m: number) => [`${y}-${pad(m + 1)}-01`, m === 11 ? `${y + 1}-01-01` : `${y}-${pad(m + 2)}-01`] as const;
export const yearRange = (y: number) => [`${y}-01-01`, `${y + 1}-01-01`] as const;
export const monthly = (orders: Order[], books: Books, y: number) => MONTHS_FR.map((label, m) => ({ label, ...pnl(orders, books, ...monthRange(y, m)) }));

/** Stock restant d'un lot = quantité achetée − livrées − pertes (règle du classeur, pertes déduites). */
export function stockLeft(orders: Order[], books: Books, lot: Lot): number {
  const sold = orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.lines.filter((l) => lot.skus.includes(l.sku) || l.name === lot.product).reduce((x, l) => x + l.quantity, 0), 0);
  const lost = books.losses.filter((l) => l.product === lot.product).reduce((s, l) => s + l.quantity, 0);
  const bought = books.lots.filter((l) => l.product === lot.product).reduce((s, l) => s + l.quantity, 0);
  return bought - sold - lost;
}

/** ROAS = CA attribué ÷ dépense ; coût par commande livrée. */
export const roas = (c: Campaign) => (spendXaf(c) ? c.revenue / spendXaf(c) : 0);
export const costPerDelivered = (c: Campaign) => (c.deliveredOrders ? spendXaf(c) / c.deliveredOrders : 0);

/** Dépenses récurrentes : une dépense « chaque mois » est répétée le même jour de chaque mois suivant, jusqu'à `until` (exclu). */
export function expandCharges(charges: Charge[], until: string): Charge[] {
  const out: Charge[] = [];
  for (const c of charges) {
    out.push(c);
    if (!c.monthly) continue;
    const [y, m, d] = c.date.split("-").map(Number) as [number, number, number];
    for (let k = 1; k < 120; k++) {
      const dt = new Date(Date.UTC(y, m - 1 + k, 1));
      const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
      const date = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
      if (date >= until) break;
      out.push({ ...c, id: `${c.id}-${k}`, date });
    }
  }
  return out;
}

const endOf = (c: Campaign, today: string) => new Date(t(c.end ?? today) + DAY).toISOString().slice(0, 10);

/**
 * Résultats d'une campagne : commandes portant son code (lien suivi) ; sinon les chiffres saisis à la main (campagnes du classeur) ;
 * sinon les commandes sans code passées pendant sa période (début → fin, ou aujourd'hui si elle tourne encore). Quand plusieurs
 * campagnes tournent en même temps, une commande va à la plus récemment lancée : elle n'est jamais comptée deux fois.
 */
export function campaignResults(c: Campaign, orders: Order[], today = new Date().toISOString().slice(0, 10), all: Campaign[] = [c]) {
  const byCode = c.code ? orders.filter((o) => o.source?.campaign === c.code) : [];
  if (!byCode.length && (c.orders || c.revenue)) return { mode: "manual" as const, orders: c.orders, delivered: c.deliveredOrders, revenue: c.revenue };
  const codes = new Set(all.map((x) => x.code).filter(Boolean));
  const owner = (o: Order) => all.filter((x) => !(x.orders || x.revenue) && inRange(o.placedAt, x.start, endOf(x, today))).sort((a, b) => b.start.localeCompare(a.start) || b.id.localeCompare(a.id))[0];
  const list = byCode.length ? byCode : orders.filter((o) => !codes.has(o.source?.campaign ?? "") && owner(o)?.id === c.id);
  const done = list.filter((o) => o.status === "completed");
  return { mode: byCode.length ? ("code" as const) : ("period" as const), orders: list.length, delivered: done.length, revenue: done.reduce((s, o) => s + o.total, 0) };
}

/** Lien à mettre dans la publicité : la commande garde le code de la campagne. */
export const trackedLink = (url: string, c: Pick<Campaign, "platform" | "code">) =>
  `${url}${url.includes("?") ? "&" : "?"}utm_source=${encodeURIComponent(c.platform.split(" ")[0]!.toLowerCase())}&utm_medium=paid&utm_campaign=${encodeURIComponent(c.code)}`;

/** Ce que chaque livreur doit reverser : livrées, payées en espèces, non encore réglées → encaissé − ses frais. */
export function remittances(orders: Order[], self = "Moi") {
  const map = new Map<string, { courier: string; orders: Order[]; collected: number; fees: number; due: number }>();
  for (const o of orders) {
    // « Moi » est un livreur comme les autres : ses frais de livraison comptent ; il n'a simplement rien à reverser.
    if (o.status !== "completed" || o.settled || o.paymentMethod !== "cod" || !o.courier || o.courier === self) continue;
    const r = map.get(o.courier) ?? { courier: o.courier, orders: [], collected: 0, fees: 0, due: 0 };
    r.orders.push(o); r.collected += o.total; r.fees += o.courierFee ?? 0; r.due = r.collected - r.fees;
    map.set(o.courier, r);
  }
  return [...map.values()].sort((a, b) => b.due - a.due);
}

/** Jours de stock restants au rythme des ventes livrées des `days` derniers jours (null si aucune vente). */
export function daysOfStock(orders: Order[], lot: Lot, left: number, today: string, days = 30): number | null {
  const from = new Date(t(today) - days * DAY).toISOString().slice(0, 10);
  const sold = orders.filter((o) => o.status === "completed" && inRange(o.deliveredAt ?? o.placedAt, from, today))
    .reduce((s, o) => s + o.lines.filter((l) => lot.skus.includes(l.sku) || l.name === lot.product).reduce((x, l) => x + l.quantity, 0), 0);
  return sold ? Math.floor(left / (sold / days)) : null;
}

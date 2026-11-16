import { describe, expect, it } from "vitest";
import { adsBetween, bankFee, type Books, campaignResults, daysOfStock, expandCharges, pnl, remittances, trackedLink, unitCost } from "../src/lib/finance";
import type { Order } from "../src/lib/types";

const lot = { id: "L1", product: "Lampe", skus: ["LAMP"], date: "2026-01-01", quantity: 100, unitPrice: 500, supplier: "F", fees: { transport: 10000, customs: 20000, shipping: 0, packaging: 0, bank: 0, other: 0 } };
const books: Books = {
  lots: [lot], taxRate: 0.25, eurRate: 656, lowStock: 5, withdrawRate: 0, stateTax: 0,
  campaigns: [{ id: "C1", code: "lampe-nov", platform: "Meta Ads", name: "", products: "", start: "2026-03-17", end: "2026-04-15", spend: 30, currency: "EUR", rate: 656, orders: 0, deliveredOrders: 0, revenue: 0 }],
  charges: [{ id: "H1", date: "2026-03-05", category: "Internet", description: "", amount: 3000, paymentMethod: "", includedInProductCost: false },
            { id: "H2", date: "2026-03-06", category: "Transport", description: "", amount: 9999, paymentMethod: "", includedInProductCost: true }],
  losses: [{ id: "P1", date: "2026-03-10", product: "Lampe", quantity: 2, reason: "Casse", note: "" }],
};
const order = (status: Order["status"], at: string, qty: number, fee: number): Order => ({
  id: at, number: at, storeSlug: "s", placedAt: `${at}T10:00:00+01:00`, deliveredAt: status === "completed" ? `${at}T17:00:00+01:00` : undefined,
  status, paymentStatus: status === "completed" ? "paid" : "unpaid", fulfillmentStatus: "delivered", paymentMethod: "cod",
  customer: { firstName: "", lastName: "", phone: "" }, city: "", neighborhood: "", landmark: "",
  lines: [{ sku: "LAMP", name: "Lampe", variant: "", unitPrice: 10000, quantity: qty }], subtotal: 10000 * qty, shipping: 0, total: 10000 * qty - (qty > 1 ? 1000 : 0), courierFee: fee, events: [],
});

describe("finance", () => {
  it("coût de revient = (achat + frais) / quantité, frais bancaires du classeur", () => {
    expect(unitCost(lot)).toBe(800);
    expect(bankFee(100000)).toBe(2140);
  });

  it("répartit une campagne par jour sur sa période", () => {
    const c = books.campaigns[0]!; // 30 jours, 19 680 FCFA
    expect(adsBetween(c, "2026-03-01", "2026-04-01")).toBeCloseTo(19680 * 15 / 30);
    expect(adsBetween(c, "2026-04-01", "2026-05-01")).toBeCloseTo(19680 * 15 / 30);
  });

  it("compte de résultat : livrées seulement, charges hors coût de revient, impôt sur bénéfice positif", () => {
    const orders = [order("completed", "2026-03-02", 2, 1500), order("completed", "2026-03-20", 1, 1000), order("cancelled", "2026-03-21", 1, 1000)];
    const r = pnl(orders, books, "2026-03-01", "2026-04-01");
    expect(r.revenue).toBe(29000);
    expect(r.cogs).toBe(2400);
    expect(r.delivery).toBe(2500);
    expect(r.charges).toBe(3000);
    expect(r.losses).toBe(1600);
    expect(r.ads).toBeCloseTo(9840);
    expect(r.ebt).toBeCloseTo(29000 - 2400 - 2500 - 9840 - 3000 - 1600);
    expect(r.net).toBeCloseTo(r.ebt * 0.75);
    expect([r.delivered, r.cancelled, r.placed]).toEqual([2, 1, 3]);
  });

  it("répète une dépense mensuelle jusqu'à la date donnée, fin de mois gérée", () => {
    const list = expandCharges([{ id: "R", date: "2026-01-31", category: "Internet", description: "", amount: 3150, paymentMethod: "", includedInProductCost: false, monthly: true }], "2026-04-15");
    expect(list.map((c) => c.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("attribue les commandes à la campagne par son code, sinon par sa période, sinon garde la saisie", () => {
    const o = order("completed", "2026-03-20", 1, 1000);
    const c = { ...books.campaigns[0]!, start: "2026-03-01", end: "2026-03-31" };
    expect(campaignResults(c, [{ ...o, source: { channel: "meta", campaign: "lampe-nov" } }])).toEqual({ mode: "code", orders: 1, delivered: 1, revenue: 10000 });
    expect(campaignResults(c, [o, order("completed", "2026-04-02", 1, 1000)])).toEqual({ mode: "period", orders: 1, delivered: 1, revenue: 10000 });
    expect(campaignResults({ ...c, orders: 4, deliveredOrders: 3, revenue: 9 }, [])).toEqual({ mode: "manual", orders: 4, delivered: 3, revenue: 9 });
    expect(trackedLink("https://x.cm/p", c)).toBe("https://x.cm/p?utm_source=meta&utm_medium=paid&utm_campaign=lampe-nov");
  });

  it("calcule ce que chaque livreur doit reverser (hors commandes réglées et livraisons faites soi-même)", () => {
    const a = { ...order("completed", "2026-03-02", 1, 1500), courier: "KVP" };
    const b = { ...order("completed", "2026-03-03", 1, 1000), courier: "KVP" };
    const done = { ...order("completed", "2026-03-04", 1, 1000), courier: "KVP", settled: true };
    const me = { ...order("completed", "2026-03-05", 1, 0), courier: "Moi" };
    const r = remittances([a, b, done, me]);
    expect(r).toHaveLength(1);
    expect([r[0]!.collected, r[0]!.fees, r[0]!.due]).toEqual([20000, 2500, 17500]);
  });

  it("estime les jours de stock au rythme des 30 derniers jours", () => {
    const orders = [order("completed", "2026-03-10", 2, 0), order("completed", "2026-03-20", 1, 0)]; // 3 ventes en 30 j
    expect(daysOfStock(orders, lot, 30, "2026-03-31")).toBe(300);
    expect(daysOfStock([], lot, 30, "2026-03-31")).toBeNull();
  });
});

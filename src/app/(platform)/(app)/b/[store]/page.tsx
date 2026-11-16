import Link from "next/link";
import { Dashboard } from "@/components/platform/dashboard";
import { getMessages } from "@/server/repo";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";
import { daysOfStock, lotFor, remittances, stockLeft, unitCost } from "@/lib/finance";
import { readPeriod } from "@/lib/period";
import { xaf } from "@/lib/format";

export async function generateMetadata({ params }: StoreParams) {
  return { title: (await loadStore(params)).store.name };
}

export default async function StoreDashboard({ params, searchParams }: StoreParams & { searchParams: Promise<{ periode?: string }> }) {
  const { store, base, orders, books } = await loadStore(params);
  const messages = await getMessages(store);
  const period = readPeriod((await searchParams).periode);
  const inP = (d?: string) => !!d && d.slice(0, 10) >= period.from && d.slice(0, 10) < period.to;
  // Meilleurs produits de la période : quantités livrées, CA et marge (après coût de revient).
  const sold = new Map<string, { qty: number; revenue: number; margin: number }>();
  for (const o of orders.filter((x) => x.status === "completed" && inP(x.deliveredAt ?? x.placedAt)))
    for (const l of o.lines) {
      const cur = sold.get(l.name) ?? { qty: 0, revenue: 0, margin: 0 };
      const lot = lotFor(books, l.sku, l.name);
      sold.set(l.name, { qty: cur.qty + l.quantity, revenue: cur.revenue + l.unitPrice * l.quantity, margin: cur.margin + (l.unitPrice - (lot ? unitCost(lot) : 0)) * l.quantity });
    }
  const best = [...sold].sort((a, b) => b[1].revenue - a[1].revenue);
  const low = books.lowStock;
  const today = new Date().toISOString().slice(0, 10);
  const lowStock = books.lots.filter((l) => { const left = stockLeft(orders, books, l); const d = left > 0 ? daysOfStock(orders, l, left, today) : 0; return left <= low || (d !== null && d < 14); }).length;
  const toCollect = remittances(orders).reduce((s, r) => s + r.due, 0);
  const toConfirm = orders.filter((o) => o.status === "pending").length;
  const inDelivery = orders.filter((o) => ["confirmed", "processing", "packed"].includes(o.status)).length;
  const unread = messages.filter((m) => m.storeSlug === store.slug && !m.handled).length;
  const couriers = new Map<string, { done: number; failed: number; cost: number }>();
  for (const o of orders.filter((x) => inP(x.deliveredAt ?? x.placedAt))) {
    if (!o.courier || (o.status !== "completed" && o.status !== "cancelled")) continue;
    const c = couriers.get(o.courier) ?? { done: 0, failed: 0, cost: 0 };
    if (o.status === "completed") c.done += 1; else c.failed += 1;
    c.cost += o.courierFee ?? 0;
    couriers.set(o.courier, c);
  }
  const todo = [
    { href: `${base}/commandes`, icon: "orders" as const, label: "Commandes à confirmer", n: toConfirm },
    { href: `${base}/commandes`, icon: "truck" as const, label: "Commandes en cours de livraison", n: inDelivery },
    { href: `${base}/achats`, icon: "box" as const, label: `Produits à réapprovisionner`, n: lowStock },
    { href: `${base}/messages`, icon: "inbox" as const, label: "Messages non traités", n: unread },
    { href: `${base}/livraison`, icon: "cash" as const, label: toCollect ? `À recevoir des livreurs : ${xaf(toCollect)}` : "À recevoir des livreurs", n: remittances(orders).length },
  ];
  return (
    <Dashboard orders={orders} books={books} base={base} link={base} period={period} title={store.name} subtitle="Les chiffres clés de votre boutique, calculés automatiquement">
      <div className="nx-grid half">
        <section className="nx-panel">
          <header><span className="nx-label">À traiter</span></header>
          <div className="nx-card nx-todo">
            {todo.map((x) => <Link key={x.label} href={x.href}><Icon name={x.icon} size={16} /> {x.label} <b style={{ color: x.n ? "var(--nx-ink)" : "var(--nx-faint)" }}>{x.n}</b></Link>)}
          </div>
        </section>
        <section className="nx-panel">
          <header><span className="nx-label">Livraison par partenaire</span><Link href={`${base}/livraison`} className="nx-btn sm">Livraison <Icon name="arrowRight" size={14} /></Link></header>
          <div className="nx-card flush">
            <div className="nx-tablewrap">
              <table className="nx-table">
                <thead><tr><th scope="col">Partenaire</th><th scope="col" className="right">Livrées</th><th scope="col" className="right">Réussite</th><th scope="col" className="right">Coût total</th></tr></thead>
                <tbody>
                  {[...couriers].sort((a, b) => b[1].done - a[1].done).map(([name, c]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td className="right mono">{c.done}</td>
                      <td className="right mono">{Math.round((c.done / (c.done + c.failed)) * 100)} %</td>
                      <td className="right mono">{xaf(c.cost)}</td>
                    </tr>
                  ))}
                  {couriers.size === 0 && <tr><td colSpan={4} className="nx-empty">Aucune livraison enregistrée.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      <section className="nx-panel">
        <header><span className="nx-label">Meilleurs produits · {period.label}</span><Link href={`${base}/achats`} className="nx-btn sm">Achats et stock <Icon name="arrowRight" size={14} /></Link></header>
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead><tr><th scope="col">Produit</th><th scope="col" className="right">Livrés</th><th scope="col" className="right">CA</th><th scope="col" className="right">Marge brute</th></tr></thead>
              <tbody>
                {best.map(([name, v]) => (
                  <tr key={name}>
                    <td style={{ whiteSpace: "normal" }}>{name}</td>
                    <td className="right mono">{v.qty}</td>
                    <td className="right mono">{xaf(v.revenue)}</td>
                    <td className="right mono" style={{ color: v.margin >= 0 ? "var(--nx-green)" : "var(--nx-red)" }}>{xaf(Math.round(v.margin))}</td>
                  </tr>
                ))}
                {!best.length && <tr><td colSpan={4} className="nx-empty">Aucune livraison sur cette période.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </Dashboard>
  );
}

import { PurchaseForm } from "@/components/platform/books-forms";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";
import { fcfa, Kpi } from "@/components/platform/ui";
import { dateFr, nf } from "@/lib/format";
import { daysOfStock, lotFees, stockLeft, unitCost } from "@/lib/finance";

export const metadata = { title: "Achats et stock" };

export default async function Purchases({ params, searchParams }: StoreParams & { searchParams: Promise<{ lot?: string }> }) {
  const { store, orders, books, products, base } = await loadStore(params);
  const lotId = (await searchParams).lot;
  const editing = books.lots.find((l) => l.id === lotId);
  const priceOf = (skus: string[], name: string) => {
    const v = products.flatMap((p) => p.variants).find((x) => skus.includes(x.sku));
    if (v) return v.price;
    const counts = new Map<number, number>();
    for (const o of orders) for (const l of o.lines) if (l.name === name && o.status === "completed") counts.set(l.unitPrice, (counts.get(l.unitPrice) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  };
  const rows = [...books.lots].sort((a, b) => b.date.localeCompare(a.date)).map((l) => {
    const cost = unitCost(l);
    const price = priceOf(l.skus, l.product);
    const left = stockLeft(orders, books, l);
    return { l, cost, price, margin: price - cost, left, days: left > 0 ? daysOfStock(orders, l, left, new Date().toISOString().slice(0, 10)) : 0 };
  });
  const invested = books.lots.reduce((s, l) => s + l.quantity * l.unitPrice + lotFees(l), 0);
  const stockValue = rows.reduce((s, r) => s + Math.max(0, r.left) * r.cost, 0);
  const low = rows.filter((r) => r.left <= books.lowStock);
  return (
    <>
      <div className="nx-head"><div><h1>Achats et stock</h1><p>Chaque achat (lot) donne le coût de revient unitaire : prix d'achat plus tous les frais jusqu'à la réception. Le stock baisse à chaque livraison et à chaque perte ; « Jours de stock » prévient quand recommander (moins de 14 jours au rythme actuel).</p></div></div>
      <div className="nx-grid k4">
        <Kpi label="Total investi en achats" value={nf(Math.round(invested))} unit="FCFA" delta={`${books.lots.length} lots`} />
        <Kpi label="Valeur du stock" value={nf(Math.round(stockValue))} unit="FCFA" delta="Au coût de revient" />
        <Kpi label="Unités en stock" value={String(rows.reduce((s, r) => s + Math.max(0, r.left), 0))} unit="unités" delta={`${rows.filter((r) => r.left > 0).length} produits disponibles`} />
        <Kpi label="Stock faible" value={String(low.length)} unit="produits" tone={low.length ? "bad" : "ok"} delta={`Seuil : ${books.lowStock} unités`} />
      </div>
      <section className="nx-panel">
        <header><span className="nx-label">Produits achetés</span></header>
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead><tr><th scope="col">Produit</th><th scope="col">Acheté le</th><th scope="col" className="right">Quantité</th><th scope="col" className="right">Prix d'achat total</th><th scope="col" className="right">Frais</th><th scope="col" className="right">Coût de revient</th><th scope="col" className="right">Prix de vente</th><th scope="col" className="right">Marge / unité</th><th scope="col" className="right">Stock</th><th scope="col" className="right">Jours de stock</th><th scope="col"><span className="sr-only">Modifier</span></th></tr></thead>
              <tbody>
                {rows.map(({ l, cost, price, margin, left, days }) => (
                  <tr key={l.id}>
                    <td><strong style={{ fontWeight: 500 }}>{l.product}</strong><br /><small className="muted">{l.supplier}</small></td>
                    <td className="muted">{dateFr(l.date)}</td>
                    <td className="right mono">{l.quantity}</td>
                    <td className="right mono">{fcfa(l.quantity * l.unitPrice)}</td>
                    <td className="right mono muted">{fcfa(lotFees(l))}</td>
                    <td className="right mono"><b style={{ fontWeight: 600 }}>{fcfa(cost)}</b></td>
                    <td className="right mono">{price ? fcfa(price) : "—"}</td>
                    <td className="right mono" style={{ color: margin >= 0 ? "var(--nx-green)" : "var(--nx-red)" }}>{price ? fcfa(margin) : "—"}</td>
                    <td className="right"><span className={`nx-pill ${left <= 0 ? "bad" : left <= books.lowStock ? "wait" : "ok"}`}>{left}</span></td>
                    <td className="right mono" title="Au rythme des ventes livrées des 30 derniers jours">{left <= 0 ? <span className="nx-pill bad">Épuisé</span> : days === null ? <span className="muted">Pas de vente récente</span> : days < 14 ? <span className="nx-pill wait">{days} j · à commander</span> : `${days} j`}</td>
                    <td><a className="nx-btn ghost" href={`${base}/achats?lot=${l.id}#achat`} aria-label={`Modifier l'achat ${l.product}`}><Icon name="pen" size={15} /></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="nx-panel" id="achat">
        <header><span className="nx-label">{editing ? `Modifier l'achat : ${editing.product}` : "Nouvel achat"}</span></header>
        <PurchaseForm key={editing?.id ?? "new"} storeSlug={store.slug} products={[...new Set(books.lots.map((l) => l.product))]} lot={editing} onDone={editing ? `${base}/achats` : undefined} />
      </section>
    </>
  );
}

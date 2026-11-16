import { ChargeForm, LossForm } from "@/components/platform/books-forms";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { fcfa, Kpi, PeriodPicker } from "@/components/platform/ui";
import { dateFr, nf } from "@/lib/format";
import { expandCharges, unitCost } from "@/lib/finance";
import { readPeriod } from "@/lib/period";

export const metadata = { title: "Dépenses et pertes" };

export default async function Expenses({ params, searchParams }: StoreParams & { searchParams: Promise<{ periode?: string }> }) {
  const { store, base, books, lists } = await loadStore(params);
  const p = readPeriod((await searchParams).periode);
  const inP = (d: string) => d >= p.from && d < p.to;
  const charges = expandCharges(books.charges, p.to).filter((c) => inP(c.date)).sort((a, b) => b.date.localeCompare(a.date));
  const losses = books.losses.filter((l) => inP(l.date)).map((l) => {
    const lot = books.lots.find((x) => x.product === l.product);
    return { ...l, value: lot ? l.quantity * unitCost(lot) : 0 };
  });
  const counted = charges.filter((c) => !c.includedInProductCost);
  const byCat = new Map<string, number>();
  for (const c of counted) byCat.set(c.category, (byCat.get(c.category) ?? 0) + c.amount);
  const total = counted.reduce((s, c) => s + c.amount, 0);
  const lossTotal = losses.reduce((s, l) => s + l.value, 0);
  const top = [...byCat].sort((a, b) => b[1] - a[1])[0];
  return (
    <>
      <div className="nx-head"><div><h1>Dépenses et pertes</h1><p>Charges de fonctionnement (internet, stockage, transport…) et produits perdus. Les deux sont déduits du bénéfice dans la comptabilité.</p></div></div>
      <PeriodPicker base={`${base}/depenses`} period={p.period} year={p.year} />
      <div className="nx-grid k4">
        <Kpi label="Charges" value={nf(Math.round(total))} unit="FCFA" delta={`${counted.length} dépenses · ${p.label}`} />
        <Kpi label="Plus gros poste" value={top ? top[0] : "—"} delta={top ? fcfa(top[1]) : "Aucune dépense"} />
        <Kpi label="Pertes" value={nf(Math.round(lossTotal))} unit="FCFA" delta={`${losses.reduce((s, l) => s + l.quantity, 0)} unités au coût de revient`} />
        <Kpi label="Total déduit" value={nf(Math.round(total + lossTotal))} unit="FCFA" delta="Charges + pertes" />
      </div>
      <div className="nx-grid half">
        <section className="nx-panel">
          <header><span className="nx-label">Charges · {p.label}</span></header>
          <div className="nx-card flush">
            <div className="nx-tablewrap">
              <table className="nx-table">
                <thead><tr><th scope="col">Date</th><th scope="col">Catégorie</th><th scope="col">Description</th><th scope="col" className="right">Montant</th></tr></thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.id}>
                      <td className="muted">{dateFr(c.date)}</td>
                      <td>{c.category}{c.monthly && <span className="nx-pill info" style={{ marginLeft: 6 }}>Mensuelle</span>}{c.includedInProductCost && <span className="nx-pill off" style={{ marginLeft: 6 }}>Dans le coût d'achat</span>}</td>
                      <td className="muted" style={{ whiteSpace: "normal" }}>{c.description || "—"}</td>
                      <td className="right mono">{fcfa(c.amount)}</td>
                    </tr>
                  ))}
                  {!charges.length && <tr><td colSpan={4} className="nx-empty">Aucune dépense sur cette période.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section className="nx-panel">
          <header><span className="nx-label">Pertes · {p.label}</span></header>
          <div className="nx-card flush">
            <div className="nx-tablewrap">
              <table className="nx-table">
                <thead><tr><th scope="col">Date</th><th scope="col">Produit</th><th scope="col">Motif</th><th scope="col" className="right">Qté</th><th scope="col" className="right">Valeur</th></tr></thead>
                <tbody>
                  {losses.map((l) => (
                    <tr key={l.id}>
                      <td className="muted">{dateFr(l.date)}</td>
                      <td>{l.product}</td>
                      <td className="muted" style={{ whiteSpace: "normal" }}>{l.reason}{l.note ? ` · ${l.note}` : ""}</td>
                      <td className="right mono">{l.quantity}</td>
                      <td className="right mono">{fcfa(l.value)}</td>
                    </tr>
                  ))}
                  {!losses.length && <tr><td colSpan={5} className="nx-empty">Aucune perte sur cette période.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      <div className="nx-grid half">
        <section className="nx-panel"><header><span className="nx-label">Nouvelle dépense</span></header><ChargeForm storeSlug={store.slug} categories={lists.chargeCategories} methods={lists.paymentMethods} /></section>
        <section className="nx-panel"><header><span className="nx-label">Nouvelle perte</span></header><LossForm storeSlug={store.slug} products={books.lots.map((l) => l.product)} reasons={lists.lossReasons} /></section>
      </div>
    </>
  );
}

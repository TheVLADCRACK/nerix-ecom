import { nf } from "@/lib/format";
import { ExportButtons } from "@/components/platform/export-buttons";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { fcfa, Kpi, PeriodPicker } from "@/components/platform/ui";
import { readPeriod } from "@/lib/period";
import { monthly, pnl } from "@/lib/finance";

export const metadata = { title: "Comptabilité" };

const pick = ({ delivered, revenue, cogs, delivery, ads, charges, losses, withdraw, tax, net }: ReturnType<typeof pnl>) => ({ delivered, revenue, cogs, delivery, ads, charges, losses, withdraw, tax, net });

export default async function Compta({ params, searchParams }: StoreParams & { searchParams: Promise<{ periode?: string }> }) {
  const { store, base, orders, books } = await loadStore(params);
  const p = readPeriod((await searchParams).periode);
  const r = pnl(orders, books, p.from, p.to);
  const months = monthly(orders, books, p.year);
  const maxAbs = Math.max(1, ...months.map((m) => Math.abs(m.net)));
  const lines: [string, number, "sub" | "minus" | "total"][] = [
    ["Chiffre d'affaires (commandes livrées)", r.revenue, "sub"],
    ["Coût des produits vendus", -r.cogs, "minus"],
    ["Marge brute", r.gross, "sub"],
    ["Livraison (partenaires)", -r.delivery, "minus"],
    ["Publicité", -r.ads, "minus"],
    ["Charges", -r.charges, "minus"],
    ["Pertes", -r.losses, "minus"],
    [`Frais de retrait (${String(books.withdrawRate * 100).replace(".", ",")} % de l'encaissé)`, -r.withdraw, "minus"],
    ["Bénéfice avant impôt", r.ebt, "sub"],
    [`Impôt sur le bénéfice (${Math.round(books.taxRate * 100)} %)`, -r.incomeTax, "minus"],
    [`Taxe de l'État (${books.stateTax} FCFA × ${r.delivered} commandes)`, -r.stateTax, "minus"],
    ["Bénéfice net", r.net, "total"],
  ];
  return (
    <>
      <div className="nx-head">
        <div><h1>Comptabilité</h1><p>Compte de résultat calculé automatiquement à partir des commandes livrées, des achats, des campagnes, des dépenses et des pertes.</p></div>
        <div className="actions"><ExportButtons store={store.name} title={`Compte de résultat ${p.year}`} file={`compte-de-resultat-${store.slug}-${p.year}`} rows={months.map(({ label, delivered, revenue, cogs, delivery, ads, charges, losses, withdraw, tax, net }) => ({ label, delivered, revenue, cogs, delivery, ads, charges, losses, withdraw, tax, net }))} total={{ label: "Total", ...pick(pnl(orders, books, `${p.year}-01-01`, `${p.year + 1}-01-01`)) }} /></div>
      </div>
      <PeriodPicker base={`${base}/compta`} period={p.period} year={p.year} />
      <div className="nx-grid k4">
        <Kpi label="Chiffre d'affaires" value={nf(Math.round(r.revenue))} unit="FCFA" delta={`${r.delivered} commandes livrées`} />
        <Kpi label="Bénéfice net" value={nf(Math.round(r.net))} unit="FCFA" tone={r.net >= 0 ? "ok" : "bad"} delta={`Marge nette ${Math.round(r.margin * 100)} %`} />
        <Kpi label="Publicité" value={nf(Math.round(r.ads))} unit="FCFA" delta={r.ads ? `${(r.revenue / r.ads).toFixed(1).replace(".", ",")} FCFA de CA par franc investi` : "Aucune dépense"} />
        <Kpi label="Livraison" value={nf(Math.round(r.delivery))} unit="FCFA" delta={r.delivered ? `${fcfa(r.delivery / r.delivered)} par commande` : "—"} />
      </div>
      <div className="nx-grid c2">
        <section className="nx-panel">
          <header><span className="nx-label">Bénéfice net par mois · {p.year}</span></header>
          <div className="nx-card">
            <div className="nx-netbars" role="img" aria-label={`Bénéfice net par mois en ${p.year}`}>
              {months.map((m, i) => (
                <a key={m.label} href={`${base}/compta?periode=${p.year}-${String(i + 1).padStart(2, "0")}`} title={`${m.label} : ${fcfa(m.net)}`} data-neg={m.net < 0} aria-current={p.period.endsWith(`-${String(i + 1).padStart(2, "0")}`) || undefined}>
                  <i style={{ height: `${(Math.abs(m.net) / maxAbs) * 100}%` }} />
                  <span>{m.label.slice(0, 3)}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
        <section className="nx-panel">
          <header><span className="nx-label">Compte de résultat · {p.label}</span></header>
          <div className="nx-card nx-pnl">
            {lines.map(([label, v, kind]) => (
              <div key={label} data-kind={kind}><span>{label}</span><b className="mono" style={kind === "total" ? { color: v >= 0 ? "var(--nx-green)" : "var(--nx-red)" } : undefined}>{fcfa(v)}</b></div>
            ))}
          </div>
        </section>
      </div>
      <section className="nx-panel">
        <header><span className="nx-label">Détail mensuel · {p.year}</span></header>
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead><tr><th scope="col">Mois</th><th scope="col" className="right">Livrées</th><th scope="col" className="right">CA</th><th scope="col" className="right">Coût produits</th><th scope="col" className="right">Livraison</th><th scope="col" className="right">Publicité</th><th scope="col" className="right">Charges et pertes</th><th scope="col" className="right">Bénéfice net</th></tr></thead>
              <tbody>
                {months.filter((m) => m.revenue || m.ads || m.charges || m.losses).map((m) => (
                  <tr key={m.label}>
                    <td>{m.label}</td>
                    <td className="right mono">{m.delivered}</td>
                    <td className="right mono">{fcfa(m.revenue)}</td>
                    <td className="right mono muted">{fcfa(m.cogs)}</td>
                    <td className="right mono muted">{fcfa(m.delivery)}</td>
                    <td className="right mono muted">{fcfa(m.ads)}</td>
                    <td className="right mono muted">{fcfa(m.charges + m.losses)}</td>
                    <td className="right mono" style={{ color: m.net >= 0 ? "var(--nx-green)" : "var(--nx-red)" }}>{fcfa(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

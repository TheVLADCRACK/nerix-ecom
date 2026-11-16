import { nf } from "@/lib/format";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { type Books, pnl } from "@/lib/finance";
import type { Order } from "@/lib/types";
import { SalesTrend } from "./sales-trend";
import { fcfa, Kpi, OrdersTable, PeriodPicker, stats } from "./ui";

type Period = { period: string; year: number; from: string; to: string; label: string };

/** Tableau de bord : indicateurs clés de la période, commandes, compte de résultat résumé, puis blocs propres à la page. */
export function Dashboard({ orders, books, base, link, period, title, subtitle, children }: { orders: Order[]; books: Books; base: string; link: string; period: Period; title: string; subtitle: string; children?: React.ReactNode }) {
  const s = stats(orders);
  const r = pnl(orders, books, period.from, period.to);
  const decided = r.delivered + r.cancelled;
  const n = (v: number) => nf(Math.round(v));
  return (
    <>
      <div className="nx-head">
        <div><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="actions"><Link href={`${base}/compta?periode=${period.period}`} className="nx-btn"><Icon name="wallet" size={16} /> Comptabilité détaillée</Link></div>
      </div>
      <PeriodPicker base={link} period={period.period} year={period.year} />

      <div className="nx-grid k4">
        <Kpi label="Chiffre d'affaires" value={n(r.revenue)} unit="FCFA" delta={`${r.delivered} livrées · panier ${fcfa(r.delivered ? r.revenue / r.delivered : 0)}`} />
        <Kpi label="Bénéfice net" value={n(r.net)} unit="FCFA" tone={r.net >= 0 ? "ok" : "bad"} delta={`Marge nette ${Math.round(r.margin * 100)} %`} />
        <Kpi label="Publicité" value={n(r.ads)} unit="FCFA" delta={r.ads ? `${(r.revenue / r.ads).toFixed(1).replace(".", ",")} FCFA de CA par franc` : "Aucune dépense"} />
        <Kpi label="Taux de livraison" value={decided ? `${Math.round((r.delivered / decided) * 100)} %` : "—"} delta={`${r.cancelled} annulée${r.cancelled > 1 ? "s" : ""} sur ${decided}`} />
      </div>

      <div className="nx-grid c2">
        <section className="nx-panel">
          <header><span className="nx-label">Commandes et livraisons</span></header>
          <div className="nx-card"><SalesTrend trend={s.trend} /></div>
        </section>
        <section className="nx-panel">
          <header><span className="nx-label">Résultat · {period.label}</span></header>
          <div className="nx-card nx-pnl">
            {([["Chiffre d'affaires", r.revenue, "sub"], ["Coût des produits", -r.cogs, "minus"], ["Livraison", -r.delivery, "minus"], ["Publicité", -r.ads, "minus"], ["Charges et pertes", -(r.charges + r.losses), "minus"], ["Impôt", -r.tax, "minus"], ["Bénéfice net", r.net, "total"]] as const).map(([label, v, kind]) => (
              <div key={label} data-kind={kind}><span>{label}</span><b className="mono" style={kind === "total" ? { color: v >= 0 ? "var(--nx-green)" : "var(--nx-red)" } : undefined}>{fcfa(v)}</b></div>
            ))}
          </div>
        </section>
      </div>

      {children}

      <section className="nx-panel">
        <header>
          <span className="nx-label">Dernières commandes</span>
          <Link href={`${base}/commandes`} className="nx-btn sm">Tout voir <Icon name="arrowRight" size={14} /></Link>
        </header>
        <div className="nx-card flush"><OrdersTable orders={orders.slice(0, 5)} base={base} compact /></div>
      </section>
    </>
  );
}

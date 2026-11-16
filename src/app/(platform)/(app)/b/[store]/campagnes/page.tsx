import { CampaignForm } from "@/components/platform/books-forms";
import { CampaignActions } from "@/components/platform/campaign-actions";
import { campaignVisitors, getTraffic } from "@/server/repo";
import { PixelsForm } from "@/components/platform/pixels-form";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { fcfa, Kpi, PeriodPicker } from "@/components/platform/ui";
import { dateFr, nf } from "@/lib/format";
import { campaignResults, pnl, spendXaf } from "@/lib/finance";
import { readPeriod } from "@/lib/period";

export const metadata = { title: "Campagnes et pixels" };

export default async function Campaigns({ params, searchParams }: StoreParams & { searchParams: Promise<{ periode?: string }> }) {
  const { store, base, orders, books, products, lists } = await loadStore(params);
  const p = readPeriod((await searchParams).periode);
  const r = pnl(orders, books, p.from, p.to);
  const list = [...books.campaigns].sort((a, b) => b.start.localeCompare(a.start));
  const today = new Date().toISOString().slice(0, 10);
  const running = (c: (typeof list)[number]) => c.start <= today && (!c.end || c.end >= today);
  const active = list.filter(running).length;
  const [traffic, visits] = await Promise.all([getTraffic(store.id, p.from, p.to), Promise.all(list.map((c) => campaignVisitors(store.id, c, today)))]);
  const placed = orders.filter((o) => o.placedAt.slice(0, 10) >= p.from && o.placedAt.slice(0, 10) < p.to);
  const tracked = traffic.since ? placed.filter((o) => o.placedAt >= traffic.since!) : [];
  const pct = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toString().replace(".", ",")} %` : "—");
  return (
    <>
      <div className="nx-head"><div><h1>Campagnes et pixels</h1><p>Ce que coûte la publicité et ce qu'elle rapporte. Le budget compte le jour où il est engagé : au lancement, puis à chaque ajout ; arrêter une campagne ne change pas sa dépense. Avec le lien suivi, une campagne compte ses propres commandes ; sans lui, elle prend les commandes de sa période (quand plusieurs tournent ensemble, la plus récente). Les campagnes du classeur gardent leurs chiffres saisis.</p></div></div>
      <PeriodPicker base={`${base}/campagnes`} period={p.period} year={p.year} />
      <div className="nx-grid k4">
        <Kpi label="Visiteurs" value={nf(traffic.visitors)} delta={`${nf(traffic.views)} pages vues · ${traffic.live} en ce moment`} />
        <Kpi label="Taux de conversion" value={pct(tracked.length, traffic.visitors)} delta={traffic.since ? `${tracked.length} commandes ÷ visiteurs (depuis le début du comptage)` : "Pas encore de visite comptée"} />
        <Kpi label="Taux de livraison" value={pct(r.delivered, placed.length)} delta={`${r.delivered} livrées sur ${placed.length} commandes`} />
        <Kpi label="ROAS de la période" value={r.ads ? (r.revenue / r.ads).toFixed(2).replace(".", ",") : "—"} delta="CA des livrées ÷ publicité" tone={r.ads && r.revenue / r.ads < 1 ? "bad" : undefined} />
      </div>
      <div className="nx-grid k4">
        <Kpi label="Investi en publicité" value={nf(Math.round(r.ads))} unit="FCFA" delta={p.label} />
        <Kpi label="CA par franc investi (ROAS)" value={r.ads ? (r.revenue / r.ads).toFixed(2).replace(".", ",") : "—"} delta="CA des livrées ÷ publicité" tone={r.ads && r.revenue / r.ads < 1 ? "bad" : undefined} />
        <Kpi label="Coût par commande livrée" value={r.delivered && r.ads ? nf(Math.round(r.ads / r.delivered)) : "—"} unit={r.delivered && r.ads ? "FCFA" : undefined} delta={`${r.delivered} commandes livrées`} />
        <Kpi label="Campagnes en cours" value={String(active)} delta={`${list.length} campagnes au total`} />
      </div>
      <section className="nx-panel">
        <header><span className="nx-label">Campagnes</span></header>
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead><tr><th scope="col">Campagne</th><th scope="col">Période</th><th scope="col" className="right">Dépense</th><th scope="col" className="right">Visiteurs</th><th scope="col" className="right">Commandes</th><th scope="col" className="right">Livrées</th><th scope="col" className="right">CA attribué</th><th scope="col" className="right">ROAS</th><th scope="col" className="right">Coût / livrée</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {list.map((c, i) => {
                  const res = campaignResults(c, orders, today, list);
                  const v = visits[i]!;
                  const spend = spendXaf(c);
                  return (
                  <tr key={c.id}>
                    <td><strong style={{ fontWeight: 500 }}>{c.platform}</strong><br /><small className="muted">{c.name || "—"}{c.products ? ` · ${c.products}` : ""}</small></td>
                    <td className="muted">{dateFr(c.start)}{c.end ? ` → ${dateFr(c.end)}` : " → en cours"}</td>
                    <td className="right mono">{fcfa(spendXaf(c))}{c.currency === "EUR" && <><br /><small className="muted">{c.spend} €</small></>}</td>
                    <td className="right mono">{v.visitors || "—"}{v.visitors > 0 && <><br /><small className="muted">{v.byCode ? "lien suivi" : "période"}</small></>}</td>
                    <td className="right mono">{res.orders || "—"}{res.mode !== "manual" && res.orders > 0 && <><br /><small className="muted">{res.mode === "code" ? "lien suivi" : "période"}</small></>}</td>
                    <td className="right mono">{res.delivered || "—"}</td>
                    <td className="right mono">{res.revenue ? fcfa(res.revenue) : "—"}</td>
                    <td className="right mono">{res.revenue && spend ? (res.revenue / spend).toFixed(2).replace(".", ",") : "—"}</td>
                    <td className="right mono">{res.delivered ? fcfa(spend / res.delivered) : "—"}</td>
                    <td><CampaignActions storeSlug={store.slug} id={c.id} running={running(c)} start={c.start} end={c.end} /></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <div className="nx-grid form">
        <section className="nx-panel"><header><span className="nx-label">Nouvelle campagne</span></header><CampaignForm storeSlug={store.slug} platforms={lists.adPlatforms} products={products.map(({ slug, name }) => ({ slug, name }))} eurRate={books.eurRate} storeUrl={`https://${store.slug}.ecom.nerix.site`} /></section>
        <section className="nx-panel"><header><span className="nx-label">Pixels de suivi</span></header><PixelsForm storeSlug={store.slug} initial={store.tracking} /></section>
      </div>
    </>
  );
}

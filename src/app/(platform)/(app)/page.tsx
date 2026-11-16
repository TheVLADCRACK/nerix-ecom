import Link from "next/link";
import { Dashboard } from "@/components/platform/dashboard";
import { stats } from "@/components/platform/ui";
import { Icon } from "@/components/ui/icons";
import { requireStaff } from "@/server/auth";
import { getPlatform } from "@/server/repo";
import { readPeriod } from "@/lib/period";
import { xaf } from "@/lib/format";

export const metadata = { title: "Vue d'ensemble" };

export default async function Overview({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const me = await requireStaff();
  const { stores, orders, books } = await getPlatform();
  const period = readPeriod((await searchParams).periode);
  return (
    <Dashboard orders={orders} books={books} base={`/b/${stores[0]?.store.slug ?? ""}`} link="/" period={period} title={`Bonjour, ${me.name}`} subtitle={stores.length > 1 ? `Vue d'ensemble de vos ${stores.length} boutiques` : "Vue d'ensemble de votre boutique"}>
      <section className="nx-panel">
        <header>
          <span className="nx-label">Vos boutiques</span>
          <Link href="/boutiques" className="nx-btn sm">Gérer <Icon name="arrowRight" size={14} /></Link>
        </header>
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead>
                <tr><th scope="col">Boutique</th><th scope="col">Adresse</th><th scope="col">Statut</th><th scope="col" className="right">Produits</th><th scope="col" className="right">Commandes</th><th scope="col" className="right">CA encaissé</th><th scope="col"><span className="sr-only">Ouvrir</span></th></tr>
              </thead>
              <tbody>
                {stores.map(({ store: st, orders: so, products: count }) => {
                  const s = stats(so);
                  return (
                    <tr key={st.slug}>
                      <td><div className="nx-prod"><img className="nx-thumb" src={st.logo} alt="" /><strong>{st.name}</strong></div></td>
                      <td className="mono" style={{ color: "var(--nx-blue)" }}>{st.slug}.ecom.nerix.site</td>
                      <td><span className={`nx-pill ${st.status === "active" ? "ok" : "off"}`}>{st.status === "active" ? "En ligne" : "Brouillon"}</span></td>
                      <td className="right mono">{count}</td>
                      <td className="right mono">{s.orders}</td>
                      <td className="right mono">{xaf(s.revenue)}</td>
                      <td><Link href={`/b/${st.slug}`} className="nx-btn sm">Ouvrir</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </Dashboard>
  );
}

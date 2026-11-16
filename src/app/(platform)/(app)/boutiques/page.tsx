import Link from "next/link";
import { stats } from "@/components/platform/ui";
import { Icon } from "@/components/ui/icons";
import { requireStaff } from "@/server/auth";
import { getPlatform } from "@/server/repo";
import { nf } from "@/lib/format";

export const metadata = { title: "Boutiques" };

export default async function Stores() {
  await requireStaff();
  const { stores } = await getPlatform();
  return (
    <>
      <div className="nx-head">
        <div><h1>Boutiques</h1><p>Créez une boutique, puis passez de l'une à l'autre depuis le sélecteur en haut à gauche.</p></div>
        <div className="actions"><Link href="/boutiques/nouvelle" className="nx-btn dark"><Icon name="plus" size={16} /> Créer une boutique</Link></div>
      </div>
      <div className="nx-stores">
        {stores.map(({ store: st, orders: so, products: count }) => {
          const s = stats(so);
          return (
            <article key={st.slug} className="nx-card nx-storecard">
              <div className="top">
                <img src={st.logo} alt="" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: 15 }}>{st.name}</strong>
                  <div className="url">{st.slug}.ecom.nerix.site</div>
                </div>
                <span className={`nx-pill ${st.status === "active" ? "ok" : "off"}`}>{st.status === "active" ? "En ligne" : "Brouillon"}</span>
              </div>
              <div className="stats">
                <div><b>{count}</b><span>produits</span></div>
                <div><b>{s.orders}</b><span>commandes</span></div>
                <div><b>{nf(s.revenue)}</b><span>FCFA encaissés</span></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/b/${st.slug}`} className="nx-btn dark sm">Gérer</Link>
                <Link href={`/b/${st.slug}/editeur`} className="nx-btn sm"><Icon name="layout" size={14} /> Éditeur</Link>
                <a href={`/s/${st.slug}`} target="_blank" rel="noopener" className="nx-btn sm" style={{ marginLeft: "auto" }}><Icon name="eye" size={14} /> Voir</a>
              </div>
            </article>
          );
        })}
        <Link href="/boutiques/nouvelle" className="nx-new">
          <span><Icon name="plus" size={22} /><br />Nouvelle boutique</span>
        </Link>
      </div>
    </>
  );
}

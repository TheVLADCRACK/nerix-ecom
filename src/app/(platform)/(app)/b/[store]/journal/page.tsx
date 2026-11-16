import Link from "next/link";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { dateTimeFr } from "@/lib/format";
import { getAudit, getOrderEvents } from "@/server/repo";

export const metadata = { title: "Journal d'activité" };

/** Qui a fait quoi, et quand : journal d'audit des actions de l'équipe et historique des commandes. */
export default async function Journal({ params }: StoreParams) {
  const { store, base } = await loadStore(params);
  const audit = (await getAudit(store.id)).map((a) => ({ at: a.at.toISOString(), who: a.actor_name, what: a.action, ref: a.target, order: false }));
  const events = (await getOrderEvents(store.id)).map((e) => ({ at: e.at, who: e.actor || "Boutique", what: e.label, ref: e.number, order: true }));
  const entries = [...audit, ...events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  return (
    <>
      <div className="nx-head"><div><h1>Journal d'activité</h1><p>Chaque action importante est enregistrée avec son auteur : changement de statut, remise, frais de livreur, prix, stock, dépense, campagne, paramètre.</p></div></div>
      <section className="nx-panel">
        <header><span className="nx-label">Dernières actions</span></header>
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead><tr><th scope="col">Quand</th><th scope="col">Qui</th><th scope="col">Action</th><th scope="col">Objet</th></tr></thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{dateTimeFr(e.at)}</td>
                    <td>{e.who}</td>
                    <td style={{ whiteSpace: "normal" }}>{e.what}</td>
                    <td>{e.order ? <Link href={`${base}/commandes/${e.ref}`} className="mono">{e.ref}</Link> : <span className="mono muted">{e.ref}</span>}</td>
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

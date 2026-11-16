import Link from "next/link";
import { ActionForm } from "@/components/platform/action-form";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { saveCity } from "@/server/actions/settings";
import { Remittances } from "@/components/platform/remittances";
import { Icon } from "@/components/ui/icons";
import { remittances } from "@/lib/finance";
import { etaText, xaf } from "@/lib/format";

export const metadata = { title: "Livraison" };

export default async function Delivery({ params, searchParams }: StoreParams & { searchParams: Promise<{ ville?: string }> }) {
  const { store, base, orders, cities } = await loadStore(params);
  const sel = (await searchParams).ville;
  const city = sel === "nouvelle" ? null : cities.find((c) => c.id === sel) ?? cities[0] ?? null;
  const due = remittances(orders).map((r) => ({ courier: r.courier, count: r.orders.length, collected: r.collected, fees: r.fees, due: r.due, numbers: r.orders.map((o) => o.number) }));
  return (
    <>
      <div className="nx-head">
        <div><h1>Livraison</h1><p>Argent à recevoir des livreurs, villes, quartiers et frais affichés au client. Les partenaires se gèrent dans Paramètres.</p></div>
        <div className="actions"><Link href={`${base}/livraison?ville=nouvelle#ville`} className="nx-btn dark"><Icon name="plus" size={16} /> Ajouter une ville</Link></div>
      </div>
      <section className="nx-panel">
        <header><span className="nx-label">À recevoir des livreurs</span>{due.length > 0 && <span className="nx-pill wait">{xaf(due.reduce((s, r) => s + r.due, 0))}</span>}</header>
        <div className="nx-card flush"><Remittances storeSlug={store.slug} rows={due} /></div>
      </section>
      <div className="nx-grid form">
        <section className="nx-panel">
          <header><span className="nx-label">Villes desservies</span></header>
          <div className="nx-card flush">
            <div className="nx-tablewrap">
              <table className="nx-table">
                <thead><tr><th scope="col">Ville</th><th scope="col" className="right">Frais</th><th scope="col">Délai</th><th scope="col" className="right">Quartiers</th><th scope="col">Statut</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {cities.map((c) => (
                    <tr key={c.id}>
                      <td><strong style={{ fontWeight: 500 }}>{c.name}</strong></td>
                      <td className="right mono">{c.fee ? xaf(c.fee) : "Offerte"}</td>
                      <td className="muted">{etaText(c.etaMin, c.etaMax)}</td>
                      <td className="right mono">{c.neighborhoods.length || "—"}</td>
                      <td>{c.active ? <span className="nx-pill ok">Active</span> : <span className="nx-pill off">Désactivée</span>}</td>
                      <td><Link href={`${base}/livraison?ville=${c.id}#ville`} className="nx-btn sm">Modifier</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section className="nx-panel" id="ville">
          <header><span className="nx-label">{city ? `Modifier : ${city.name}` : "Nouvelle ville"}</span></header>
          <div className="nx-card">
            <ActionForm key={city?.id ?? "nouvelle"} action={saveCity.bind(null, store.slug)}>
              <input type="hidden" name="id" value={city?.id ?? ""} />
              <label className="nx-field"><span>Ville</span><input className="nx-input" name="name" defaultValue={city?.name ?? ""} required maxLength={60} /></label>
              <label className="nx-field"><span>Frais facturés au client (FCFA)</span><input className="nx-input mono" name="fee" inputMode="numeric" defaultValue={city?.fee ?? 0} /><small>0 = livraison offerte.</small></label>
              <div className="nx-grid half">
                <label className="nx-field"><span>Délai min. (minutes)</span><input className="nx-input mono" name="etaMin" inputMode="numeric" defaultValue={city?.etaMin ?? 60} /></label>
                <label className="nx-field"><span>Délai max. (minutes)</span><input className="nx-input mono" name="etaMax" inputMode="numeric" defaultValue={city?.etaMax ?? 90} /></label>
              </div>
              <label className="nx-check"><input type="checkbox" name="active" defaultChecked={city?.active ?? true} /> Ville proposée aux clients</label>
              <label className="nx-field"><span>Quartiers (un par ligne)</span><textarea className="nx-textarea" name="neighborhoods" defaultValue={city?.neighborhoods.join("\n") ?? ""} /><small>Proposés pendant la saisie ; le client peut aussi écrire un autre quartier.</small></label>
            </ActionForm>
          </div>
        </section>
      </div>
    </>
  );
}

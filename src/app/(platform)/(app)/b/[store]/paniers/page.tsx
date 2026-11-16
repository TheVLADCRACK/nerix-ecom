import { CartConvert } from "@/components/platform/cart-convert";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Kpi } from "@/components/platform/ui";
import { Icon } from "@/components/ui/icons";
import { displayPhone, nf, xaf } from "@/lib/format";
import { getCarts } from "@/server/repo";

import { lineList, waLink, waText } from "@/lib/wa";

export const metadata = { title: "Paniers abandonnés" };

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });

export default async function Carts({ params }: StoreParams) {
  const { store, base } = await loadStore(params);
  const carts = await getCarts(store);
  const todo = carts.filter((c) => c.status !== "ordered");
  const recovered = carts.filter((c) => c.status === "ordered");
  const rate = carts.length ? Math.round((recovered.length / carts.length) * 100) : 0;
  return (
    <>
      <div className="nx-head"><div><h1>Paniers abandonnés</h1><p>Clients qui ont commencé le formulaire de commande sans le valider (enregistré dès que le numéro est saisi). Une alerte arrive après leur dernière saisie. Contactez-les par WhatsApp, puis convertissez le panier en commande s'ils confirment.</p></div></div>
      <div className="nx-grid k4">
        <Kpi label="À convertir" value={String(todo.length)} unit="paniers" tone={todo.length ? "bad" : "ok"} delta="60 derniers jours" />
        <Kpi label="Valeur non commandée" value={nf(todo.reduce((s, c) => s + c.total, 0))} unit="FCFA" delta={`${todo.length} paniers`} />
        <Kpi label="Paniers transformés" value={String(recovered.length)} unit="commandes" delta={`${rate} % des paniers commencés`} />
      </div>
      <section className="nx-panel">
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead><tr><th scope="col">Dernière saisie</th><th scope="col">Client</th><th scope="col">Ville</th><th scope="col">Articles</th><th scope="col" className="right">Total</th><th scope="col">Statut</th><th scope="col"><span className="sr-only">Contacter</span></th></tr></thead>
              <tbody>
                {carts.length === 0 && <tr><td colSpan={7} className="muted" style={{ padding: 20 }}>Aucun panier pour l'instant.</td></tr>}
                {carts.map((c) => {
                  const [prenom = "", ...rest] = c.name.split(" ");
                  const wa = waLink(c.phone, waText(store.settings.wa.cart, { prenom, nom: rest.join(" "), numero: "", articles: lineList(c.lines), total: c.total, ville: c.city, boutique: store.name }));
                  return (
                    <tr key={c.id}>
                      <td className="muted">{when(c.updatedAt)}</td>
                      <td><strong style={{ fontWeight: 500 }}>{c.name}</strong><br /><small className="mono muted">{c.phone ? displayPhone(c.phone) : "—"}</small></td>
                      <td className="muted">{c.city || "—"}</td>
                      <td>{c.lines.map((l) => `${l.name} × ${l.quantity}`).join(", ")}</td>
                      <td className="right mono">{xaf(c.total)}</td>
                      <td>{c.status === "ordered" ? <a className="nx-pill ok" href={`${base}/commandes/${c.orderNumber}`}>Commandé {c.orderNumber}</a> : <CartConvert storeSlug={store.slug} base={base} id={c.id} name={c.name} />}</td>
                      <td>{c.status !== "ordered" && c.phone && <a className="nx-btn ghost" href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Écrire à ${c.name} sur WhatsApp`}><Icon name="message" size={15} /> WhatsApp</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

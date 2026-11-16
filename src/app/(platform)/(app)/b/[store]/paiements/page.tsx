import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { PayPill } from "@/components/platform/ui";
import { Icon } from "@/components/ui/icons";
import { dateTimeFr, xaf } from "@/lib/format";
import { onlinePayEnabled } from "@/lib/env";

export const metadata = { title: "Paiements" };

export default async function Payments({ params }: StoreParams) {
  const { orders } = await loadStore(params);
  const online = onlinePayEnabled(); // statut seulement, aucune valeur affichée
  const recent = orders.filter((o) => o.paymentStatus === "paid").slice(0, 10);
  return (
    <>
      <div className="nx-head"><div><h1>Paiements</h1><p>Moyens de paiement proposés aux clients et encaissements.</p></div></div>
      <div className="nx-grid half">
        <section className="nx-panel">
          <header><span className="nx-label">Paiement à la livraison</span><span className="nx-pill ok">Actif</span></header>
          <div className="nx-card nx-grid">
            <p style={{ color: "var(--nx-muted)" }}>Le client paie en espèces au livreur. Les montants encaissés et les reversements des livreurs sont suivis dans les commandes.</p>
          </div>
        </section>
        <section className="nx-panel">
          <header><span className="nx-label">Paiement en ligne (KPay)</span>{online ? <span className="nx-pill ok">Actif</span> : <span className="nx-pill wait">Clés à renseigner</span>}</header>
          <div className="nx-card nx-grid">
            <p style={{ color: "var(--nx-muted)", fontSize: 13 }}>Orange Money, MTN MoMo et carte bancaire, sur la page sécurisée KPay. La boutique affiche le prix sans frais ; la commission KPay est retenue sur le montant reçu. La commande passe en « Payée » après le webhook signé et la vérification auprès de KPay.</p>
            {!online && <p className="nx-alert">Renseignez <code>KPAY_API_KEY</code>, <code>KPAY_SECRET_KEY</code> et <code>KPAY_WEBHOOK_SECRET</code> dans le fichier d'environnement. URL de webhook à déclarer dans KPay : <code>https://ecom.nerix.site/api/webhooks/kpay</code>.</p>}
          </div>
        </section>
      </div>
      <section className="nx-panel">
        <header><span className="nx-label">Derniers encaissements</span></header>
        <div className="nx-card flush">
          <table className="nx-table">
            <thead><tr><th scope="col">Commande</th><th scope="col">Moyen</th><th scope="col">Date</th><th scope="col">Statut</th><th scope="col" className="right">Montant</th></tr></thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.number}</td>
                  <td>{o.paymentMethod === "cod" ? <><Icon name="cash" size={15} /> Espèces</> : <><Icon name="phone" size={15} /> {o.paymentMethod === "card" ? "Carte" : "Mobile Money"}</>}</td>
                  <td className="muted">{dateTimeFr(o.placedAt)}</td>
                  <td><PayPill s={o.paymentStatus} /></td>
                  <td className="right mono">{xaf(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

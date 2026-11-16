import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDelivery } from "@/components/platform/order-delivery";
import { loadStore } from "@/components/platform/store-ctx";
import { lotFor, unitCost } from "@/lib/finance";
import { OrderPill, PayPill, ShipPill } from "@/components/platform/ui";
import { Icon } from "@/components/ui/icons";
import { OrderMenu } from "@/components/platform/order-menu";
import { getOrderEvents } from "@/server/repo";
import { ActionForm } from "@/components/platform/action-form";
import { saveOrderNote } from "@/server/actions/manage";
import { PAY_LABEL } from "@/lib/payment";
import { lineList, waLink, waText } from "@/lib/wa";
import { dateTimeFr, displayPhone, feeText, xaf } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  return { title: (await params).number };
}

export default async function OrderDetail({ params }: { params: Promise<{ store: string; number: string }> }) {
  const { store, base, allOrders: orders, books, lists } = await loadStore(params);
  const { number } = await params;
  const o = orders.find((x) => x.number === number);
  if (!o) notFound();
  const events = await getOrderEvents(store.id, o.id);
  // Messages WhatsApp en un clic, à partir des modèles de la boutique (Paramètres).
  const vars = { prenom: o.customer.firstName === "Client" ? "" : o.customer.firstName, nom: o.customer.lastName, numero: o.number, articles: lineList(o.lines), total: o.total, ville: o.city, boutique: store.name };
  const wa = waLink(o.customer.phone, `Bonjour ${vars.prenom}, ici ${store.name} au sujet de votre commande ${o.number}.`);
  const confirmWa = o.customer.phone ? waLink(o.customer.phone, waText(store.settings.wa.confirm, vars)) : null;
  const shipWa = waLink(o.customer.phone, waText(store.settings.wa.ship, vars));
  const doneWa = waLink(o.customer.phone, waText(store.settings.wa.delivered, vars));
  const cost = o.lines.reduce((s, l) => { const lot = lotFor(books, l.sku, l.name); return s + (lot ? unitCost(lot) * l.quantity : 0); }, 0);
  return (
    <>
      <div className="nx-head">
        <Link href={`${base}/commandes`} className="nx-btn icon" aria-label="Retour aux commandes"><Icon name="arrowLeft" size={16} /></Link>
        <div>
          <h1 className="mono" style={{ fontWeight: 500 }}>{o.number}</h1>
          <p>Passée le {dateTimeFr(o.placedAt)} · {PAY_LABEL[o.paymentMethod]}{o.archived ? " · archivée (hors statistiques)" : ""}</p>
        </div>
        <div className="actions">
          <OrderMenu storeSlug={store.slug} base={base} number={o.number} archived={!!o.archived} editable={!o.archived && ["pending", "confirmed", "processing", "packed"].includes(o.status)} />
          <a className="nx-btn" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="message" size={16} /> WhatsApp</a>
          <a className="nx-btn" href={`tel:${o.customer.phone}`}><Icon name="phone" size={16} /> Appeler</a>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <OrderPill s={o.status} /><PayPill s={o.paymentStatus} /><ShipPill s={o.fulfillmentStatus} />
      </div>
      <div className="nx-grid form">
        <div className="nx-grid">
          <section className="nx-panel">
            <header><span className="nx-label">Articles</span></header>
            <div className="nx-card flush">
              <table className="nx-table">
                <thead><tr><th scope="col">Produit</th><th scope="col">SKU</th><th scope="col" className="right">Prix</th><th scope="col" className="right">Qté</th><th scope="col" className="right">Total</th></tr></thead>
                <tbody>
                  {o.lines.map((l) => (
                    <tr key={l.sku}>
                      <td style={{ whiteSpace: "normal" }}>{l.name}<div className="muted">{l.variant}</div></td>
                      <td className="mono muted">{l.sku}</td>
                      <td className="right mono">{xaf(l.unitPrice)}</td>
                      <td className="right mono">{l.quantity}</td>
                      <td className="right mono">{xaf(l.unitPrice * l.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="nx-dl" style={{ padding: 16, borderTop: "1px solid var(--nx-line)", gridTemplateColumns: "1fr auto" }}>
                <dt>Sous-total</dt><dd className="mono">{xaf(o.subtotal)}</dd>
                <dt>Livraison ({o.city})</dt><dd className="mono">{feeText(o.shipping)}</dd>
                {!!o.discount && <><dt>Remise</dt><dd className="mono">− {xaf(o.discount)}</dd></>}
                <dt><strong style={{ color: "var(--nx-ink)" }}>Total à encaisser</strong></dt><dd className="mono"><strong>{xaf(o.total)}</strong></dd>
              </dl>
            </div>
          </section>
          <section className="nx-panel">
            <header><span className="nx-label">Historique</span></header>
            <div className="nx-card">
              <ol className="nx-timeline">
                {events.map((e) => <li key={e.at + e.label}><div>{e.label}<small>{dateTimeFr(e.at)}</small></div></li>)}
              </ol>
              <ActionForm action={saveOrderNote.bind(null, store.slug, o.number)} submit="Enregistrer la note">
                <label className="nx-field" style={{ marginTop: 16 }}><span>Note interne</span><textarea className="nx-textarea" name="note" style={{ minHeight: 70 }} maxLength={1000} defaultValue={o.note} /></label>
              </ActionForm>
            </div>
          </section>
        </div>
        <div className="nx-grid">
          <section className="nx-panel">
            <header><span className="nx-label">Client</span></header>
            <div className="nx-card">
              <dl className="nx-dl">
                <dt>Nom</dt><dd>{o.customer.firstName} {o.customer.lastName}</dd>
                <dt>Téléphone</dt><dd className="mono">{displayPhone(o.customer.phone)}</dd>
              </dl>
            </div>
          </section>
          <section className="nx-panel">
            <header><span className="nx-label">Suivi et livraison</span></header>
            <div className="nx-card" style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingBottom: 0 }}>
              {confirmWa && <a className="nx-btn sm" href={confirmWa} target="_blank" rel="noopener noreferrer"><Icon name="message" size={14} /> Confirmation</a>}
              <a className="nx-btn sm" href={shipWa} target="_blank" rel="noopener noreferrer"><Icon name="truck" size={14} /> En route</a>
              <a className="nx-btn sm" href={doneWa} target="_blank" rel="noopener noreferrer"><Icon name="check" size={14} /> Livrée</a>
            </div>
            <OrderDelivery storeSlug={store.slug} number={o.number} status={o.status} courier={o.courier} fee={o.courierFee} discount={o.discount} deliveredAt={o.deliveredAt} couriers={lists.couriers} reasons={lists.cancelReasons} subtotal={o.subtotal} cost={cost} whatsapp={confirmWa} />
          </section>
          <section className="nx-panel">
            <header><span className="nx-label">Adresse</span></header>
            <div className="nx-card">
              <dl className="nx-dl">
                <dt>Ville</dt><dd>{o.city}</dd>
                <dt>Quartier</dt><dd>{o.neighborhood || "—"}</dd>
                <dt>Repère</dt><dd>{o.landmark || "—"}</dd>
              </dl>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

import { ActionForm } from "@/components/platform/action-form";
import { LogoUpload } from "@/components/platform/image-upload";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { displayPhone } from "@/lib/format";
import { saveStoreSettings } from "@/server/actions/settings";

export const metadata = { title: "Paramètres de la boutique" };

export default async function StoreSettings({ params }: StoreParams) {
  const { store, books, lists } = await loadStore(params);
  const c = store.contact;
  return (
    <>
      <div className="nx-head"><div><h1>Paramètres</h1><p>Identité, coordonnées et réglages de gestion de {store.name}.</p></div></div>
      <div className="nx-grid form">
        <ActionForm action={saveStoreSettings.bind(null, store.slug)}>
          <section className="nx-panel">
            <header><span className="nx-label">Général</span></header>
            <div className="nx-card nx-grid">
              <label className="nx-field"><span>Nom de la boutique</span><input className="nx-input" name="name" defaultValue={store.name} required maxLength={60} /></label>
              <label className="nx-field"><span>Slogan</span><input className="nx-input" name="tagline" defaultValue={store.tagline} maxLength={120} /></label>
              <label className="nx-field"><span>Statut</span><select className="nx-select" name="status" defaultValue={store.status}><option value="active">En ligne</option><option value="draft">Brouillon (invisible au public)</option></select></label>
              <div className="nx-field"><span>Adresse</span><span className="mono" style={{ color: "var(--nx-blue)" }}>{store.slug}.ecom.nerix.site</span></div>
            </div>
          </section>
          <section className="nx-panel">
            <header><span className="nx-label">Coordonnées affichées</span></header>
            <div className="nx-card nx-form-grid">
              <label className="nx-field"><span>Téléphone</span><input className="nx-input mono" name="phone" inputMode="tel" defaultValue={c.phone ? displayPhone(c.phone) : ""} placeholder="6 90 00 00 00" /></label>
              <label className="nx-field"><span>WhatsApp</span><input className="nx-input mono" name="whatsapp" inputMode="tel" defaultValue={c.whatsapp ? displayPhone(c.whatsapp) : ""} placeholder="6 90 00 00 00" /></label>
              <label className="nx-field"><span>Email</span><input className="nx-input" name="email" type="email" defaultValue={c.email} placeholder="Facultatif" /></label>
              <label className="nx-field"><span>Horaires</span><input className="nx-input" name="hours" defaultValue={c.hours} maxLength={80} /></label>
              <label className="nx-field"><span>Facebook</span><input className="nx-input" name="facebook" type="url" defaultValue={store.social.facebook} placeholder="https://facebook.com/…" /></label>
              <label className="nx-field"><span>Instagram</span><input className="nx-input" name="instagram" type="url" defaultValue={store.social.instagram} placeholder="https://instagram.com/…" /></label>
              <label className="nx-field"><span>TikTok</span><input className="nx-input" name="tiktok" type="url" defaultValue={store.social.tiktok} placeholder="https://tiktok.com/@…" /></label>
            </div>
          </section>
          <section className="nx-panel">
            <header><span className="nx-label">Gestion</span></header>
            <div className="nx-card nx-grid">
              <div className="nx-form-grid">
                <label className="nx-field"><span>Taux euro → FCFA</span><input className="nx-input mono" name="eurRate" defaultValue={books.eurRate} inputMode="decimal" /><small>Convertit les budgets publicitaires payés en euros.</small></label>
                <label className="nx-field"><span>Impôt sur le bénéfice (%)</span><input className="nx-input mono" name="taxRate" defaultValue={Math.round(books.taxRate * 100)} inputMode="numeric" /></label>
                <label className="nx-field"><span>Seuil de stock faible</span><input className="nx-input mono" name="lowStock" defaultValue={books.lowStock} inputMode="numeric" /><small>Alerte dans « À traiter » en dessous.</small></label>
                <label className="nx-field"><span>Frais de retrait (%)</span><input className="nx-input mono" name="withdrawRate" defaultValue={String(store.settings.withdrawRate * 100).replace(".", ",")} inputMode="decimal" /><small>Sur tout l'argent encaissé, quel que soit le moyen de paiement.</small></label>
                <label className="nx-field"><span>Taxe de l'État par commande (FCFA)</span><input className="nx-input mono" name="stateTax" defaultValue={store.settings.stateTax} inputMode="numeric" /><small>Déduite à chaque commande payée, comptée dans les impôts.</small></label>
                <label className="nx-field"><span>Alerte panier abandonné après (minutes)</span><input className="nx-input mono" name="cartDelay" defaultValue={store.settings.cartDelay} inputMode="numeric" /></label>
              </div>
              <label className="nx-field"><span>Partenaires de livraison (un par ligne)</span><textarea className="nx-textarea" name="couriers" defaultValue={lists.couriers.join("\n")} /><small>« Moi » est un livreur comme les autres : ses frais de livraison sont saisis à chaque commande et comptent dans les charges.</small></label>
              <label className="nx-field"><span>Catégories de dépenses (une par ligne)</span><textarea className="nx-textarea" name="chargeCategories" defaultValue={lists.chargeCategories.join("\n")} /></label>
            </div>
          </section>
          <section className="nx-panel">
            <header><span className="nx-label">Messages WhatsApp en un clic</span></header>
            <div className="nx-card nx-grid">
              <p className="muted" style={{ fontSize: 13 }}>Variables remplacées automatiquement : <code>{"{prenom}"}</code> <code>{"{nom}"}</code> <code>{"{numero}"}</code> <code>{"{articles}"}</code> <code>{"{total}"}</code> <code>{"{ville}"}</code> <code>{"{boutique}"}</code>. Laissez vide pour revenir au message par défaut.</p>
              <label className="nx-field"><span>Confirmation de commande</span><textarea className="nx-textarea" name="waConfirm" defaultValue={store.settings.wa.confirm} maxLength={1000} /></label>
              <label className="nx-field"><span>Commande en route</span><textarea className="nx-textarea" name="waShip" defaultValue={store.settings.wa.ship} maxLength={1000} /></label>
              <label className="nx-field"><span>Commande livrée</span><textarea className="nx-textarea" name="waDelivered" defaultValue={store.settings.wa.delivered} maxLength={1000} /></label>
              <label className="nx-field"><span>Relance de panier abandonné</span><textarea className="nx-textarea" name="waCart" defaultValue={store.settings.wa.cart} maxLength={1000} /></label>
            </div>
          </section>
        </ActionForm>
        <div className="nx-grid" style={{ alignContent: "start" }}>
          <section className="nx-panel">
            <header><span className="nx-label">Logo et favicon</span></header>
            <div className="nx-card"><LogoUpload storeSlug={store.slug} logo={store.logo} /></div>
          </section>
        </div>
      </div>
    </>
  );
}

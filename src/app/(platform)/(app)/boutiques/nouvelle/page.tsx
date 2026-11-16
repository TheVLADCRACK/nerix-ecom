import { requireStaff } from "@/server/auth";
import Link from "next/link";
import { ActionForm } from "@/components/platform/action-form";
import { createStore } from "@/server/actions/settings";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Nouvelle boutique" };

const THEMES = [
  { key: "or", name: "Noir et or", colors: ["#0c0c0c", "#d6ad45", "#ffffff"] },
  { key: "bleu", name: "Océan", colors: ["#0b1020", "#3b5bdb", "#ffffff"] },
  { key: "vert", name: "Nature", colors: ["#0b1712", "#2f9e6a", "#ffffff"] },
];

export default async function NewStore() {
  await requireStaff();
  return (
    <>
      <div className="nx-head">
        <Link href="/boutiques" className="nx-btn icon" aria-label="Retour"><Icon name="arrowLeft" size={16} /></Link>
        <div><h1>Créer une boutique</h1><p>Trois informations suffisent ; tout se modifie ensuite dans l'éditeur.</p></div>
      </div>
      <div className="nx-grid form">
        <section className="nx-panel">
          <header><span className="nx-label">1. Identité</span></header>
          <div className="nx-card">
           <ActionForm action={createStore} submit="Créer la boutique">
            <label className="nx-field"><span>Nom de la boutique</span><input className="nx-input" name="name" placeholder="Ex. Maison Plus" required maxLength={60} /></label>
            <label className="nx-field">
              <span>Adresse web</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input className="nx-input mono" name="slug" placeholder="maisonplus" pattern="[a-z0-9-]{2,40}" style={{ maxWidth: 220 }} required />
                <span className="mono" style={{ color: "var(--nx-muted)" }}>.ecom.nerix.site</span>
              </div>
            </label>
            <div className="nx-field">
              <span>2. Thème de départ</span>
              <div className="nx-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                {THEMES.map((t, i) => (
                  <label key={t.key} className="nx-card" style={{ display: "grid", gap: 8, cursor: "pointer", padding: 12 }}>
                    <span style={{ display: "flex", gap: 4 }}>{t.colors.map((c) => <i key={c} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: "1px solid var(--nx-line)" }} />)}</span>
                    <span className="nx-check"><input type="radio" name="theme" value={t.key} defaultChecked={i === 0} /> {t.name}</span>
                  </label>
                ))}
              </div>
            </div>
           </ActionForm>
          </div>
        </section>
        <section className="nx-panel">
          <header><span className="nx-label">Ce qui est créé</span></header>
          <div className="nx-card">
            <ol className="nx-timeline">
              <li><div>Une page d'accueil (bannière et grille de produits)<small>Modifiable dans l'éditeur</small></div></li>
              <li><div>Une catégorie « Général »<small>Ajoutez vos produits, puis vos achats pour le stock</small></div></li>
              <li><div>Le logo, les coordonnées et les réglages<small>Dans Paramètres, juste après la création</small></div></li>
              <li><div>Une boutique en brouillon, invisible au public<small>Vous la mettez en ligne quand elle est prête</small></div></li>
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}

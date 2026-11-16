import { requireStaff } from "@/server/auth";
import { signOutEverywhereAction } from "@/server/auth-actions";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Paramètres" };

export default async function PlatformSettings() {
  await requireStaff();
  return (
    <>
      <div className="nx-head">
        <div><h1>Paramètres de la plateforme</h1><p>Réglages communs à toutes les boutiques.</p></div>
        <div className="actions"><button className="nx-btn dark" type="button"><Icon name="check" size={16} /> Enregistrer</button></div>
      </div>
      <div className="nx-grid half">
        <section className="nx-panel">
          <header><span className="nx-label">Outil</span></header>
          <div className="nx-card nx-grid">
            <label className="nx-field"><span>Nom de l'outil</span><input className="nx-input" defaultValue="Nerix Ecom" /></label>
            <label className="nx-field"><span>Domaine des boutiques</span><input className="nx-input mono" defaultValue="ecom.nerix.site" /><small>Chaque boutique est servie sur sous-domaine.ecom.nerix.site.</small></label>
            <label className="nx-field"><span>Fuseau horaire</span><select className="nx-select" defaultValue="Africa/Douala"><option value="Africa/Douala">Afrique/Douala (UTC+1)</option></select></label>
            <label className="nx-field"><span>Devise par défaut</span><select className="nx-select" defaultValue="XAF"><option value="XAF">Franc CFA (XAF)</option></select></label>
          </div>
        </section>
        <section className="nx-panel">
          <header><span className="nx-label">Sécurité</span></header>
          <div className="nx-card nx-grid">
            <div className="nx-alert">Session maintenue sur chaque appareil connecté, sans déconnexion pour inactivité. Elle prend fin à la déconnexion manuelle, à la désactivation du compte ou avec « Déconnecter tous les appareils ».</div>
            <form action={signOutEverywhereAction}><button className="nx-btn" type="submit">Déconnecter tous les appareils</button></form>
            <label className="nx-check"><input type="checkbox" defaultChecked /> Blocage temporaire après 5 échecs de connexion</label>
            <label className="nx-check"><input type="checkbox" defaultChecked /> Journal d'audit des actions sensibles</label>
            <div className="nx-alert">La double authentification sera activée dès qu'elle sera disponible dans Neon Auth.</div>
          </div>
        </section>
      </div>
    </>
  );
}

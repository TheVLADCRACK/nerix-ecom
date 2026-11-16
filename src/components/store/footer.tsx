import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import type { Store } from "@/lib/types";

/** Pied de page du modèle Shop + couche de confiance (moyens de paiement, liens de politique). */
export function StoreFooter({ store, base }: { store: Store; base: string }) {
  const col = (title: string, items: [string, string][]) => (
    <div>
      <h2>{title}</h2>
      <ul>{items.map(([label, href]) => <li key={href + label}><Link href={`${base}${href}`}>{label}</Link></li>)}</ul>
    </div>
  );
  const social = ([["facebook", store.social.facebook], ["instagram", store.social.instagram], ["tiktok", store.social.tiktok]] as const).filter(([, url]) => /^https:\/\//.test(url));
  return (
    <footer className="sf-footer">
      <div className="sf-wrap">
        <div className="cols">
          {col("À propos", [["Blog", "/blog"], ["Qui sommes-nous", "/a-propos"], ["Contact", "/contact"]])}
          {col("Aide", [["Livraison", "/livraison"], ["Paiement", "/paiement"], ["Retours", "/retours"], ["FAQ", "/faq"]])}
          {col("Commande", [["Suivre ma commande", "/suivi-commande"], ["Shop", "/shop"], ["Panier", "/panier"]])}
          <div className="sf-social">
            {social.length > 0 && (
              <>
                <small>Réseaux sociaux</small>
                <div>{social.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name}><Icon name={name} size={16} /></a>)}</div>
              </>
            )}
            <small style={{ marginTop: social.length ? 16 : 0 }}>Paiements acceptés</small>
            <div className="sf-paylogos"><span>Espèces à la livraison</span><span>Orange Money</span><span>MTN MoMo</span></div>
          </div>
        </div>
        <div className="bottom">
          <span>© {new Date().getFullYear()} {store.name}. Tous droits réservés.</span>
          <nav aria-label="Informations légales">
            <Link href={`${base}/cgv`}>Conditions de vente</Link>
            <Link href={`${base}/confidentialite`}>Confidentialité</Link>
            <Link href={`${base}/mentions-legales`}>Mentions légales</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { loadFront } from "@/components/store/ctx";
import { SlipDownload } from "@/components/store/slip";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Commande confirmée", robots: { index: false } };

export default async function Confirmation({ params, searchParams }: { params: Promise<{ store: string; number: string }>; searchParams: Promise<{ t?: string }> }) {
  const { store, base } = await loadFront(params);
  const { number } = await params;
  // La page n'affiche que le numéro ; le statut de paiement exige le jeton secret reçu à la commande.
  if (!/^[A-Z]{1,3}-\d{4}-\d{6}$/.test(number)) notFound();
  const token = String((await searchParams).t ?? "").slice(0, 100);
  const wa = store.contact.whatsapp ? `https://wa.me/${store.contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour, je viens de passer la commande ${number}.`)}` : null;
  return (
    <div className="sf-page">
      <div className="sf-wrap" style={{ maxWidth: 760 }}>
        <div className="sf-panel sf-glass" style={{ textAlign: "center", justifyItems: "center", padding: "40px 24px" }}>
          <span style={{ width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--night)", color: "var(--accent)" }}><Icon name="check" size={26} /></span>
          <h1 className="sf-h" style={{ fontSize: "clamp(34px,5vw,52px)" }}>Merci, votre commande est enregistrée</h1>
          <p className="sf-muted">Numéro de commande</p>
          <strong style={{ fontSize: 22, letterSpacing: "0.04em" }}>{number}</strong>
          <div className="sf-steps" aria-label="Étapes">
            <span data-done="true">Commande reçue</span><span>Appel de confirmation</span><span>Livraison</span><span>Paiement</span>
          </div>
          <p className="sf-muted" style={{ maxWidth: "46ch" }}>Nous vous appelons pour confirmer votre commande et votre adresse. Gardez votre téléphone à portée de main. Téléchargez votre bordereau si vous le souhaitez : son numéro permet de suivre la commande.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <SlipDownload storeSlug={store.slug} number={number} token={token} />
            <Link href={`${base}/suivi-commande`} className="sf-btn primary">Suivre ma commande</Link>
            {wa && <a className="sf-btn outline" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="message" size={16} /> Écrire sur WhatsApp</a>}
            <Link href={`${base}/shop`} className="sf-btn outline">Continuer mes achats</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

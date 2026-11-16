"use client";
import { SubscribeForm } from "./subscribe-form";

/** Bandeau sombre du modèle Shop (« Ready to get our new stuff? ») : inscription WhatsApp avec consentement explicite. */
export function NewsBand({ storeName }: { storeName: string }) {
  return (
    <section className="sf-band sf-dark">
      <div>
        <h2 className="sf-t">Prêt à découvrir<br />nos nouveautés ?</h2>
        <SubscribeForm id="band-wa" button="Envoyer" />
      </div>
      <div>
        <h3>{storeName}, pour la maison et le quotidien</h3>
        <p className="sf-muted" style={{ fontSize: 14 }}>Nous choisissons peu de produits, utiles et vérifiés. Livraison en 1 h à 1 h 30 à Douala et Yaoundé, paiement à la réception.</p>
      </div>
    </section>
  );
}

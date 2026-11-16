"use client";
import Link from "next/link";
import { useStore } from "@/components/store/cart";
import { Icon } from "@/components/ui/icons";
import { xaf } from "@/lib/format";

export default function CartPage() {
  const { base, lines, subtotal, set } = useStore();
  return (
    <div className="sf-page">
      <div className="sf-wrap">
        <h1 className="sf-h">Panier</h1>
        {!lines.length ? (
          <div className="sf-empty sf-glass" style={{ marginTop: 24 }}>
            <Icon name="cart" size={28} />
            <strong>Votre panier est vide.</strong>
            <Link href={`${base}/shop`} className="sf-btn primary">Voir la boutique</Link>
          </div>
        ) : (
          <div className="sf-checkout">
            <section className="sf-panel sf-glass" aria-label="Articles">
              {lines.map((l) => (
                <div className="sf-line" key={l.sku}>
                  {l.image ? <img src={l.image} alt="" /> : <span />}
                  <div>
                    <Link href={`${base}/produits/${l.productSlug}`} style={{ fontWeight: 600 }}>{l.productName}</Link>
                    <div className="sf-muted" style={{ fontSize: 13 }}>{l.variantTitle} · {xaf(l.price)}</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                      <div className="sf-qty" role="group" aria-label={`Quantité de ${l.productName}`}>
                        <button onClick={() => set(l.sku, l.qty - 1)} aria-label="Diminuer">−</button>
                        <span>{l.qty}</span>
                        <button onClick={() => set(l.sku, l.qty + 1)} aria-label="Augmenter" disabled={l.qty >= Math.min(l.available, 5)}>+</button>
                      </div>
                      <button className="sf-btn sm outline" onClick={() => set(l.sku, 0)}>Retirer</button>
                    </div>
                  </div>
                  <strong className="sf-price">{xaf(l.price * l.qty)}</strong>
                </div>
              ))}
            </section>
            <aside className="sf-panel sf-glass" aria-label="Récapitulatif">
              <h2>Récapitulatif</h2>
              <div className="sf-sum">
                <span>Sous-total</span><span className="sf-price">{xaf(subtotal)}</span>
                <span className="sf-muted">Livraison</span><span className="sf-muted">Calculée à l'étape suivante</span>
              </div>
              <Link href={`${base}/commande`} className="sf-btn primary block">Passer la commande <Icon name="arrowRight" size={16} /></Link>
              <p className="sf-muted" style={{ fontSize: 13 }}>Pas de compte à créer. Vous payez à la livraison.</p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

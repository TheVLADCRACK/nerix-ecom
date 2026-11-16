"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { xaf } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useStore } from "./cart";
import { track } from "./tracking";

export function Gallery({ images }: { images: Product["images"] }) {
  const [i, setI] = useState(0);
  const cur = images[i];
  const go = (d: number) => setI((k) => (k + d + images.length) % images.length);
  return (
    <div className="sf-gallery">
      <div className="main sf-glass" style={{ position: "relative" }}>
        {cur && <img src={cur.src} srcSet={cur.srcSet} sizes="(max-width: 960px) 92vw, 640px" alt={cur.alt} width={cur.width} height={cur.height} fetchPriority={i === 0 ? "high" : "auto"} />}
        {images.length > 1 && (
          <div className="sf-arrows" style={{ position: "absolute", right: 14, bottom: 14 }}>
            <button onClick={() => go(-1)} aria-label="Photo précédente"><Icon name="arrowLeft" size={16} /></button>
            <button onClick={() => go(1)} aria-label="Photo suivante"><Icon name="arrowRight" size={16} /></button>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="thumbs" role="group" aria-label="Photos du produit">
          {images.map((im, k) => (
            <button key={k} aria-current={k === i} aria-label={`Photo ${k + 1} sur ${images.length}`} onClick={() => setI(k)}><img src={im.src} alt="" loading="lazy" /></button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Bloc d'achat : prix, version, quantité, deux CTA, délai par ville, et barre fixe sur mobile quand les CTA sortent de l'écran. */
/** Boutons affichés selon le modèle de page produit ; `shipNote` vient des villes desservies (frais et délais réels). */
export function BuyBox({ p, cart = true, direct = true, shipNote }: { p: Product; cart?: boolean; direct?: boolean; shipNote: string }) {
  const { base, add } = useStore();
  const router = useRouter();
  const [sku, setSku] = useState((p.variants.find((v) => v.available > 0) ?? p.variants[0]!).sku);
  const [qty, setQty] = useState(1);
  const [stuck, setStuck] = useState(false);
  const ctas = useRef<HTMLDivElement>(null);
  const v = p.variants.find((x) => x.sku === sku)!;
  const max = Math.min(v.available, 5);
  const out = v.available <= 0;
  const save = v.compareAt && v.compareAt > v.price ? v.compareAt - v.price : 0;

  useEffect(() => { track("ViewContent", { id: p.variants[0]!.sku, name: p.name, value: p.variants[0]!.price }); }, [p]);
  useEffect(() => {
    const el = ctas.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e!.isIntersecting && e!.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const addIt = () => { add(sku, qty); track("AddToCart", { id: sku, name: p.name, value: v.price * qty }); };
  // Achat direct : le formulaire de commande avec ce seul article, sans passer par le panier.
  const buyNow = () => router.push(`${base}/commande?article=${encodeURIComponent(sku)}&qte=${qty}`);

  return (
    <>
      <div className="sf-pricebox">
        {save > 0 && <span className="was">{xaf(v.compareAt!)}</span>}
        <span className="now">{xaf(v.price)}{save > 0 && <span className="sf-save">Économisez {xaf(save)}</span>}</span>
        <span className="sf-muted" style={{ fontSize: 13 }}>Payez à la livraison, après avoir vu votre colis.</span>
      </div>
      {p.variants.length > 1 && (
        <div>
          <div className="sf-optlabel">Version : <span className="sf-muted" style={{ fontWeight: 500 }}>{v.title}</span></div>
          <div className="sf-variants" role="group" aria-label="Version">
            {p.variants.map((x) => (
              <button key={x.sku} aria-pressed={x.sku === sku} disabled={x.available <= 0} onClick={() => { setSku(x.sku); setQty(1); }}>{x.title}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div className="sf-qty" role="group" aria-label="Quantité">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Diminuer" disabled={qty <= 1}>−</button>
          <span aria-live="polite">{qty}</span>
          <button onClick={() => setQty(Math.min(max, qty + 1))} aria-label="Augmenter" disabled={qty >= max}>+</button>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: out ? "var(--badge)" : "var(--ok)" }}>
          {out ? "Épuisé pour le moment" : v.available <= 5 ? `Plus que ${v.available} en stock` : "En stock, prêt à partir"}
        </span>
      </div>
      <div className="sf-ctas" ref={ctas}>
        {cart && <button className="sf-btn gold lg block" disabled={out} onClick={addIt}><Icon name="cart" size={18} /> Ajouter au panier</button>}
        {direct && <button className="sf-btn primary lg block" disabled={out} onClick={buyNow}>Acheter maintenant <Icon name="arrowRight" size={16} /></button>}
        {shipNote && <p className="sf-ship">{shipNote}</p>}
      </div>
      <div className="sf-sticky" hidden={!stuck || out}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
          <div className="sf-price" style={{ fontWeight: 700 }}>{xaf(v.price)}</div>
        </div>
        {direct ? <button className="sf-btn gold" onClick={buyNow}>Acheter maintenant</button> : <button className="sf-btn gold" onClick={addIt}>Ajouter au panier</button>}
      </div>
    </>
  );
}

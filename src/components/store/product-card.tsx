"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { xaf } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useStore } from "./cart";
import { track } from "./tracking";

/** Carte produit du modèle Shop : vignette centrée (image entière), étiquette, nom, prix, « Ajouter » + « Acheter ». */
export function ProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  const { base, add } = useStore();
  const router = useRouter();
  const first = p.variants.find((v) => v.available > 0) ?? p.variants[0]!;
  const min = Math.min(...p.variants.map((v) => v.price));
  const compare = p.variants.find((v) => v.price === min)?.compareAt ?? null;
  const soldOut = p.variants.every((v) => v.available <= 0);
  const href = `${base}/produits/${p.slug}`;
  const img = p.images[0];
  const addIt = () => { add(first.sku); track("AddToCart", { id: first.sku, name: p.name, value: first.price }); };
  return (
    <article className="sf-card">
      <Link href={href} className="sf-tile" aria-label={p.name}>
        {img && <img src={img.src} srcSet={img.srcSet} sizes="(max-width: 520px) 46vw, (max-width: 960px) 46vw, 300px" alt={img.alt} width={img.width} height={img.height} loading={priority ? "eager" : "lazy"} />}
        <span className={`sf-chip${soldOut ? " dark" : ""}`}>{soldOut ? "Épuisé" : p.tag}</span>
      </Link>
      <h3><Link href={href}>{p.name}</Link></h3>
      <div className="meta">
        <small>{soldOut ? "Bientôt de retour" : p.variants.length > 1 ? `${p.variants.length} versions · en stock` : "En stock"}</small>
        <span className="sf-price">{p.variants.length > 1 && <span style={{ fontWeight: 500, fontSize: 12, color: "var(--muted)" }}>dès </span>}{xaf(min)}{compare && <s>{xaf(compare)}</s>}</span>
      </div>
      <div className="buttons">
        <button className="sf-btn light" disabled={soldOut} onClick={addIt}>Ajouter</button>
        <button className="sf-btn primary" disabled={soldOut} onClick={() => { router.push(`${base}/commande?article=${encodeURIComponent(first.sku)}&qte=1`); }}>Acheter</button>
      </div>
    </article>
  );
}

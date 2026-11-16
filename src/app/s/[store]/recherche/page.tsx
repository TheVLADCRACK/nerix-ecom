import Link from "next/link";
import { loadFront, type FrontParams } from "@/components/store/ctx";
import { ProductCard } from "@/components/store/product-card";

export const metadata = { title: "Recherche", robots: { index: false } };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function Search({ params, searchParams }: FrontParams & { searchParams: Promise<{ q?: string }> }) {
  const { base, data } = await loadFront(params);
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  // Étape B : recherche plein texte PostgreSQL (français, sans accents, tolérante aux fautes).
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const results = terms.length ? data.products.filter((p) => terms.every((t) => norm(`${p.name} ${p.short} ${p.tag}`).includes(t))) : [];
  return (
    <div className="sf-page">
      <div className="sf-wrap">
        <h1 className="sf-h">Recherche</h1>
        <form role="search" style={{ display: "flex", gap: 8, margin: "20px 0 28px", maxWidth: 560 }}>
          <label className="sr-only" htmlFor="q">Rechercher un produit</label>
          <input id="q" className="sf-input" name="q" defaultValue={q} placeholder="Powerbank, lampe, sérum…" autoFocus />
          <button className="sf-btn primary" type="submit">Rechercher</button>
        </form>
        {q && <p className="sf-muted" style={{ marginBottom: 18 }}>{results.length} résultat{results.length > 1 ? "s" : ""} pour « {q} »</p>}
        {results.length ? (
          <div className="sf-grid">{results.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        ) : q ? (
          <div className="sf-empty sf-glass"><strong>Aucun produit ne correspond.</strong><Link href={`${base}/shop`} className="sf-btn outline">Voir tous les produits</Link></div>
        ) : null}
      </div>
    </div>
  );
}

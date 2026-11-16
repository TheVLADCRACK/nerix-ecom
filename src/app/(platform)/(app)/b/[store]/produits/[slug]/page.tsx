import { notFound } from "next/navigation";
import { loadStore } from "@/components/platform/store-ctx";
import { ProductEditor } from "@/components/platform/product-editor";
import { ProductBlocksEditor } from "@/components/platform/product-page-editor";
import Link from "next/link";
import { stockLeft } from "@/lib/finance";

export async function generateMetadata({ params }: { params: Promise<{ store: string; slug: string }> }) {
  const { slug } = await params;
  if (slug === "nouveau") return { title: "Nouveau produit" };
  const { products } = await loadStore(params);
  return { title: products.find((x) => x.slug === slug)?.name ?? "Produit" };
}

export default async function ProductEdit({ params }: { params: Promise<{ store: string; slug: string }> }) {
  const { store, base, products, categories, books, orders } = await loadStore(params);
  const { slug } = await params;
  const isNew = slug === "nouveau";
  const p = isNew ? null : (products.find((x) => x.slug === slug) ?? null);
  if (!isNew && !p) notFound();
  // Produits mis en stock (achats), un par nom, avec leur stock restant et les SKU déjà rattachés.
  const stockItems = [...new Map(books.lots.map((l) => [l.product, l])).values()]
    .map((l) => ({ product: l.product, skus: [...new Set(books.lots.filter((x) => x.product === l.product).flatMap((x) => x.skus))], left: stockLeft(orders, books, l) }))
    .sort((a, b) => a.product.localeCompare(b.product, "fr"));
  return (
    <>
      <ProductEditor storeSlug={store.slug} base={base} product={p} categories={categories} stockItems={stockItems} />
      {p && <ProductBlocksEditor key={p.slug} storeSlug={store.slug} productSlug={p.slug} initial={p.body} images={p.images.map(({ src, alt }) => ({ src, alt }))} />}
      {p && <p className="muted" style={{ fontSize: 13 }}>Ordre des sections, boutons d'achat et garanties communs à tous les produits : <Link href={`${base}/editeur/produit`} style={{ color: "var(--nx-blue)" }}>modèle de page produit</Link>.</p>}
      {p && p.specs.length > 0 && (
        <section className="nx-panel">
          <header><span className="nx-label">Caractéristiques (avec source)</span></header>
          <div className="nx-card flush">
            <div className="nx-tablewrap">
              <table className="nx-table">
                <thead><tr><th scope="col">Libellé</th><th scope="col">Valeur</th><th scope="col">Source</th></tr></thead>
                <tbody>{p.specs.map((s) => <tr key={s.label}><td>{s.label}</td><td style={{ whiteSpace: "normal" }}>{s.value}</td><td className="muted" style={{ whiteSpace: "normal", maxWidth: 260, fontSize: 12 }}>{s.source}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

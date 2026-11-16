import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadFront } from "@/components/store/ctx";
import { ProductCard } from "@/components/store/product-card";
import { getPostBySlug } from "@/server/repo";
import { dateFr } from "@/lib/format";

type P = { params: Promise<{ store: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { store } = await loadFront(params);
  const post = await getPostBySlug(store.id, (await params).slug);
  return post && post.status === "published" ? { title: post.title, description: post.excerpt.slice(0, 160), openGraph: { type: "article", title: post.title } } : {};
}

export default async function Article({ params }: P) {
  const { base, data, store } = await loadFront(params);
  const post = await getPostBySlug(store.id, (await params).slug);
  if (!post || post.status !== "published" || post.publishedAt > new Date().toISOString()) notFound();
  const products = data.products.filter((p) => post.productSlugs.includes(p.slug));
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: post.title, datePublished: post.publishedAt, author: { "@type": "Organization", name: store.name } };
  return (
    <div className="sf-wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article className="sf-article">
        <Link href={`${base}/blog`} className="sf-muted" style={{ fontSize: 14 }}>← Tous les articles</Link>
        <div className="sf-eyebrow" style={{ marginTop: 20 }}>{post.category}</div>
        <h1 className="sf-h">{post.title}</h1>
        <p className="sf-muted" style={{ marginBottom: 28 }}>{dateFr(post.publishedAt)} · {post.minutes} min de lecture</p>
        {/* HTML issu de Markdown assaini par liste blanche côté serveur (renderMarkdown). */}
        <div className="sf-prose" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
        {post.sources.length > 0 && (
          <aside className="sf-panel sf-glass" style={{ marginTop: 32 }}>
            <h2>Sources</h2>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 14 }}>
              {post.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener nofollow" style={{ textDecoration: "underline" }}>{s.title || s.url}</a></li>)}
            </ul>
          </aside>
        )}
      </article>
      {products.length > 0 && (
        <section className="sf-section" style={{ paddingTop: 0 }}>
          <h2 className="sf-h" style={{ fontSize: 36, marginBottom: 20 }}>Produit cité</h2>
          <div className="sf-grid">{products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        </section>
      )}
    </div>
  );
}

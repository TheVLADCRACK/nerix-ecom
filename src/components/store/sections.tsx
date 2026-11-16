"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";
import type { Category, Product, Section } from "@/lib/types";
import { useStore } from "./cart";
import { ProductCard } from "./product-card";
import { SubscribeForm } from "./subscribe-form";

export type PostLite = { slug: string; title: string; excerpt: string; category: string; minutes: number };
export type SectionData = { products: Product[]; categories: Category[]; posts: PostLite[]; heroImage: string | null };

/** Rend la liste ordonnée de sections d'une page. Composants purs : utilisés par la boutique et par l'aperçu de l'éditeur. */
export function Sections({ sections, data }: { sections: Section[]; data: SectionData }) {
  return <>{sections.filter((s) => s.enabled).map((s) => <SectionView key={s.id} s={s} data={data} />)}</>;
}

/** Aperçu en direct : reçoit les sections modifiées depuis l'éditeur (même origine uniquement). */
export function LiveSections({ sections, data, live }: { sections: Section[]; data: SectionData; live: boolean }) {
  const [current, setCurrent] = useState(sections);
  useEffect(() => {
    if (!live) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "nerix:sections" || !Array.isArray(e.data.sections)) return;
      setCurrent(e.data.sections as Section[]);
      const root = document.querySelector<HTMLElement>(".sf");
      const colors: Record<string, unknown> = e.data.theme?.colors ?? {};
      for (const [k, v] of Object.entries(colors))
        if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) root?.style.setProperty(`--c-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`, v);
      if (e.data.theme?.headingFont === "sans" || e.data.theme?.headingFont === "serif") root?.setAttribute("data-heading", e.data.theme.headingFont);
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage({ type: "nerix:ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, [live]);
  return <Sections sections={current} data={data} />;
}

function SectionView({ s, data }: { s: Section; data: SectionData }) {
  const { base } = useStore();
  switch (s.type) {
    case "hero": {
      const p = data.products.find((x) => x.slug === s.productSlug) ?? data.products[0];
      return (
        <section className="sf-wrap sf-home-hero">
          <div>
            {s.eyebrow && <div className="sf-eyebrow">{s.eyebrow}</div>}
            <h1 className="sf-h" style={{ marginTop: 12 }}>{s.title}</h1>
            <p className="sf-muted">{s.text}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {s.ctaLabel && <Link href={`${base}${s.ctaHref}`} className="sf-btn primary">{s.ctaLabel} <Icon name="arrowRight" size={16} /></Link>}
              {s.secondaryLabel && <Link href={`${base}${s.secondaryHref}`} className="sf-btn outline">{s.secondaryLabel}</Link>}
            </div>
          </div>
          {p?.images[0] && (
            <Link href={`${base}/produits/${p.slug}`} className="visual sf-glass" aria-label={p.name}>
              <img src={p.images[0].src} srcSet={p.images[0].srcSet} sizes="(max-width: 960px) 92vw, 540px" alt={p.images[0].alt} width={p.images[0].width} height={p.images[0].height} fetchPriority="high" />
              <span className="slats" aria-hidden="true" />
              <span className="tag sf-glass"><strong style={{ display: "block" }}>{p.name}</strong><span className="sf-muted">Dès {Math.min(...p.variants.map((v) => v.price)).toLocaleString("fr-FR")} FCFA</span></span>
            </Link>
          )}
        </section>
      );
    }
    case "trust":
      return (
        <div className="sf-wrap">
          <div className="sf-trust sf-glass">
            {s.items.map((t, i) => <div key={i}><Icon name={(["cash", "truck", "shield"] as const)[i % 3]!} size={20} />{t}</div>)}
          </div>
        </div>
      );
    case "categories": {
      const roots = data.categories.filter((c) => !c.parentPath);
      return (
        <section className="sf-section">
          <div className="sf-wrap">
            <header><h2 className="sf-h">{s.title}</h2><Link href={`${base}/shop`} className="sf-link">Tout voir <Icon name="arrowRight" size={14} /></Link></header>
            <div className="sf-cats">
              {roots.map((c) => {
                const p = data.products.find((x) => x.categoryPath.startsWith(c.path));
                return (
                  <Link key={c.path} href={`${base}/shop?categorie=${c.path}`} className="sf-cat sf-glass">
                    <h3>{c.name}</h3>
                    <p className="sf-muted">{c.description}</p>
                    <span className="sf-link">Explorer <Icon name="arrowRight" size={14} /></span>
                    {p?.images[0] && <img src={p.images[0].src} alt="" loading="lazy" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      );
    }
    case "products":
      return <ProductsSection title={s.title} tabs={s.tabs} limit={s.limit} data={data} />;
    case "banner":
      return (
        <section className="sf-section">
          <div className="sf-wrap">
            <div className="sf-band sf-dark">
              <div><h2 className="sf-h">{s.title}</h2></div>
              <div>
                <p className="sf-muted">{s.text}</p>
                {s.ctaLabel && <Link href={`${base}${s.ctaHref}`} className="sf-btn gold" style={{ marginTop: 18 }}>{s.ctaLabel} <Icon name="arrowRight" size={16} /></Link>}
              </div>
            </div>
          </div>
        </section>
      );
    case "posts":
      return data.posts.length ? (
        <section className="sf-section">
          <div className="sf-wrap">
            <header><h2 className="sf-h">{s.title}</h2><Link href={`${base}/blog`} className="sf-link">Tous les articles <Icon name="arrowRight" size={14} /></Link></header>
            <div className="sf-posts">
              {data.posts.slice(0, 3).map((p) => (
                <Link key={p.slug} href={`${base}/blog/${p.slug}`} className="sf-post sf-glass">
                  <span className="sf-eyebrow">{p.category}</span>
                  <h3>{p.title}</h3>
                  <p className="sf-muted" style={{ fontSize: 14 }}>{p.excerpt.slice(0, 120)}…</p>
                  <footer><span className="sf-muted">{p.minutes} min de lecture</span><Icon name="arrowRight" size={16} /></footer>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null;
    case "featured": {
      const p = data.products.find((x) => x.slug === s.productSlug) ?? data.products[0];
      if (!p) return null;
      const v = p.variants[0]!;
      return (
        <section className="sf-section">
          <div className="sf-wrap">
            <div className="sf-feature sf-glass">
              <Link href={`${base}/produits/${p.slug}`} className="sf-tile" aria-label={p.name}>{p.images[0] && <img src={p.images[0].src} srcSet={p.images[0].srcSet} sizes="(max-width: 760px) 92vw, 480px" alt={p.images[0].alt} loading="lazy" />}</Link>
              <div>
                {s.title && <div className="sf-eyebrow">{s.title}</div>}
                <h2 className="sf-h" style={{ marginTop: 10 }}>{p.name}</h2>
                <p className="sf-muted">{s.text || p.short}</p>
                <div className="sf-price" style={{ fontSize: 26, fontWeight: 700, margin: "14px 0" }}>{v.price.toLocaleString("fr-FR")} FCFA</div>
                <Link href={`${base}/produits/${p.slug}`} className="sf-btn gold lg">Voir le produit <Icon name="arrowRight" size={16} /></Link>
              </div>
            </div>
          </div>
        </section>
      );
    }
    case "imageText": {
      const p = data.products.find((x) => x.slug === s.productSlug) ?? data.products[0];
      return (
        <section className="sf-section">
          <div className="sf-wrap">
            <div className="sf-feature" data-reverse={s.reverse}>
              <div className="sf-tile sf-glass">{p?.images[1] ?? p?.images[0] ? <img src={(p.images[1] ?? p.images[0])!.src} alt={(p.images[1] ?? p.images[0])!.alt} loading="lazy" /> : null}</div>
              <div>
                <h2 className="sf-h">{s.title}</h2>
                {s.text && <p className="sf-muted" style={{ marginTop: 12 }}>{s.text}</p>}
                {s.ctaLabel && <Link href={`${base}${s.ctaHref}`} className="sf-btn primary" style={{ marginTop: 18 }}>{s.ctaLabel} <Icon name="arrowRight" size={16} /></Link>}
              </div>
            </div>
          </div>
        </section>
      );
    }
    case "richtext":
      return (
        <section className="sf-section">
          <div className="sf-wrap" style={{ maxWidth: 760, textAlign: "center" }}>
            <h2 className="sf-h">{s.title}</h2>
            {s.text && <p className="sf-muted" style={{ marginTop: 14, fontSize: 17 }}>{s.text}</p>}
          </div>
        </section>
      );
    case "faq":
      return s.items.length ? (
        <section className="sf-section">
          <div className="sf-wrap" style={{ maxWidth: 820 }}>
            <h2 className="sf-h" style={{ marginBottom: 16 }}>{s.title}</h2>
            <div className="sf-faq">{s.items.map((f) => <details key={f.q}><summary>{f.q}<Icon name="down" size={16} /></summary><p>{f.a}</p></details>)}</div>
          </div>
        </section>
      ) : null;
    case "newsletter":
      return (
        <section className="sf-section" style={{ paddingTop: 0 }}>
          <div className="sf-wrap">
            <div className="sf-band sf-dark">
              <div>
                <h2 className="sf-h">{s.title}</h2>
                <SubscribeForm id="nl-phone" button="Je m'inscris" buttonClass="sf-btn gold" inputClass="sf-input" />
              </div>
              <p className="sf-muted">{s.text}</p>
            </div>
          </div>
        </section>
      );
  }
}

function ProductsSection({ title, tabs, limit, data }: { title: string; tabs: boolean; limit: number; data: SectionData }) {
  const [cat, setCat] = useState("");
  const roots = data.categories.filter((c) => !c.parentPath);
  const list = data.products.filter((p) => !cat || p.categoryPath.startsWith(cat)).slice(0, limit);
  return (
    <section className="sf-section">
      <div className="sf-wrap">
        <header><h2 className="sf-h">{title}</h2></header>
        {tabs && (
          <div className="sf-tabs" role="tablist">
            <button role="tab" aria-current={!cat} onClick={() => setCat("")}>Tout</button>
            {roots.map((c) => <button key={c.path} role="tab" aria-current={cat === c.path} onClick={() => setCat(c.path)}>{c.name}</button>)}
          </div>
        )}
        <div className="sf-grid">{list.map((p, i) => <ProductCard key={p.slug} p={p} priority={i < 3} />)}</div>
      </div>
    </section>
  );
}

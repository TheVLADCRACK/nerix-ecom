import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { BuyBox, Gallery } from "@/components/store/buy-box";
import { Carousel } from "@/components/store/carousel";
import { loadFront } from "@/components/store/ctx";
import { getReviews } from "@/server/repo";
import { ProductCard } from "@/components/store/product-card";
import { Icon, type IconName } from "@/components/ui/icons";
import { etaText, xaf } from "@/lib/format";
import type { City, ProductPageKey } from "@/lib/types";

type P = { params: Promise<{ store: string; slug: string }> };

async function load(params: P["params"]) {
  const ctx = await loadFront(params);
  const { slug } = await params;
  const p = ctx.data.products.find((x) => x.slug === slug);
  if (!p) notFound();
  return { ...ctx, p };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { p, base } = await load(params);
  return { title: p.seoTitle, description: p.seoDescription, alternates: { canonical: `${base}/produits/${p.slug}` }, openGraph: { title: p.seoTitle, description: p.seoDescription, images: p.images[0] ? [p.images[0].src] : [] } };
}

const WHY_ICONS: IconName[] = ["zap", "check", "sparkle", "shield", "star", "gift"];

/** Frais et délais réels des villes desservies : « Livraison offerte · 30 min à 1 h 30 à Douala, 24 h ailleurs ». */
function shipNote(cities: City[]): string {
  if (!cities.length) return "";
  const minFee = Math.min(...cities.map((c) => c.fee));
  const fees = cities.every((c) => c.fee === 0) ? "Livraison offerte" : `Livraison dès ${xaf(minFee)}`;
  const fast = [...cities].sort((a, b) => a.etaMax - b.etaMax);
  const best = fast.filter((c) => c.etaMax === fast[0]!.etaMax && c.etaMin === fast[0]!.etaMin);
  const slow = fast[fast.length - 1]!;
  const rest = best.length < cities.length ? `, ${etaText(slow.etaMin, slow.etaMax)} ailleurs` : "";
  return `${fees} · ${etaText(best[0]!.etaMin, best[0]!.etaMax)}${best.length < cities.length ? ` à ${best.map((c) => c.name).join(", ")}` : ""}${rest}`;
}

export default async function ProductPage({ params }: P) {
  const { store, base, data, p, cities } = await load(params);
  const tpl = store.settings.productPage;
  const cat = data.categories.find((c) => c.path === p.categoryPath);
  const shown = p.body.filter((b) => !b.hidden);
  const benefits = shown.find((b) => b.type === "benefits");
  const faq = shown.find((b) => b.type === "faq");
  const fastest = [...cities].sort((a, b) => a.etaMax - b.etaMax)[0];
  const delai = fastest ? etaText(fastest.etaMin, fastest.etaMax) : "";
  const others = data.products.filter((x) => x.slug !== p.slug);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.short,
      image: p.images.map((i) => i.src),
      sku: p.variants[0]!.sku,
      ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
      offers: p.variants.map((v) => ({ "@type": "Offer", sku: v.sku, price: v.price, priceCurrency: "XAF", availability: v.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [{ name: "Accueil", path: "/" }, { name: "Shop", path: "/shop" }, ...(cat ? [{ name: cat.name, path: `/shop?categorie=${cat.path}` }] : []), { name: p.name, path: `/produits/${p.slug}` }]
        .map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: `${base}${x.path}` })),
    },
    ...(faq?.type === "faq" && tpl.sections.some((x) => x.key === "faq" && x.enabled) ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
  ];
  const [title, ...rest] = p.name.split(",");
  const only = p.variants.length === 1 && p.variants[0]!.title !== "Standard" ? p.variants[0]!.title : "";
  const subtitle = rest.join(",").trim() || [cat?.name, only].filter(Boolean).join(" · ");
  const creatives = p.images.filter((i) => i.kind === "creative");
  const reviews = (await getReviews(store)).filter((r) => r.productSlug === p.slug && r.published && r.consent);
  const section = (k: ProductPageKey) => {
    switch (k) {
      case "benefits":
        return benefits?.type === "benefits" ? (
          <section className="sf-why">
            <h2>Pourquoi {title} ?</h2>
            <div className="items">{benefits.items.slice(0, 6).map((b, i) => <div className="item" key={b}><i><Icon name={WHY_ICONS[i % WHY_ICONS.length]!} size={20} /></i><span>{b}</span></div>)}</div>
          </section>
        ) : null;
      case "blocks":
        return <>{shown.map((b, i) => b.type === "text" ? (
          <section className="sf-block" key={i}>{b.title && <h2>{b.title}</h2>}<p className="sf-muted" style={{ whiteSpace: "pre-line", maxWidth: "70ch" }}>{b.body}</p></section>
        ) : b.type === "imageText" ? (
          <section className="sf-block" key={i}>
            <div className="sf-feature" data-reverse={b.reverse}>
              <div className="sf-tile sf-glass">{(() => { const im = p.images.find((x) => x.src === b.image) ?? p.images[0]; return im ? <img src={im.src} srcSet={im.srcSet} sizes="(max-width: 760px) 92vw, 45vw" alt={im.alt} loading="lazy" /> : null; })()}</div>
              <div>{b.title && <h2>{b.title}</h2>}<p className="sf-muted" style={{ whiteSpace: "pre-line", marginTop: 12 }}>{b.body}</p></div>
            </div>
          </section>
        ) : b.type === "safety" ? (
          <section className="sf-block" key={i}><h2>Précautions</h2><ul className="sf-muted" style={{ paddingLeft: 18, display: "grid", gap: 6, maxWidth: "70ch" }}>{b.items.map((x) => <li key={x}>{x}</li>)}</ul></section>
        ) : null)}</>;
      case "howto":
        return creatives.length > 0 ? (
          <section className="sf-block">
            <h2>Comment ça marche</h2>
            <div className="sf-creatives">{creatives.map((c) => <img key={c.src} src={c.src} srcSet={c.srcSet} sizes="(max-width: 760px) 92vw, 33vw" alt={c.alt} width={c.width} height={c.height} loading="lazy" />)}</div>
          </section>
        ) : null;
      case "reviews":
        return reviews.length > 0 ? (
          <section className="sf-block">
            <h2>Avis clients</h2>
            <div className="sf-reviews">
              {reviews.slice(0, 6).map((r) => (
                <article key={r.id} className="sf-review sf-glass">
                  {r.photo && <img src={r.photo} alt={`Photo envoyée par ${r.name}`} loading="lazy" />}
                  <div className="stars" aria-label={`${r.rating} sur 5`}>{"★".repeat(r.rating)}<span>{"★".repeat(5 - r.rating)}</span></div>
                  <p>{r.text}</p>
                  <footer>{r.name}{r.city ? ` · ${r.city}` : ""}</footer>
                </article>
              ))}
            </div>
          </section>
        ) : null;
      case "faq":
        return faq?.type === "faq" ? (
          <section className="sf-block">
            <h2>Questions fréquentes</h2>
            <div className="sf-faq">{faq.items.map((f) => <details key={f.q}><summary>{f.q}<Icon name="down" size={16} /></summary><p>{f.a}</p></details>)}</div>
          </section>
        ) : null;
      case "related":
        return others.length > 0 ? <Carousel title="Produits similaires">{others.map((x) => <ProductCard key={x.slug} p={x} />)}</Carousel> : null;
      default:
        return null;
    }
  };

  return (
    <div className="sf-wrap sf-pdp-pad">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="sf-pdp">
        <Gallery images={p.images} />
        <div className="sf-buy">
          <h1 style={{ textTransform: "uppercase" }}>{title}</h1>
          {subtitle && <p className="sub">{subtitle}</p>}
          <BuyBox p={p} cart={tpl.addToCart} direct={tpl.buyNow} shipNote={shipNote(cities)} />
          {tpl.sections.some((x) => x.key === "assure" && x.enabled) && tpl.assure.length > 0 && (
            <div className="sf-assure sf-glass">
              {tpl.assure.map((a) => <div key={a.text}><Icon name={a.icon} size={18} /> {a.text.replace("{delai}", delai)}</div>)}
            </div>
          )}
        </div>
      </div>

      {tpl.sections.filter((x) => x.enabled).map(({ key }) => <Fragment key={key}>{section(key)}</Fragment>)}
    </div>
  );
}

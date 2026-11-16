import type { Metadata } from "next";
import { StoreProvider, type CatalogItem } from "@/components/store/cart";
import { loadFront, type FrontParams } from "@/components/store/ctx";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { SourceCapture } from "@/components/store/source";
import { Tracking } from "@/components/store/tracking";
import "@/styles/store.css";

export async function generateMetadata({ params }: FrontParams): Promise<Metadata> {
  const { store } = await loadFront(params);
  return {
    title: { default: `${store.name} · ${store.tagline}`, template: `%s | ${store.name}` },
    description: `${store.name} : ${store.tagline}. Livraison au Cameroun, paiement à la livraison.`,
    icons: { icon: store.favicon, apple: store.logo },
    openGraph: { siteName: store.name, locale: "fr_CM", type: "website" },
  };
}

export default async function StoreLayout({ params, children }: FrontParams & { children: React.ReactNode }) {
  const { store, base, data } = await loadFront(params);
  const c = store.theme.colors;
  const catalog: CatalogItem[] = data.products.flatMap((p) =>
    p.variants.map((v) => ({ sku: v.sku, productSlug: p.slug, productName: p.name, variantTitle: v.title, price: v.price, available: v.available, image: p.images[0]?.src ?? null })),
  );
  const vars = { "--c-ink": c.ink, "--c-bg": c.bg, "--c-accent": c.accent, "--c-accent-deep": c.accentDeep, "--c-accent-soft": c.accentSoft, "--c-night": c.night, "--c-on-night": c.onNight } as React.CSSProperties;
  return (
    <div className="sf" style={vars} data-heading={store.theme.headingFont}>
      <StoreProvider base={base} storeSlug={store.slug} catalog={catalog}>
        <StoreHeader name={store.name} logo={store.logo} />
        <main>{children}</main>
        <StoreFooter store={store} base={base} />
        <Tracking ids={store.tracking} />
        <SourceCapture storeSlug={store.slug} />
      </StoreProvider>
    </div>
  );
}

import { StoreEditor } from "@/components/platform/store-editor";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";

export const metadata = { title: "Éditeur de boutique" };

export default async function Editor({ params }: StoreParams) {
  const { store, products } = await loadStore(params);
  return <StoreEditor slug={store.slug} initialSections={store.sections} initialTheme={store.theme} products={products.map((p) => ({ slug: p.slug, name: p.name }))} />;
}

import { ReviewsAdmin } from "@/components/platform/reviews-admin";
import { getReviews } from "@/server/repo";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";

export const metadata = { title: "Avis clients" };

export default async function Reviews({ params }: StoreParams) {
  const { store, products } = await loadStore(params);
  const reviews = await getReviews(store);
  return (
    <>
      <div className="nx-head"><div><h1>Avis clients</h1><p>Recopiez les avis que vos clients vous envoient (WhatsApp, appel, réseaux), avec leur accord. Ils s'affichent en cartes sur la fiche du produit.</p></div></div>
      <ReviewsAdmin storeSlug={store.slug} initial={reviews.filter((r) => r.storeSlug === store.slug)} products={products.map(({ slug, name }) => ({ slug, name }))} />
    </>
  );
}

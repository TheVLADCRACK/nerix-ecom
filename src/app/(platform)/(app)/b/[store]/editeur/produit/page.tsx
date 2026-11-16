import Link from "next/link";
import { ProductPageEditor } from "@/components/platform/product-page-editor";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Modèle de page produit" };

export default async function ProductTemplate({ params }: StoreParams) {
  const { store, base, products } = await loadStore(params);
  const sample = products.find((p) => p.status === "active");
  return (
    <>
      <div className="nx-head">
        <Link href={`${base}/produits`} className="nx-btn icon" aria-label="Retour aux produits"><Icon name="arrowLeft" size={16} /></Link>
        <div><h1>Modèle de page produit</h1><p>Sections communes à toutes les pages produit : ordre, visibilité, boutons d'achat et garanties. Le contenu propre à chaque produit se modifie sur sa fiche.</p></div>
        {sample && <div className="actions"><a className="nx-btn" href={`/s/${store.slug}/produits/${sample.slug}`} target="_blank" rel="noopener"><Icon name="eye" size={16} /> Voir un exemple</a></div>}
      </div>
      <ProductPageEditor storeSlug={store.slug} initial={store.settings.productPage} />
    </>
  );
}

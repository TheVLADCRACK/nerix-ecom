import Link from "next/link";
import { OrderEditor } from "@/components/platform/order-editor";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Saisir une commande" };

/** Commande reçue par WhatsApp, téléphone ou en boutique : saisie par l'équipe, prix et stock vérifiés par le serveur. */
export default async function NewOrder({ params }: StoreParams) {
  const { store, base, products, cities } = await loadStore(params);
  return (
    <>
      <div className="nx-head">
        <Link href={`${base}/commandes`} className="nx-btn icon" aria-label="Retour aux commandes"><Icon name="arrowLeft" size={16} /></Link>
        <div><h1>Saisir une commande</h1><p>Pour une commande reçue hors du site : WhatsApp, appel, réseaux sociaux ou en boutique.</p></div>
      </div>
      <OrderEditor storeSlug={store.slug} base={base} cities={cities.filter((c) => c.active)}
        variants={products.filter((p) => p.status === "active").flatMap((p) => p.variants.map((v) => ({ sku: v.sku, label: p.variants.length > 1 ? `${p.name} · ${v.title}` : p.name, price: v.price, available: v.available })))} />
    </>
  );
}

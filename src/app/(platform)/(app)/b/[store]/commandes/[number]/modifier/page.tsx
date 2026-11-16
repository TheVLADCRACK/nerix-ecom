import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderEditor } from "@/components/platform/order-editor";
import { loadStore } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Modifier la commande" };

export default async function EditOrder({ params }: { params: Promise<{ store: string; number: string }> }) {
  const { store, base, allOrders, products, cities } = await loadStore(params);
  const { number } = await params;
  const o = allOrders.find((x) => x.number === number);
  if (!o) notFound();
  const editable = !o.archived && ["pending", "confirmed", "processing", "packed"].includes(o.status);
  const cityId = cities.find((c) => c.name === o.city)?.id ?? "";
  return (
    <>
      <div className="nx-head">
        <Link href={`${base}/commandes/${o.number}`} className="nx-btn icon" aria-label="Retour à la commande"><Icon name="arrowLeft" size={16} /></Link>
        <div><h1>Modifier <span className="mono" style={{ fontWeight: 500 }}>{o.number}</span></h1><p>Quantités, articles, client ou ville. Le total et le stock sont recalculés à l'enregistrement.</p></div>
      </div>
      {!editable ? <p className="nx-alert">Une commande livrée, annulée ou archivée ne se modifie plus.</p> : (
        <OrderEditor storeSlug={store.slug} base={base} number={o.number} cities={cities}
          variants={products.flatMap((p) => p.variants.map((v) => ({ sku: v.sku, label: p.variants.length > 1 ? `${p.name} · ${v.title}` : p.name, price: v.price, available: v.available + o.lines.filter((l) => l.sku === v.sku).reduce((n, l) => n + l.quantity, 0) })))}
          initial={{ firstName: o.customer.firstName, lastName: o.customer.lastName, phone: o.customer.phone, cityId, neighborhood: o.neighborhood, landmark: o.landmark, note: o.note ?? "", lines: o.lines.map((l) => ({ sku: l.sku, qty: l.quantity, price: l.unitPrice })) }} />
      )}
    </>
  );
}

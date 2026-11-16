import { CheckoutForm } from "@/components/store/checkout-form";
import { loadFront, type FrontParams } from "@/components/store/ctx";
import { onlinePayEnabled } from "@/lib/env";

export const metadata = { title: "Commande", robots: { index: false } };

export default async function Checkout({ params, searchParams }: FrontParams & { searchParams: Promise<{ article?: string; qte?: string }> }) {
  const { store, cities } = await loadFront(params);
  const sp = await searchParams;
  const qty = Number(sp.qte);
  const direct = typeof sp.article === "string" && /^[A-Z0-9-]{3,40}$/.test(sp.article) ? { sku: sp.article, qty: Number.isInteger(qty) && qty > 0 ? qty : 1 } : undefined;
  return <CheckoutForm cities={cities} storeSlug={store.slug} onlinePayments={onlinePayEnabled()} direct={direct} />;
}

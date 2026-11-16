import "server-only";

/** Stock affiché pour un produit qui ne s'épuise pas (assez grand pour ne jamais bloquer une commande). */
export const UNLIMITED = 9999;

type Query =<T>(text: string, params?: (string | number | boolean | null)[]) => Promise<T[]>;

/**
 * Stock disponible par SKU = achats du produit − commandes en cours ou livrées − pertes. Un SKU sans achat a 0 en stock.
 * Prend la fonction de requête pour servir aussi dans une transaction (création de commande sous verrou).
 */
export async function availability(query: Query, storeId: string): Promise<Map<string, number>> {
  const [lots, used, lost, unlimited] = await Promise.all([
    query<{ product: string; skus: string[]; quantity: number }>("SELECT product, skus, quantity FROM ecom.lots WHERE store_id = $1", [storeId]),
    query<{ sku: string; name: string; qty: string }>(`SELECT l.sku, l.name, sum(l.quantity) qty FROM ecom.order_lines l JOIN ecom.orders o ON o.id = l.order_id
       WHERE l.store_id = $1 AND NOT o.archived AND o.status IN ('pending','confirmed','processing','packed','completed') GROUP BY l.sku, l.name`, [storeId]),
    query<{ product: string; qty: string }>("SELECT product, sum(quantity) qty FROM ecom.losses WHERE store_id = $1 GROUP BY product", [storeId]),
    query<{ sku: string }>("SELECT v.sku FROM ecom.variants v JOIN ecom.products p ON p.id = v.product_id WHERE v.store_id = $1 AND NOT p.sold_out_when_empty", [storeId]),
  ]);
  const products = new Map<string, { skus: Set<string>; bought: number }>();
  for (const l of lots) {
    const p = products.get(l.product) ?? { skus: new Set<string>(), bought: 0 };
    l.skus.forEach((s) => p.skus.add(s));
    p.bought += l.quantity;
    products.set(l.product, p);
  }
  const bySku = new Map<string, number>();
  for (const [name, p] of products) {
    const out = used.filter((s) => p.skus.has(s.sku) || s.name === name).reduce((a, s) => a + Number(s.qty), 0);
    const left = p.bought - out - Number(lost.find((x) => x.product === name)?.qty ?? 0);
    for (const s of p.skus) bySku.set(s, Math.max(0, left));
  }
  // Produit réglé « ne pas marquer épuisé » : toujours commandable, même sans stock.
  for (const u of unlimited) bySku.set(u.sku, UNLIMITED);
  return bySku;
}

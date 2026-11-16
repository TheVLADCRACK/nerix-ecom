import "server-only";
import { q } from "@/lib/db";
import { availability } from "@/server/stock";

export type NotifyKind = "order" | "payment" | "cancel" | "cart" | "stock" | "message";

/** Ajoute une notification pour l'équipe. Ne bloque jamais l'action qui l'appelle (une alerte perdue vaut mieux qu'une commande refusée). */
export async function notify(storeId: string, kind: NotifyKind, title: string, body = "", link = "", dedupe: string | null = null) {
  await q("INSERT INTO ecom.notifications (store_id, kind, title, body, link, dedupe) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (store_id, dedupe) DO NOTHING",
    [storeId, kind, title.slice(0, 120), body.slice(0, 240), link, dedupe]).catch(() => {});
}

/** Après une commande : alerte si un article commandé passe sous le seuil de stock faible (une alerte par niveau atteint). */
export async function alertLowStock(storeId: string, slug: string, threshold: number, items: { sku: string; name: string }[]) {
  try {
    const stock = await availability(q as never, storeId);
    for (const it of items) {
      const left = stock.get(it.sku);
      if (left === undefined || left > threshold) continue;
      await notify(storeId, "stock", left === 0 ? `Rupture : ${it.name}` : `Stock faible : ${it.name}`,
        left === 0 ? "Plus aucune unité disponible. Pensez à recommander." : `Plus que ${left} unité${left > 1 ? "s" : ""} en stock.`,
        `/b/${slug}/achats`, `stock:${it.sku}:${left}:${new Date().toISOString().slice(0, 10)}`);
    }
  } catch { /* alerte non bloquante */ }
}

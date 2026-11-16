import "server-only";
import type { Tx } from "@/lib/db";

/** Lignes d'une commande en une seule requête (moins d'allers-retours, transaction plus courte). */
export async function insertLines(t: Tx, storeId: string, orderId: string, lines: { sku: string; name: string; title: string; price: number; qty: number }[]) {
  await t.q(`INSERT INTO ecom.order_lines (store_id, order_id, sku, name, variant, unit_price, quantity, position)
    SELECT $1, $2, l.* FROM unnest($3::text[], $4::text[], $5::text[], $6::int[], $7::int[], $8::int[]) AS l`,
    [storeId, orderId, lines.map((l) => l.sku), lines.map((l) => l.name), lines.map((l) => l.title), lines.map((l) => l.price), lines.map((l) => l.qty), lines.map((_, i) => i)]);
}

const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join("").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "CMD";

/** Numéro suivant (EP-2026-000123), attribué dans la transaction de création. */
export async function nextOrderNumber(t: Tx, store: { id: string; name: string }): Promise<string> {
  const year = new Date().getFullYear();
  const c = await t.one<{ last: number }>(
    "INSERT INTO ecom.order_counters (store_id, year, last) VALUES ($1, $2, 1) ON CONFLICT (store_id, year) DO UPDATE SET last = ecom.order_counters.last + 1 RETURNING last", [store.id, year]);
  return `${initials(store.name)}-${year}-${String(c!.last).padStart(6, "0")}`;
}

"use server";
// Notifications de l'outil, lues par l'application (sondage régulier) : son et alerte système côté navigateur.
import { z } from "zod";
import { one, q } from "@/lib/db";
import { requireStaff } from "@/server/auth";
import type { NotifyKind } from "@/server/notify";

export type Note = { id: number; kind: NotifyKind; title: string; body: string; link: string; store: string; at: string };

/**
 * Nouvelles notifications après `after` (0 : les 30 dernières), et dernière lue par ce membre.
 * Au passage, transforme en alerte les paniers restés sans commande au-delà du délai réglé par boutique (30 min par défaut).
 * Un seul rôle (administrateur de toutes les boutiques) : toutes les boutiques sont visibles.
 */
export async function pollNotifications(after: number): Promise<{ items: Note[]; lastRead: number }> {
  const staff = await requireStaff();
  const since = z.number().int().min(0).parse(after);
  await q(`WITH due AS (
      UPDATE ecom.carts c SET notified_at = now() FROM ecom.stores s
      WHERE s.id = c.store_id AND c.status = 'open' AND c.notified_at IS NULL AND c.updated_at < now() - make_interval(mins => coalesce((s.settings->>'cartDelay')::int, 30))
      RETURNING c.id, c.store_id, s.slug, c.customer, c.city, c.total)
    INSERT INTO ecom.notifications (store_id, kind, title, body, link, dedupe)
    SELECT store_id, 'cart', 'Panier abandonné : ' || (customer->>'firstName') || ' ' || (customer->>'lastName'),
      concat_ws(' · ', nullif(city, ''), replace(to_char(total, 'FM999,999,999'), ',', ' ') || ' FCFA', 'à relancer'), '/b/' || slug || '/paniers', 'cart:' || id
    FROM due ON CONFLICT (store_id, dedupe) DO NOTHING`);
  const rows = await q<{ id: string; kind: NotifyKind; title: string; body: string; link: string; store: string; created_at: Date }>(
    `SELECT n.id, n.kind, n.title, n.body, n.link, s.name store, n.created_at FROM ecom.notifications n JOIN ecom.stores s ON s.id = n.store_id
     WHERE n.id > $1 ORDER BY n.id DESC LIMIT 30`, [since]);
  const read = await one<{ last_id: string }>("SELECT last_id FROM ecom.notification_reads WHERE staff_id = $1", [staff.id]);
  return {
    items: rows.map((r) => ({ id: Number(r.id), kind: r.kind, title: r.title, body: r.body, link: r.link, store: r.store, at: new Date(r.created_at).toISOString() })),
    lastRead: Number(read?.last_id ?? 0),
  };
}

export async function markNotificationsRead(upTo: number): Promise<void> {
  const staff = await requireStaff();
  const id = z.number().int().min(0).parse(upTo);
  await q(`INSERT INTO ecom.notification_reads (staff_id, last_id) VALUES ($1,$2)
    ON CONFLICT (staff_id) DO UPDATE SET last_id = greatest(ecom.notification_reads.last_id, EXCLUDED.last_id)`, [staff.id, id]);
}

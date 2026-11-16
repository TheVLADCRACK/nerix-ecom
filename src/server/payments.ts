import "server-only";
import { one, q, tx } from "@/lib/db";
import { checkoutStatus, verifyPayment } from "@/server/saspay";

type Row = { id: string; order_id: string; store_id: string; amount: number; status: string; provider_payment_id: string | null };

/**
 * Rapproche un paiement en attente avec SasPay : statut de la page de paiement, puis `verify` qui fait foi.
 * Idempotent (verrou + garde sur PENDING) : webhook, retour du client et relance peuvent l'appeler en même temps.
 */
export async function reconcilePayment(paymentId: string): Promise<string> {
  const p = await one<Row>("SELECT id, order_id, store_id, amount, status, provider_payment_id FROM ecom.payments WHERE id = $1 AND provider = 'saspay'", [paymentId]);
  if (!p || p.status !== "PENDING" || !p.provider_payment_id) return p?.status ?? "PENDING";
  const s = await checkoutStatus(p.provider_payment_id);
  if (!s) return "PENDING";
  if (s.transactionId && s.transactionStatus === "SUCCESS") {
    const v = await verifyPayment(s.transactionId);
    if (v?.status !== "SUCCESS") return "PENDING";
    // Montant demandé inférieur à la commande (ou autre devise) : jamais accepté comme payé.
    if (v.currency !== "XAF" || v.requested < p.amount) return settle(p, "FAILED", `Paiement refusé : ${v.requested} ${v.currency} reçus au lieu de ${p.amount} XAF`, s.transactionId);
    return settle(p, "COMPLETED", "Paiement en ligne reçu", s.transactionId, v);
  }
  if (s.transactionStatus === "FAILED" || ["FAILED", "EXPIRED", "CANCELLED"].includes(s.status)) return settle(p, "FAILED", "Paiement en ligne échoué : à régler à la livraison", s.transactionId);
  return "PENDING";
}

async function settle(p: Row, status: "COMPLETED" | "FAILED", label: string, txId: string | null, v?: { reference: string; charged: number; net: number }): Promise<string> {
  await tx(async (t) => {
    const locked = await t.one("SELECT 1 FROM ecom.payments WHERE id = $1 AND status = 'PENDING' FOR UPDATE", [p.id]);
    if (!locked) return; // déjà traité par un autre appel
    await t.q("UPDATE ecom.payments SET status = $2, transaction_id = $3, reference = $4, charged = $5, net = $6, updated_at = now() WHERE id = $1",
      [p.id, status, txId, v?.reference ?? null, v?.charged ?? null, v?.net ?? null]);
    if (status === "COMPLETED") await t.q("UPDATE ecom.orders SET payment_status = 'paid' WHERE id = $1", [p.order_id]);
    else await t.q("UPDATE ecom.orders SET payment_status = 'unpaid' WHERE id = $1 AND payment_status <> 'paid'", [p.order_id]);
    await t.q("INSERT INTO ecom.order_events (store_id, order_id, label, actor) VALUES ($1,$2,$3,'SasPay')", [p.store_id, p.order_id, label]);
    await t.q(`INSERT INTO ecom.notifications (store_id, kind, title, body, link)
      SELECT o.store_id, $2, $3 || o.number, $4, '/b/' || s.slug || '/commandes/' || o.number FROM ecom.orders o JOIN ecom.stores s ON s.id = o.store_id WHERE o.id = $1`,
      [p.order_id, status === "COMPLETED" ? "payment" : "cancel", status === "COMPLETED" ? "Paiement reçu : " : "Paiement échoué : ",
        status === "COMPLETED" ? `${p.amount.toLocaleString("fr-FR")} FCFA payés en ligne.` : "La commande reste à régler à la livraison."]);
  });
  return (await one<{ status: string }>("SELECT status FROM ecom.payments WHERE id = $1", [p.id]))?.status ?? status;
}

/** Paiements en ligne encore en attente (48 h) : rapprochés à la réception d'un webhook ou par la relance. */
export async function reconcilePending(transactionId?: string) {
  const rows = await q<{ id: string }>(
    `SELECT id FROM ecom.payments WHERE provider = 'saspay' AND status = 'PENDING' AND created_at > now() - interval '48 hours'
     ORDER BY (transaction_id = $1) DESC NULLS LAST, created_at DESC LIMIT 40`, [transactionId ?? ""]);
  for (const r of rows) await reconcilePayment(r.id).catch(() => {});
}

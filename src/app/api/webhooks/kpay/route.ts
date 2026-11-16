import { z } from "zod";
import { one, q } from "@/lib/db";
import { reconcilePending } from "@/server/payments";
import { verifyWebhook } from "@/server/kpay";

// Webhook KPay : corps brut → HMAC-SHA256 en temps constant → dédoublonnage → statut relu chez KPay.
// Le contenu de l'événement ne fait jamais foi : il déclenche seulement la vérification.
export const dynamic = "force-dynamic";

const Payload = z.object({ event: z.string().max(60), paymentId: z.string().max(120), externalId: z.string().max(120).optional(), status: z.string().max(30).optional() }).loose();

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 64_000) return new Response("Trop volumineux", { status: 413 });
  if (!verifyWebhook(raw, req.headers.get("x-kpay-signature"))) {
    await q("INSERT INTO ecom.audit_log (actor_name, action, target) VALUES ('KPay', 'Webhook refusé : signature invalide', '')").catch(() => {});
    return new Response("Signature invalide", { status: 401 });
  }
  let body: z.infer<typeof Payload>;
  try { body = Payload.parse(JSON.parse(raw)); } catch { return new Response("Contenu invalide", { status: 400 }); }
  if (!body.event.startsWith("payment.")) return new Response("ok"); // retraits et remboursements : rien à faire

  const fresh = await one("INSERT INTO ecom.payment_events (provider, payment_id, external_id, event, status) VALUES ('kpay',$1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id",
    [body.paymentId, body.externalId ?? null, body.event, body.status ?? ""]);
  if (fresh) await reconcilePending(body.paymentId);
  return new Response("ok");
}

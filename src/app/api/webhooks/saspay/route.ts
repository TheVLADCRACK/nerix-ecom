import { z } from "zod";
import { one, q } from "@/lib/db";
import { reconcilePending } from "@/server/payments";
import { verifyWebhook } from "@/server/saspay";

// Webhook SasPay : corps brut → âge ≤ 300 s et HMAC-SHA256 en temps constant → dédoublonnage → rapprochement via `verify`.
// Le contenu de l'événement ne fait jamais foi : il déclenche seulement la vérification auprès de SasPay.
export const dynamic = "force-dynamic";

const Payload = z.object({ event: z.string().max(60), data: z.object({ id: z.string().max(120).optional() }).loose().optional() }).loose();

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 64_000) return new Response("Trop volumineux", { status: 413 });
  if (!verifyWebhook(raw, req.headers.get("x-webhook-signature"), req.headers.get("x-webhook-timestamp"))) {
    await q("INSERT INTO ecom.audit_log (actor_name, action, target) VALUES ('SasPay', 'Webhook refusé : signature ou horodatage invalide', '')").catch(() => {});
    return new Response("Signature invalide", { status: 401 });
  }
  let body: z.infer<typeof Payload>;
  try { body = Payload.parse(JSON.parse(raw)); } catch { return new Response("Contenu invalide", { status: 400 }); }
  if (!body.event.startsWith("transaction.")) return new Response("ok"); // retraits, transferts, test : rien à faire

  const id = body.data?.id ?? `${req.headers.get("x-webhook-timestamp")}`;
  const fresh = await one("INSERT INTO ecom.payment_events (provider, payment_id, event, status) VALUES ('saspay',$1,$2,'received') ON CONFLICT DO NOTHING RETURNING id", [id, body.event]);
  if (fresh) await reconcilePending(body.data?.id);
  return new Response("ok");
}

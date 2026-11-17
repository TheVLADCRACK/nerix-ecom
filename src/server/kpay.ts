import "server-only";
import { env } from "@/lib/env";
import { hmacHex, safeEqual } from "@/lib/security";

/**
 * Adaptateur KPay (documentation kpay.site/documentation, consultée le 16/11/2026). Seul fichier qui appelle l'API.
 * Page de paiement hébergée (mode GATEWAY) : le client y choisit Orange Money, MTN MoMo ou la carte.
 * La commission KPay est prélevée sur le marchand (netAmount) : aucun frais n'est affiché ni ajouté sur la boutique.
 */
async function call<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T }> {
  const e = env();
  const res = await fetch(`${e.KPAY_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-API-Key": e.KPAY_API_KEY, "X-Secret-Key": e.KPAY_SECRET_KEY, ...init.headers },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

export type Checkout = { ok: true; id: string; url: string } | { ok: false; message: string };

/** Crée la page de paiement d'une commande (externalId unique : un 409 signifie « déjà créée »). */
export async function createCheckout(i: { amount: number; externalId: string; description: string; returnUrl: string }): Promise<Checkout> {
  const { status, data } = await call<{ id?: string; gatewayUrl?: string; code?: string; message?: string | string[] }>("/api/v1/payments/init", {
    method: "POST",
    body: JSON.stringify({ amount: Math.round(i.amount), currency: "XAF", externalId: i.externalId, description: i.description.slice(0, 120), returnUrl: i.returnUrl }),
  });
  if ((status === 200 || status === 201) && data.id && data.gatewayUrl) return { ok: true, id: data.id, url: data.gatewayUrl };
  // Motif renvoyé par KPay (ex. 401 INVALID_CREDENTIALS) : jamais de clé ni de données client dedans.
  const why = [data.code, Array.isArray(data.message) ? data.message.join(", ") : data.message].filter(Boolean).join(" ");
  return { ok: false, message: `KPay ${status}${why ? ` ${why}` : ""}`.slice(0, 200) };
}

/** Statut qui fait foi, relu chez KPay (jamais repris du webhook ou de la redirection). */
export async function paymentStatus(id: string) {
  const { status, data } = await call<{ status?: string; reference?: string; amount?: number; netAmount?: number; currency?: string }>(`/api/v1/payments/${encodeURIComponent(id)}`);
  if (status !== 200) return null;
  return { status: data.status ?? "", reference: data.reference ?? "", amount: Math.round(Number(data.amount ?? 0)), net: Math.round(Number(data.netAmount ?? 0)), currency: data.currency ?? "" };
}

/** Webhook : HMAC-SHA256 hexadécimal du corps brut (en-tête X-KPAY-Signature), comparé en temps constant. */
export function verifyWebhook(raw: string, signature: string | null, secret = env().KPAY_WEBHOOK_SECRET): boolean {
  if (!secret || !signature) return false;
  return safeEqual(hmacHex(secret, raw), signature.trim().toLowerCase());
}

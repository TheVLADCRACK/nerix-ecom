import "server-only";
import { env } from "@/lib/env";
import { hmacHex, safeEqual } from "@/lib/security";

/**
 * Adaptateur SasPay (spécification docs.saspay.me/api-reference/openapi.json, consultée le 15/11/2026).
 * Seul fichier qui appelle l'API. Page de paiement hébergée (Orange Money, MTN MoMo, carte) : les frais SasPay
 * (fee_charge_mode ADD_ON) s'affichent seulement sur leur page, jamais sur la boutique.
 */
async function call<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T }> {
  const e = env();
  const res = await fetch(`${e.SASPAY_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${e.SASPAY_API_KEY}`, ...init.headers },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { data?: T } & T;
  return { status: res.status, data: (body?.data ?? body) as T }; // enveloppe { success, data } ou objet direct
}

/** Montant FCFA entier → chaîne décimale exigée par l'API (« 2500.00 »). */
const money = (n: number) => `${Math.round(n)}.00`;
const toInt = (s: unknown) => Math.round(Number(s ?? 0)) || 0;

export type Checkout = { ok: true; id: string; url: string } | { ok: false; message: string };

/** Crée la page de paiement d'une commande. Le client y choisit Orange Money, MTN MoMo ou la carte. */
export async function createCheckout(i: { amount: number; name: string; phone: string; description: string; returnUrl: string; metadata: Record<string, string> }): Promise<Checkout> {
  const { status, data } = await call<{ id?: string; checkout_url?: string; message?: string }>("/checkout-sessions/", {
    method: "POST",
    body: JSON.stringify({
      amount: money(i.amount), currency: "XAF", country: "CM", description: i.description.slice(0, 120),
      customer_email: env().SASPAY_CUSTOMER_EMAIL, customer_name: i.name.slice(0, 80), customer_phone: i.phone,
      return_url: i.returnUrl, metadata: i.metadata, fee_charge_mode: "ADD_ON",
    }),
  });
  if ((status === 200 || status === 201) && data.id && data.checkout_url) return { ok: true, id: data.id, url: data.checkout_url };
  return { ok: false, message: `SasPay ${status}` };
}

/** Statut d'une page de paiement et de la transaction qui en découle. */
export async function checkoutStatus(id: string) {
  const { status, data } = await call<{ status?: string; transaction_id?: string | null; transaction_status?: string | null }>(`/checkout-sessions/${encodeURIComponent(id)}/status/`);
  return status === 200 ? { status: data.status ?? "", transactionId: data.transaction_id ?? null, transactionStatus: data.transaction_status ?? null } : null;
}

/** Vérification qui fait foi avant de marquer une commande payée : seul SUCCESS compte. */
export async function verifyPayment(transactionId: string) {
  const { status, data } = await call<{ status?: string; reference?: string; requested_amount?: string; debited_amount?: string; net_amount?: string; currency?: string }>(
    `/payments/${encodeURIComponent(transactionId)}/verify/`);
  if (status !== 200) return null;
  return { status: data.status ?? "", reference: data.reference ?? "", requested: toInt(data.requested_amount), charged: toInt(data.debited_amount), net: toInt(data.net_amount), currency: data.currency ?? "" };
}

/** Webhook : HMAC-SHA256 hexadécimal de « horodatage.corps brut », comparé en temps constant ; refusé au-delà de 300 s. */
export function verifyWebhook(raw: string, signature: string | null, timestamp: string | null, secret = env().SASPAY_WEBHOOK_SECRET, now = Date.now()): boolean {
  if (!secret || !signature || !timestamp || !/^\d{9,11}$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  return safeEqual(hmacHex(secret, `${timestamp}.${raw}`), signature.trim().toLowerCase());
}

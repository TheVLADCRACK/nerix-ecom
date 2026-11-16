import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { env } from "./env";
import { one } from "./db";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 24) => randomBytes(bytes).toString("base64url");

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hmacHex(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Jeton signé lié à une valeur (ex. numéro de commande) pour les liens de confirmation. */
export const signValue = (value: string) => hmacHex(env().TOKEN_SECRET, value).slice(0, 32);
export const checkSignedValue = (value: string, token: string | undefined) => !!token && safeEqual(signValue(value), token);

export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return sha256(`${env().TOKEN_SECRET}:${ip}`);
}

/**
 * Limitation de débit en base (fenêtre fixe). Renvoie false si la limite est dépassée.
 * shortcut: fenêtre fixe et non glissante, suffisant au volume prévu ; passer à un compteur glissant si abus.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000);
  const row = await one<{ count: number }>(
    `INSERT INTO ecom.rate_limits (key, window_start, count) VALUES ($1, $2, 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN ecom.rate_limits.window_start = EXCLUDED.window_start THEN ecom.rate_limits.count + 1 ELSE 1 END,
       window_start = EXCLUDED.window_start
     RETURNING count`,
    [key, windowStart],
  );
  return (row?.count ?? 0) <= max;
}

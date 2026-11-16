"use server";
// Compteur de visites des boutiques publiques : visiteur anonyme haché (jamais d'IP ni de donnée personnelle), robots ignorés.
import { headers } from "next/headers";
import { z } from "zod";
import { q } from "@/lib/db";
import { env } from "@/lib/env";
import { clientIpHash, hmacHex, rateLimit } from "@/lib/security";
import { getStore } from "@/server/repo";

const VisitIn = z.object({
  visitor: z.uuid(), path: z.string().max(200).regex(/^\/[\w\-/.%]*$/),
  channel: z.string().regex(/^[\w.-]{0,60}$/), campaign: z.string().regex(/^[\w.-]{0,60}$/),
}).strict();
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless/i;

export async function trackVisit(slug: string, input: z.input<typeof VisitIn>): Promise<void> {
  const d = VisitIn.safeParse(input);
  if (!d.success || !/^[a-z0-9-]{2,40}$/.test(slug)) return;
  if (BOT.test((await headers()).get("user-agent") ?? "")) return;
  const store = await getStore(slug);
  if (!store || store.status !== "active") return;
  if (!(await rateLimit(`visit:${await clientIpHash()}`, 600, 3600))) return;
  const visitor = hmacHex(env().TOKEN_SECRET, d.data.visitor).slice(0, 24);
  await q("INSERT INTO ecom.visits (store_id, visitor, path, channel, campaign) VALUES ($1,$2,$3,$4,$5)",
    [store.id, visitor, d.data.path, d.data.channel, d.data.campaign]).catch(() => {});
}

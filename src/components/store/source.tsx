"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackVisit } from "@/server/actions/visits";

// Origine publicitaire (dernier clic, 30 jours) : lue dans l'URL de la publicité, jointe à la commande.
// Pas de donnée personnelle : seulement le canal et le code de campagne.
const KEY = "nx-src";
const MAX_AGE = 30 * 86400_000;
type Src = { channel: string; campaign: string; at: number };

const clean = (v: string | null, max = 60) => (v && /^[\w.-]{1,60}$/.test(v) ? v.slice(0, max).toLowerCase() : "");

/** Identifiant anonyme du navigateur (aucune donnée personnelle), pour compter les visiteurs uniques. */
function visitorId(): string {
  try {
    let id = localStorage.getItem("nx-vid");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("nx-vid", id); }
    return id;
  } catch { return ""; }
}

export function SourceCapture({ storeSlug }: { storeSlug: string }) {
  const path = usePathname();
  // Une visite par page vue : chemin public (sans paramètres), visiteur anonyme, origine publicitaire éventuelle.
  useEffect(() => {
    const id = visitorId();
    if (!id || navigator.webdriver) return;
    const src = readSource();
    void trackVisit(storeSlug, { visitor: id, path: path.replace(/^\/s\/[^/]+/, "") || "/", channel: src?.channel ?? "", campaign: src?.campaign ?? "" }).catch(() => {});
  }, [storeSlug, path]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const campaign = clean(q.get("utm_campaign"));
    const channel = clean(q.get("utm_source")) || (q.get("fbclid") ? "meta" : q.get("ttclid") ? "tiktok" : q.get("gclid") ? "google" : "");
    if (!channel && !campaign) return;
    try { localStorage.setItem(KEY, JSON.stringify({ channel: channel || "autre", campaign, at: Date.now() } satisfies Src)); } catch {}
  }, []);
  return null;
}

/** Origine à joindre à la commande, ou null (accès direct, ou clic trop ancien). */
export function readSource(): { channel: string; campaign: string } | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Src | null;
    return s && Date.now() - s.at < MAX_AGE ? { channel: s.channel, campaign: s.campaign } : null;
  } catch { return null; }
}

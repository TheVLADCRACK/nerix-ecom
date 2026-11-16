"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hasAnyPixel, type PixelIds, validIds } from "@/lib/pixels";

// Pixels publicitaires par boutique (Meta, TikTok, Google). Chargés seulement après consentement,
// identifiants validés par format (aucune donnée de la base n'est injectée telle quelle dans un script).
type Ids = PixelIds;
type W = Window & { fbq?: (...a: unknown[]) => void; ttq?: { page: () => void; track: (e: string, d?: object, o?: object) => void; load: (id: string) => void }; gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };

const CONSENT = "nx-consent";
const w = () => window as W;

function load(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function boot(ids: Ids) {
  const win = w();
  if (ids.metaPixelIds.length && !win.fbq) {
    const q: unknown[][] = [];
    const fbq = (...a: unknown[]) => { q.push(a); };
    Object.assign(fbq, { queue: q, loaded: true, version: "2.0", push: fbq, callMethod: undefined });
    win.fbq = fbq as W["fbq"];
    (window as unknown as { _fbq: unknown })._fbq = fbq;
    load("https://connect.facebook.net/fr_FR/fbevents.js");
    // Plusieurs pixels Meta : chaque init enregistre un pixel, chaque « track » est envoyé à tous.
    for (const id of ids.metaPixelIds) win.fbq!("init", id);
  }
  if (ids.tiktokPixelId && !win.ttq) {
    const methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    const ttq: Record<string, unknown> & unknown[] = Object.assign([] as unknown[], {}) as Record<string, unknown> & unknown[];
    for (const m of methods) ttq[m] = (...a: unknown[]) => { ttq.push([m, ...a]); };
    ttq.load = (id: string) => {
      const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
      Object.assign(ttq, { _i: { [id]: Object.assign([], { _u: src }) }, _t: { [id]: Date.now() }, _o: { [id]: {} } });
      load(`${src}?sdkid=${id}&lib=ttq`);
    };
    win.ttq = ttq as unknown as W["ttq"];
    (window as unknown as { TiktokAnalyticsObject: string }).TiktokAnalyticsObject = "ttq";
    win.ttq!.load(ids.tiktokPixelId);
  }
  const gid = ids.ga4Id || ids.googleAdsId;
  if (gid && !win.gtag) {
    win.dataLayer = win.dataLayer ?? [];
    win.gtag = function gtag() { win.dataLayer!.push(arguments); }; // gtag attend l'objet arguments
    load(`https://www.googletagmanager.com/gtag/js?id=${gid}`);
    win.gtag("js", new Date());
    if (ids.ga4Id) win.gtag("config", ids.ga4Id, { send_page_view: false });
    if (ids.googleAdsId) win.gtag("config", ids.googleAdsId);
  }
  if (ids.gtmId) {
    win.dataLayer = win.dataLayer ?? [];
    win.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    load(`https://www.googletagmanager.com/gtm.js?id=${ids.gtmId}`);
  }
}

type Item = { id: string; name: string; value: number; quantity?: number };
type Event =
  | ["PageView", Record<string, never>?]
  | ["ViewContent", Item]
  | ["AddToCart", Item]
  | ["InitiateCheckout", { value: number; items: Item[] }]
  | ["Purchase", { orderNumber: string; value: number; items: Item[] }]
  | ["Contact", Record<string, never>?];

/** Envoie un événement à tous les pixels chargés (sans donnée personnelle). */
export function track(...[name, data]: Event) {
  if (typeof window === "undefined") return;
  const win = w();
  const cur = "XAF";
  const items = data && "items" in data ? data.items : data && "id" in data ? [data] : [];
  const value = data && "value" in data ? data.value : undefined;
  const eventID = data && "orderNumber" in data ? data.orderNumber : undefined; // déduplication avec l'API serveur (étape B)
  const meta = { content_ids: items.map((i) => i.id), content_type: "product", value, currency: cur, num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0) || undefined };
  const g = { currency: cur, value, items: items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.value, quantity: i.quantity ?? 1 })) };
  switch (name) {
    case "PageView":
      win.fbq?.("track", "PageView");
      win.ttq?.page();
      win.gtag?.("event", "page_view");
      break;
    case "ViewContent":
      win.fbq?.("track", "ViewContent", meta);
      win.ttq?.track("ViewContent", { contents: items.map((i) => ({ content_id: i.id, content_name: i.name, price: i.value })), value, currency: cur });
      win.gtag?.("event", "view_item", g);
      break;
    case "AddToCart":
      win.fbq?.("track", "AddToCart", meta);
      win.ttq?.track("AddToCart", { contents: items.map((i) => ({ content_id: i.id, content_name: i.name, price: i.value, quantity: i.quantity ?? 1 })), value, currency: cur });
      win.gtag?.("event", "add_to_cart", g);
      break;
    case "InitiateCheckout":
      win.fbq?.("track", "InitiateCheckout", meta);
      win.ttq?.track("InitiateCheckout", { value, currency: cur });
      win.gtag?.("event", "begin_checkout", g);
      break;
    case "Purchase":
      win.fbq?.("track", "Purchase", meta, { eventID });
      win.ttq?.track("CompletePayment", { value, currency: cur }, { event_id: eventID });
      win.gtag?.("event", "purchase", { ...g, transaction_id: eventID });
      break;
    case "Contact":
      win.fbq?.("track", "Contact");
      win.ttq?.track("Contact");
      win.gtag?.("event", "generate_lead");
      break;
  }
}

/** Charge les pixels après consentement et suit chaque changement de page. */
export function Tracking({ ids }: { ids: Ids }) {
  const safe = validIds(ids);
  const any = hasAnyPixel(safe);
  const [consent, setConsent] = useState<"yes" | "no" | null>(null);
  const path = usePathname();
  useEffect(() => {
    try { const v = localStorage.getItem(CONSENT); if (v === "yes" || v === "no") setConsent(v); } catch {}
  }, []);
  useEffect(() => {
    if (consent !== "yes" || !any) return;
    boot(safe);
    track("PageView");
  }, [consent, path]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!any || consent) return null;
  const choose = (v: "yes" | "no") => { try { localStorage.setItem(CONSENT, v); } catch {} setConsent(v); };
  return (
    <div role="dialog" aria-label="Mesure d'audience" className="sf-glass" style={{ position: "fixed", left: 16, bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", zIndex: 60, maxWidth: 380, borderRadius: 18, padding: 16, display: "grid", gap: 12, fontSize: 13.5 }}>
      <p>Nous utilisons des outils de mesure (Meta, TikTok, Google) pour améliorer nos publicités. Aucune donnée de commande nominative ne leur est transmise.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="sf-btn primary sm" onClick={() => choose("yes")}>Accepter</button>
        <button className="sf-btn light sm" onClick={() => choose("no")}>Refuser</button>
      </div>
    </div>
  );
}

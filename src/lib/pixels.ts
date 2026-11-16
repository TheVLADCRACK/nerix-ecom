import type { Store } from "./types";

export type PixelIds = Store["tracking"];
type Single = Exclude<keyof PixelIds, "metaPixelIds">;

/** Identifiants publics des pixels (pas des secrets). Format strict : rien d'autre n'est injecté dans un script. */
export const META_FORMAT = /^\d{5,20}$/;
export const MAX_META_PIXELS = 10;
export const PIXELS: { key: Single; label: string; example: string; format: RegExp; help: string }[] = [
  { key: "tiktokPixelId", label: "Pixel TikTok", example: "C1A2B3C4D5E6F7G8H9", format: /^[A-Z0-9]{8,30}$/, help: "TikTok Ads Manager > Outils > Événements." },
  { key: "ga4Id", label: "Google Analytics 4", example: "G-ABC123XYZ", format: /^G-[A-Z0-9]{4,15}$/, help: "Admin > Flux de données > ID de mesure." },
  { key: "googleAdsId", label: "Google Ads (conversions)", example: "AW-123456789", format: /^AW-\d{5,15}$/, help: "Google Ads > Objectifs > Conversions > Balise." },
  { key: "gtmId", label: "Google Tag Manager (facultatif)", example: "GTM-ABC1234", format: /^GTM-[A-Z0-9]{4,10}$/, help: "Utile seulement si vous gérez vos balises dans GTM." },
];

export const validIds = (ids: PixelIds): PixelIds => ({
  metaPixelIds: [...new Set((ids.metaPixelIds ?? []).filter((id) => META_FORMAT.test(id)))].slice(0, MAX_META_PIXELS),
  ...(Object.fromEntries(PIXELS.map((p) => [p.key, p.format.test(ids[p.key] ?? "") ? ids[p.key] : ""])) as Record<Single, string>),
});

export const hasAnyPixel = (ids: PixelIds) => ids.metaPixelIds.length > 0 || PIXELS.some((p) => ids[p.key]);

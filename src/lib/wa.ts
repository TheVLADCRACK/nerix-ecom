// Messages WhatsApp en un clic : modèle de la boutique + variables de la commande.
import { xaf } from "./format";

export type WaVars = { prenom: string; nom: string; numero: string; articles: string; total: number; ville: string; boutique: string };

/** Remplace {prenom}, {nom}… ; une variable inconnue reste telle quelle. */
export const waText = (tpl: string, v: WaVars) =>
  tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k === "total" ? xaf(v.total) : k in v ? String(v[k as keyof WaVars]) : m)).replace(/\s+/g, " ").trim();

export const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

export const lineList = (lines: { name: string; quantity: number }[]) => lines.map((l) => `${l.name} × ${l.quantity}`).join(", ");

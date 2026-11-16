/** 14900 → « 14 900 » (espaces fines insécables, chiffres entiers). */
export const nf = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/[\u202f\u00a0 ]/g, "\u202f");

/** 14900 → « 14 900 FCFA ». */
export const xaf = (amount: number) => `${nf(amount)}\u00a0FCFA`;

export function dateFr(d: Date | string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Douala" });
}

export function dateTimeFr(d: Date | string): string {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Douala" });
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Numéro camerounais → E.164. Accepte « 6XX XX XX XX », « 2XX… », « 237… », « +237… ».
 * Renvoie null si le numéro n'est pas un numéro camerounais à 9 chiffres valide.
 */
export function normalizeCmPhone(input: string): string | null {
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+237")) d = d.slice(4);
  else if (d.startsWith("00237")) d = d.slice(5);
  else if (d.startsWith("237") && d.length === 12) d = d.slice(3);
  return /^[26]\d{8}$/.test(d) ? `+237${d}` : null;
}

export function displayPhone(e164: string): string {
  const d = e164.replace("+237", "");
  return `+237 ${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

/** Délai de livraison en minutes → « 30 min à 1 h 30 », « 24 h », « 2 à 3 jours ». */
export function etaText(min: number, max: number): string {
  // Moins d'une heure : en minutes (« 30 min ») ; sinon « 1 h 30 », « 2 h ».
  const h = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m / 60} h`);
  if (max <= 24 * 60) return min === max ? h(max) : `${h(min)} à ${h(max)}`;
  const d = (m: number) => Math.round(m / 1440);
  return d(min) === d(max) ? `${d(max)} jours` : `${d(min)} à ${d(max)} jours`;
}

/** Frais de livraison facturés au client : 0 = offerte (le classeur réel ne facture jamais la livraison au client). */
export const feeText = (fee: number) => (fee > 0 ? xaf(fee) : "Offerte");

/** Mobile camerounais (WhatsApp possible) : 62, 65 à 69 puis 7 chiffres. Les fixes (2…) sont refusés pour une commande. */
export const isCmMobile = (e164: string | null): e164 is string => !!e164 && /^\+2376[25-9]\d{7}$/.test(e164);

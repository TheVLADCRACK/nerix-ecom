// Bordereau de commande minimaliste en PDF (une page A5), sans dépendance. Utilisable navigateur et serveur.
// Volontairement sans téléphone ni email : le numéro de commande suffit pour le suivi.

export type Slip = {
  store: string;
  number: string;
  placedAt: string;
  lines: { name: string; variant: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  shipping: number;
  discount?: number;
  /** Anciennes commandes seulement (frais ajoutés avant SasPay). */
  paymentFee?: number;
  paymentLabel?: string;
  total: number;
  paid: boolean;
  trackUrl: string;
  /** Facture (commande payée en ligne) : client, référence et montant débité par le prestataire (frais inclus). */
  invoice?: { customer: string; city: string; paidAt: string; reference: string; charged: number };
};

const W = 420;
const H = 595;
const M = 36;

// Caractères Unicode → WinAnsiEncoding (les polices standard PDF ne connaissent que ce jeu).
const WIN: Record<string, number> = { "€": 0x80, "…": 0x85, "’": 0x92, "‘": 0x91, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97, "œ": 0x9c, "Œ": 0x8c };
export function ansi(s: string): string {
  let out = "";
  for (const ch of s.replace(/[   ]/g, " ")) {
    const c = ch.codePointAt(0)!;
    const b = WIN[ch] ?? (c < 0x80 || (c >= 0xa0 && c <= 0xff) ? c : 0x3f);
    const t = String.fromCharCode(b);
    out += t === "(" || t === ")" || t === "\\" ? `\\${t}` : t;
  }
  return out;
}

// shortcut: largeur approximative (Helvetica ≈ 0,55 em, espace 0,28) pour aligner à droite ; suffisant pour des montants.
export const width = (s: string, size: number) => [...s].reduce((w, ch) => w + (ch === " " ? 0.28 : /[A-Z]/.test(ch) ? 0.67 : 0.55), 0) * size;
const fmt = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function slipPdf(s: Slip): Uint8Array {
  const ops: string[] = [];
  const text = (x: number, y: number, t: string, size = 10, bold = false, gray = 0) =>
    ops.push(`BT ${gray} g /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${ansi(t)}) Tj ET`);
  const right = (y: number, t: string, size = 10, bold = false, gray = 0) => text(W - M - width(t, size), y, t, size, bold, gray);
  const rule = (y: number, gray = 0.85) => ops.push(`${gray} G 0.6 w ${M} ${y} m ${W - M} ${y} l S`);

  let y = H - M - 14;
  text(M, y, s.store, 18, true);
  right(y + 2, s.invoice ? "Facture" : "Bordereau de commande", s.invoice ? 12 : 9, !!s.invoice, s.invoice ? 0 : 0.45);
  y -= 34;
  text(M, y, "Commande", 9, false, 0.45);
  right(y, "Date", 9, false, 0.45);
  y -= 16;
  text(M, y, s.number, 14, true);
  right(y, new Date(s.placedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Douala" }), 10);
  if (s.invoice) {
    y -= 20;
    text(M, y, `Facturé à : ${cut(s.invoice.customer, 40)}${s.invoice.city ? `, ${s.invoice.city}` : ""}`, 9.5);
    y -= 14;
    text(M, y, `Payé le ${new Date(s.invoice.paidAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Douala" })}${s.invoice.reference ? ` · réf. ${s.invoice.reference}` : ""}`, 9, false, 0.45);
  }
  y -= 22;
  rule(y);

  y -= 22;
  text(M, y, "Article", 9, false, 0.45);
  right(y, "Montant", 9, false, 0.45);
  for (const l of s.lines.slice(0, 12)) {
    y -= 22;
    text(M, y, cut(l.name, 46), 10.5, true);
    right(y, fmt(l.unitPrice * l.quantity), 10.5);
    y -= 13;
    text(M, y, `${l.variant && l.variant !== "Standard" ? `${l.variant} · ` : ""}${l.quantity} × ${fmt(l.unitPrice)}`, 9, false, 0.45);
  }
  y -= 18;
  rule(y);

  const row = (label: string, value: string, bold = false, size = 10) => { y -= 18; text(M, y, label, size, bold); right(y, value, size, bold); };
  row("Sous-total", fmt(s.subtotal));
  row("Livraison", s.shipping > 0 ? fmt(s.shipping) : "Offerte");
  if (s.discount) row("Remise", `- ${fmt(s.discount)}`);
  if (s.paymentFee) row(`Frais ${s.paymentLabel ?? "de paiement"}`, fmt(s.paymentFee));
  y -= 6;
  row("Total", fmt(s.total), true, 13);
  if (s.invoice && s.invoice.charged > s.total) {
    row("Frais du prestataire de paiement (SasPay)", fmt(s.invoice.charged - s.total), false, 9);
    row("Montant débité", fmt(s.invoice.charged), true, 10);
  }

  y -= 34;
  const label = s.paid ? `Payé${s.paymentLabel ? ` par ${s.paymentLabel}` : ""}` : "Paiement en attente : à régler à la livraison";
  ops.push(`${s.paid ? "0.9 0.97 0.92" : "0.99 0.95 0.86"} rg ${M} ${y - 10} ${W - 2 * M} 30 re f`);
  text(M + 12, y, label, 11, true, 0);

  text(M, M + 14, s.invoice ? "Facture établie à partir de la commande et de la confirmation de paiement." : "Suivez votre commande avec ce numéro :", 8.5, false, 0.45);
  text(M, M, cut(s.trackUrl, 70), 8.5, false, 0.2);

  return pdfFile(ops.join("\n"), W, H);
}

/** Assemble un PDF d'une page (Helvetica et Helvetica-Bold, WinAnsi) à partir d'un flux de dessin. */
export function pdfFile(stream: string, w: number, h: number): Uint8Array {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Chaque caractère est un octet (≤ 0xFF) : longueur de chaîne = longueur en octets, donc offsets exacts.
  return Uint8Array.from(pdf, (c) => c.charCodeAt(0));
}

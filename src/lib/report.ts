// Exports du compte de résultat : CSV pour Excel (séparateur « ; », BOM UTF-8) et PDF A4 paysage.
import { ansi, pdfFile, width } from "./slip-pdf";

export type ReportRow = { label: string; delivered: number; revenue: number; cogs: number; delivery: number; ads: number; charges: number; losses: number; withdraw: number; tax: number; net: number };
const COLS: [keyof ReportRow, string][] = [["label", "Période"], ["delivered", "Livrées"], ["revenue", "Chiffre d'affaires"], ["cogs", "Coût des produits"], ["delivery", "Livraison"], ["ads", "Publicité"], ["charges", "Charges"], ["losses", "Pertes"], ["withdraw", "Frais de retrait"], ["tax", "Impôts et taxes"], ["net", "Bénéfice net"]];

/** CSV lisible par Excel en français : « ; » et virgule décimale ; les cellules sont protégées contre l'injection de formules. */
export function reportCsv(rows: ReportRow[]): string {
  const cell = (v: string | number) => {
    const s = typeof v === "number" ? String(Math.round(v)) : v;
    const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
    return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "\uFEFF" + [COLS.map(([, h]) => h), ...rows.map((r) => COLS.map(([k]) => r[k]))].map((l) => l.map(cell).join(";")).join("\r\n");
}

const fmt = (n: number) => `${Math.round(n) < 0 ? "-" : ""}${Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;

/** PDF A4 paysage : titre, tableau mensuel, ligne de total. */
export function reportPdf(store: string, title: string, rows: ReportRow[], total: ReportRow): Uint8Array {
  const W = 842, H = 595, M = 32;
  const ops: string[] = [];
  const text = (x: number, y: number, s: string, size = 9, bold = false, gray = 0) => ops.push(`BT ${gray} g /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${ansi(s)}) Tj ET`);
  // Bord droit de chaque colonne de chiffres (la colonne 0, le libellé, part de la marge gauche).
  const right = [0, 130, 215, 300, 370, 440, 505, 565, 635, 715, W - M];
  const cellAt = (i: number, y: number, s: string, size = 9, bold = false) => (i === 0 ? text(M, y, s, size, bold) : text(right[i]! - width(s, size), y, s, size, bold));
  let y = H - M - 10;
  text(M, y, store, 16, true);
  y -= 18; text(M, y, title, 11, false, 0.35);
  y -= 26;
  COLS.forEach(([, h], i) => cellAt(i, y, h, 8, true));
  ops.push(`0.8 G 0.6 w ${M} ${y - 6} m ${W - M} ${y - 6} l S`);
  for (const r of rows) { y -= 18; COLS.forEach(([k], i) => cellAt(i, y, k === "label" ? String(r.label) : fmt(r[k] as number))); }
  y -= 10; ops.push(`0 G 1 w ${M} ${y} m ${W - M} ${y} l S`);
  y -= 16; COLS.forEach(([k], i) => cellAt(i, y, k === "label" ? "Total" : fmt(total[k] as number), 9, true));
  text(M, M, `Montants en FCFA. Généré le ${new Date().toLocaleDateString("fr-FR")}.`, 8, false, 0.45);
  return pdfFile(ops.join("\n"), W, H);
}

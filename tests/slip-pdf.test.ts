import { describe, expect, it } from "vitest";
import { slipPdf } from "../src/lib/slip-pdf";

const slip = {
  store: "Energy Plus",
  number: "EP-2026-123456",
  placedAt: "2026-11-14T10:00:00Z",
  lines: [{ name: "MosqitoShot, lampe (anti-moustiques)", variant: "Standard", quantity: 2, unitPrice: 10000 }],
  subtotal: 20000,
  shipping: 0,
  total: 20000,
  paid: false,
  trackUrl: "energyplus.ecom.nerix.site/suivi-commande",
};

describe("slipPdf", () => {
  const bytes = slipPdf(slip);
  const s = String.fromCharCode(...bytes);

  it("produit un PDF dont la table xref pointe sur chaque objet", () => {
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    const start = Number(s.match(/startxref\n(\d+)/)![1]);
    expect(s.slice(start, start + 4)).toBe("xref");
    const offsets = [...s.slice(start).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(s.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });

  it("indique le paiement reçu et ses frais", () => {
    const paid = String.fromCharCode(...slipPdf({ ...slip, paid: true, paymentFee: 1200, paymentLabel: "Orange Money", total: 21200 }));
    expect(paid).toContain("Pay\xe9 par Orange Money");
    expect(paid).toContain("Frais Orange Money");
  });

  it("échappe les parenthèses, encode les accents et n'inclut aucun téléphone", () => {
    expect(s).toContain("lampe \\(anti-moustiques\\)");
    expect(s).toContain(`Paiement en attente : ${String.fromCharCode(0xe0)} r${String.fromCharCode(0xe9)}gler`);
    expect(s).not.toMatch(/\+237|6\d{8}/);
  });
});

import { reportCsv, reportPdf } from "../src/lib/report";

describe("exports du compte de résultat", () => {
  const row = { label: "Juillet", delivered: 30, revenue: 300000, cogs: 33000, delivery: 30000, ads: 50000, charges: 4000, losses: 0, withdraw: 0, tax: 45750, net: 137250 };
  it("CSV Excel : BOM, séparateur ; et neutralise une formule", () => {
    const csv = reportCsv([row, { ...row, label: "=HYPERLINK(1)" }]);
    expect(csv.startsWith("\uFEFFPériode;Livrées")).toBe(true);
    expect(csv).toContain("Juillet;30;300000;33000");
    expect(csv).toContain("'=HYPERLINK(1)");
  });
  it("PDF valide (xref cohérente)", () => {
    const s = String.fromCharCode(...reportPdf("Energy Plus", "Compte de résultat 2026", [row], { ...row, label: "Total" }));
    const start = Number(s.match(/startxref\n(\d+)/)![1]);
    expect(s.slice(start, start + 4)).toBe("xref");
  });
});

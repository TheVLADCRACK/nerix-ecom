import { describe, expect, it } from "vitest";
import { etaText, isCmMobile, normalizeCmPhone, nf, xaf } from "@/lib/format";

describe("format", () => {
  it("formate les montants en FCFA avec espaces insécables", () => {
    expect(nf(14900)).toBe("14 900");
    expect(xaf(1500)).toBe("1 500 FCFA");
    expect(xaf(0)).toBe("0 FCFA");
  });
  it("normalise les numéros camerounais en E.164", () => {
    expect(normalizeCmPhone("690 00 00 00")).toBe("+237690000000");
    expect(normalizeCmPhone("+237 6 90 00 00 00")).toBe("+237690000000");
    expect(normalizeCmPhone("237690000000")).toBe("+237690000000");
    expect(normalizeCmPhone("00237 222 22 22 22")).toBe("+237222222222");
  });
  it("refuse les numéros invalides", () => {
    expect(normalizeCmPhone("12345")).toBeNull();
    expect(normalizeCmPhone("790000000")).toBeNull();
    expect(normalizeCmPhone("+33612345678")).toBeNull();
  });

  it("accepte seulement un mobile camerounais pour une commande", () => {
    expect(isCmMobile(normalizeCmPhone("690000000"))).toBe(true);
    expect(isCmMobile(normalizeCmPhone("+237 677 00 00 00"))).toBe(true);
    expect(isCmMobile(normalizeCmPhone("222 22 22 22"))).toBe(false);
    expect(isCmMobile(normalizeCmPhone("1"))).toBe(false);
  });
});

describe("délai de livraison", () => {
  it("affiche les minutes sous une heure, puis heures et minutes", () => {
    expect(etaText(30, 90)).toBe("30 min à 1 h 30");
    expect(etaText(60, 120)).toBe("1 h à 2 h");
    expect(etaText(45, 45)).toBe("45 min");
    expect(etaText(2880, 4320)).toBe("2 à 3 jours");
  });
});

describe("modèles WhatsApp", () => {
  it("remplace les variables et garde les inconnues", async () => {
    const { waText } = await import("@/lib/wa");
    const v = { prenom: "Awa", nom: "N.", numero: "EP-2026-000001", articles: "Lampe × 2", total: 20000, ville: "Douala", boutique: "Energy Plus" };
    expect(waText("Bonjour {prenom}, commande {numero} : {articles}, {total}, {x}", v)).toBe("Bonjour Awa, commande EP-2026-000001 : Lampe × 2, 20 000 FCFA, {x}");
  });
});

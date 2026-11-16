"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { type Slip, slipPdf } from "@/lib/slip-pdf";
import { orderInvoice, orderPaymentStatus } from "@/server/actions/shop";
import { track } from "./tracking";

export const slipKey = (number: string) => `slip:${number}`;
type Stored = Slip & { online?: boolean };

function download(s: Slip) {
  const name = `${s.invoice ? "facture" : "bordereau"}-${s.number}.pdf`;
  const url = URL.createObjectURL(new Blob([slipPdf(s) as BlobPart], { type: "application/pdf" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Bordereau proposé au téléchargement (jamais automatique) ; Purchase envoyé une seule fois.
 * Paiement en ligne : attend la confirmation du serveur (vérification SasPay) avant de marquer « Payé ».
 */
export function SlipDownload({ storeSlug, number, token }: { storeSlug: string; number: string; token: string }) {
  const [slip, setSlip] = useState<Stored | null>(null);
  const [state, setState] = useState<"idle" | "waiting" | "failed" | "timeout">("idle");

  const finish = (s: Stored) => {
    try {
      sessionStorage.setItem(slipKey(number), JSON.stringify(s));
      if (sessionStorage.getItem(`${slipKey(number)}:done`)) return;
      sessionStorage.setItem(`${slipKey(number)}:done`, "1");
    } catch { return; }
    track("Purchase", { orderNumber: s.number, value: s.total, items: s.lines.map((l) => ({ id: l.name, name: l.name, value: l.unitPrice, quantity: l.quantity })) });
  };

  useEffect(() => {
    let s: Stored | null = null;
    try { s = JSON.parse(sessionStorage.getItem(slipKey(number)) ?? "null") as Stored | null; } catch { /* stockage indisponible */ }
    if (!s || s.number !== number) return;
    setSlip(s);
    if (!s.online || s.paid) return finish(s);
    // Mobile Money ou carte : vérification toutes les 4 s pendant 3 minutes au plus.
    setState("waiting");
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const r = token ? await orderPaymentStatus(storeSlug, number, token).catch(() => null) : null;
      if (r?.paid) { clearInterval(timer); const paid = { ...s!, paid: true }; setSlip(paid); setState("idle"); finish(paid); }
      else if (r?.failed) { clearInterval(timer); setState("failed"); }
      else if (tries >= 45) { clearInterval(timer); setState("timeout"); }
    }, 4000);
    return () => clearInterval(timer);
  }, [number, storeSlug, token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!slip) return null;
  return (
    <>
      {state === "waiting" && <p role="status" style={{ width: "100%", textAlign: "center", fontWeight: 600 }}>Vérification de votre paiement… Cette page se met à jour toute seule.</p>}
      {state === "failed" && <p role="alert" style={{ width: "100%", textAlign: "center", fontWeight: 600, color: "var(--badge)" }}>Le paiement n'a pas abouti. Votre commande est gardée : nous vous appelons pour la régler à la livraison.</p>}
      {state === "timeout" && <p role="status" style={{ width: "100%", textAlign: "center" }}>Paiement pas encore confirmé. Si vous avez validé, il apparaîtra dans quelques minutes ; sinon nous vous appelons.</p>}
      {slip.paid && <p role="status" style={{ width: "100%", textAlign: "center", fontWeight: 600, color: "var(--ok)" }}>Paiement reçu{slip.paymentLabel ? ` par ${slip.paymentLabel}` : ""} : rien à payer à la livraison.</p>}
      {state !== "waiting" && <button type="button" className="sf-btn gold" onClick={() => download(slip)}><Icon name="download" size={16} /> Télécharger le bordereau</button>}
      {slip.paid && slip.online && token && <button type="button" className="sf-btn outline" onClick={async () => { const inv = await orderInvoice(storeSlug, number, token).catch(() => null); if (inv) download({ ...inv, trackUrl: slip.trackUrl }); }}><Icon name="download" size={16} /> Télécharger la facture</button>}
    </>
  );
}

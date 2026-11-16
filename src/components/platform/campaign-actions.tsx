"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { editCampaign } from "@/server/actions/manage";

/** Arrêter ou relancer une campagne, ou ajouter du budget (les résultats suivent la période). */
export function CampaignActions({ storeSlug, id, running }: { storeSlug: string; id: string; running: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [add, setAdd] = useState<string | null>(null);
  const run = (input: Parameters<typeof editCampaign>[2]) => start(async () => { const r = await editCampaign(storeSlug, id, input); if (!r.ok) alert(r.error); setAdd(null); router.refresh(); });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <span style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {add === null ? (
        <button type="button" className="nx-btn sm" disabled={pending} onClick={() => setAdd("")}><Icon name="plus" size={13} /> Budget</button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); const n = Number(add.replace(/\s/g, "").replace(",", ".")); if (n > 0) run({ action: "budget", add: n }); }} style={{ display: "flex", gap: 4 }}>
          <input className="nx-input mono" style={{ width: 90, height: 30 }} inputMode="decimal" autoFocus placeholder="Montant" aria-label="Budget à ajouter (devise de la campagne)" value={add} onChange={(e) => setAdd(e.target.value)} />
          <button className="nx-btn sm dark" disabled={pending}>OK</button>
        </form>
      )}
      {running
        ? <button type="button" className="nx-btn sm" disabled={pending} onClick={() => confirm("Arrêter la campagne aujourd'hui ?") && run({ action: "stop", end: today })}>Arrêter</button>
        : <button type="button" className="nx-btn sm" disabled={pending} onClick={() => run({ action: "resume" })}>Relancer</button>}
    </span>
  );
}

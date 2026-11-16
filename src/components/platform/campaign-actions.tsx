"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { editCampaign } from "@/server/actions/manage";

/**
 * Ajouter du budget (compté le jour de l'ajout), arrêter une campagne à une date (aujourd'hui par défaut, ou sa vraie date de fin),
 * ou la relancer. Arrêter ou relancer ne change que la période des résultats, jamais la dépense.
 */
export function CampaignActions({ storeSlug, id, running, start: startDate, end }: { storeSlug: string; id: string; running: boolean; start: string; end: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [add, setAdd] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [stopOn, setStopOn] = useState<string | null>(null);
  const run = (input: Parameters<typeof editCampaign>[2]) => start(async () => { const r = await editCampaign(storeSlug, id, input); if (!r.ok) alert(r.error); setAdd(null); setStopOn(null); router.refresh(); });
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
      {stopOn !== null ? (
        <form onSubmit={(e) => { e.preventDefault(); if (stopOn) run({ action: "stop", end: stopOn }); }} style={{ display: "flex", gap: 4 }}>
          <input type="date" className="nx-input mono" style={{ height: 30 }} min={startDate} max={today} value={stopOn} onChange={(e) => setStopOn(e.target.value)} aria-label="Date de fin de la campagne" />
          <button className="nx-btn sm dark" disabled={pending}>{running ? "Arrêter" : "OK"}</button>
        </form>
      ) : running ? (
        <button type="button" className="nx-btn sm" disabled={pending} onClick={() => setStopOn(today)}>Arrêter</button>
      ) : (
        <>
          <button type="button" className="nx-btn sm" disabled={pending} onClick={() => setStopOn(end ?? today)} title="Corriger la date de fin">Date de fin</button>
          <button type="button" className="nx-btn sm" disabled={pending} onClick={() => run({ action: "resume" })}>Relancer</button>
        </>
      )}
    </span>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOrder } from "@/server/actions/manage";
import { Icon } from "@/components/ui/icons";
import { xaf } from "@/lib/format";
import type { Order } from "@/lib/types";

type Props = { storeSlug: string; number: string; status: Order["status"]; courier?: string; fee?: number; discount?: number; deliveredAt?: string; couriers: string[]; reasons: string[]; subtotal: number; cost: number; whatsapp: string | null };

/**
 * Suivi d'une commande : confirmer, affecter le partenaire, saisir ce qu'il facture, marquer livrée ou annulée.
 * Étape B : Server Action requirePermission("orders.update") + Zod ; « livrée » passe la commande en payée (COD), sort le stock et alimente la comptabilité.
 */
export function OrderDelivery(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(p.status);
  const run = (input: Parameters<typeof updateOrder>[2], next: Order["status"]) => start(async () => {
    const r = await updateOrder(p.storeSlug, p.number, input);
    if (!r.ok) return setErr(r.error);
    setErr(""); setStatus(next); router.refresh();
  });
  const [courier, setCourier] = useState(p.courier ?? "");
  const [fee, setFee] = useState(p.fee ? String(p.fee) : "");
  const [date, setDate] = useState((p.deliveredAt ?? new Date().toISOString()).slice(0, 10));
  const [reason, setReason] = useState("");
  const [discount, setDiscount] = useState(p.discount ? String(p.discount) : "");
  const [err, setErr] = useState("");
  const done = status === "completed" || status === "cancelled";
  const feeN = Number(fee.replace(/\s/g, "")) || 0;
  const discN = Math.min(p.subtotal, Number(discount.replace(/\s/g, "")) || 0);
  const total = p.subtotal - discN;
  const margin = total - p.cost - feeN;

  const deliver = () => {
    if (!courier) return setErr("Choisissez qui a livré.");
    if (fee === "" || feeN < 0) return setErr("Indiquez les frais de cette livraison, y compris quand vous livrez vous-même.");
    run({ action: "deliver", courier, courierFee: feeN, deliveredOn: date, discount: discN }, "completed");
  };
  const cancel = () => { if (!reason) return setErr("Choisissez le motif d'annulation."); run({ action: "cancel", reason }, "cancelled"); };

  return (
    <div className="nx-card nx-grid">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(["pending", "confirmed", "completed"] as const).map((s, i) => {
          const reached = status !== "cancelled" && (s === "pending" || (s === "confirmed" ? status !== "pending" : status === "completed"));
          return <span key={s} className={`nx-pill ${reached ? (s === "completed" ? "ok" : "info") : "off"}`}>{i + 1}. {{ pending: "Reçue", confirmed: "Confirmée", completed: "Livrée" }[s]}</span>;
        })}
        {status === "cancelled" && <span className="nx-pill bad">Annulée</span>}
      </div>
      {status === "pending" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="nx-btn dark" disabled={pending} onClick={() => run({ action: "confirm" }, "confirmed")}><Icon name="phone" size={16} /> Client appelé : confirmer</button>
          {p.whatsapp && <a className="nx-btn" href={p.whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="message" size={16} /> Confirmer par WhatsApp</a>}
        </div>
      )}
      <div className="nx-form-grid">
        <label className="nx-field"><span>Livré par</span>
          <select className="nx-select" value={courier} onChange={(e) => setCourier(e.target.value)} disabled={done}>
            <option value="">Choisir…</option>{p.couriers.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="nx-field"><span>Frais de livraison</span>
          <input className="nx-input mono" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} disabled={done} placeholder="Ex. 1500" />
        </label>
        <label className="nx-field"><span>Date de livraison</span><input type="date" className="nx-input" value={date} onChange={(e) => setDate(e.target.value)} disabled={done} /></label>
        <label className="nx-field"><span>Remise accordée</span>
          <input className="nx-input mono" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={done} placeholder="0" />
        </label>
        <label className="nx-field"><span>Motif si annulée</span>
          <select className="nx-select" value={reason} onChange={(e) => setReason(e.target.value)} disabled={done}><option value="">—</option>{p.reasons.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
      </div>
      <dl className="nx-dl" style={{ gridTemplateColumns: "1fr auto" }}>
        {discN > 0 && <><dt>Remise</dt><dd className="mono">− {xaf(discN)}</dd></>}
        <dt>Encaissé</dt><dd className="mono">{xaf(total)}</dd>
        <dt>Coût des produits</dt><dd className="mono">− {xaf(Math.round(p.cost))}</dd>
        <dt>Livraison</dt><dd className="mono">− {xaf(feeN)}</dd>
        <dt><strong style={{ color: "var(--nx-ink)" }}>Marge sur la commande</strong></dt><dd className="mono"><strong style={{ color: margin >= 0 ? "var(--nx-green)" : "var(--nx-red)" }}>{xaf(Math.round(margin))}</strong></dd>
      </dl>
      {err && <small role="alert" style={{ color: "var(--nx-red)" }}>{err}</small>}
      {!done ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="nx-btn dark" disabled={pending} onClick={deliver}><Icon name="check" size={16} /> Marquer livrée et payée</button>
          <button type="button" className="nx-btn danger" disabled={pending} onClick={cancel}>Annuler la commande</button>
        </div>
      ) : (
        <small role="status" style={{ color: "var(--nx-muted)" }}>{status === "completed" ? `Livrée le ${date.split("-").reverse().join("/")}${courier ? ` par ${courier}` : ""}. Comptée dans le chiffre d'affaires et la comptabilité.` : "Commande annulée."}</small>
      )}
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { settleCourier } from "@/server/actions/manage";
import { Icon } from "@/components/ui/icons";
import { xaf } from "@/lib/format";

type Row = { courier: string; count: number; collected: number; fees: number; due: number; numbers: string[] };

/** Argent encaissé par les livreurs et pas encore reversé ; « Reçu » marque leurs commandes comme réglées (journal d'audit). */
export function Remittances({ storeSlug, rows }: { storeSlug: string; rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [paid, setPaid] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const open = rows.filter((r) => !paid.includes(r.courier));
  if (!open.length) return <p className="nx-empty">Rien à recevoir : tous les livreurs ont reversé ce qu'ils ont encaissé.</p>;
  return (
    <div className="nx-tablewrap">
      <table className="nx-table">
        <thead><tr><th scope="col">Livreur</th><th scope="col" className="right">Commandes</th><th scope="col" className="right">Encaissé</th><th scope="col" className="right">Ses frais</th><th scope="col" className="right">À vous reverser</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
        <tbody>
          {open.map((r) => (
            <tr key={r.courier}>
              <td>{r.courier}<br /><small className="muted">{r.numbers.slice(0, 3).join(", ")}{r.numbers.length > 3 ? "…" : ""}</small></td>
              <td className="right mono">{r.count}</td>
              <td className="right mono">{xaf(r.collected)}</td>
              <td className="right mono muted">− {xaf(r.fees)}</td>
              <td className="right mono"><strong>{xaf(r.due)}</strong></td>
              <td className="right"><button type="button" className="nx-btn sm" disabled={pending} onClick={() => start(async () => { const res = await settleCourier(storeSlug, r.courier); if (!res.ok) return setErr(res.error); setPaid([...paid, r.courier]); router.refresh(); })}><Icon name="check" size={14} /> Reçu</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {err && <p role="alert" style={{ color: "var(--nx-red)", padding: 12 }}>{err}</p>}
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { xaf } from "@/lib/format";
import { type OrderInput, saveOrder } from "@/server/actions/manage";

type Variant = { sku: string; label: string; price: number; available: number };
type Line = { sku: string; qty: number; price?: number };

const CHANNELS: [OrderInput["channel"], string][] = [["whatsapp", "WhatsApp"], ["appel", "Appel téléphonique"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["boutique", "En boutique"], ["autre", "Autre"]];

/**
 * Saisie d'une commande reçue hors boutique, ou modification d'une commande en cours (articles, quantités, client, ville).
 * L'aperçu du total est indicatif : le serveur recalcule prix, frais et stock.
 */
export function OrderEditor({ storeSlug, base, number, variants, cities, initial }: {
  storeSlug: string; base: string; number?: string; variants: Variant[]; cities: { id: string; name: string; fee: number }[];
  initial?: Omit<OrderInput, "lines" | "channel"> & { lines: Line[] };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? [{ sku: "", qty: 1 }]);
  const [cityId, setCityId] = useState(initial?.cityId ?? "");
  const [err, setErr] = useState("");
  const city = cities.find((c) => c.id === cityId);
  const price = (l: Line) => l.price ?? variants.find((v) => v.sku === l.sku)?.price ?? 0;
  const subtotal = lines.reduce((n, l) => n + price(l) * l.qty, 0);
  const set = (i: number, p: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p, ...(p.sku !== undefined && p.sku !== l.sku ? { price: undefined } : {}) } : l)));

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const chosen = lines.filter((l) => l.sku);
    if (!chosen.length) return setErr("Ajoutez au moins un article.");
    start(async () => {
      const r = await saveOrder(storeSlug, number ?? "", {
        firstName: get("firstName"), lastName: get("lastName"), phone: get("phone"), cityId, neighborhood: get("neighborhood"), landmark: get("landmark"), note: get("note"),
        channel: (get("channel") || "autre") as OrderInput["channel"], lines: chosen.map(({ sku, qty }) => ({ sku, qty })),
      });
      if (!r.ok) return setErr(r.error);
      router.push(`${base}/commandes/${r.number ?? number}`);
      router.refresh();
    });
  };

  return (
    <form className="nx-grid form" onSubmit={submit}>
      <div className="nx-grid">
        <section className="nx-panel">
          <header><span className="nx-label">Articles</span></header>
          <div className="nx-card nx-grid">
            {lines.map((l, i) => {
              const v = variants.find((x) => x.sku === l.sku);
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 84px auto", gap: 8, alignItems: "end" }}>
                  <label className="nx-field"><span>Produit</span>
                    <select className="nx-select" value={l.sku} onChange={(e) => set(i, { sku: e.target.value })}>
                      <option value="">Choisir…</option>
                      {variants.map((x) => <option key={x.sku} value={x.sku}>{x.label} · {xaf(x.price)} · stock {x.available}</option>)}
                    </select>
                  </label>
                  <label className="nx-field"><span>Qté</span><input className="nx-input mono" type="number" min={1} max={99} value={l.qty} onChange={(e) => set(i, { qty: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} /></label>
                  <button type="button" className="nx-btn icon" aria-label="Retirer l'article" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Icon name="trash" size={15} /></button>
                  {v && l.price !== undefined && l.price !== v.price && <small className="muted" style={{ gridColumn: "1 / -1" }}>Prix de la commande conservé : {xaf(l.price)} (prix actuel {xaf(v.price)}).</small>}
                </div>
              );
            })}
            <button type="button" className="nx-btn" onClick={() => setLines([...lines, { sku: "", qty: 1 }])} style={{ justifySelf: "start" }}><Icon name="plus" size={15} /> Ajouter un article</button>
            <dl className="nx-dl" style={{ gridTemplateColumns: "1fr auto" }}>
              <dt>Sous-total</dt><dd className="mono">{xaf(subtotal)}</dd>
              <dt>Livraison</dt><dd className="mono">{city ? xaf(city.fee) : "—"}</dd>
              <dt><strong style={{ color: "var(--nx-ink)" }}>Total</strong></dt><dd className="mono"><strong>{xaf(subtotal + (city?.fee ?? 0))}</strong></dd>
            </dl>
          </div>
        </section>
      </div>
      <div className="nx-grid">
        <section className="nx-panel">
          <header><span className="nx-label">Client et livraison</span></header>
          <div className="nx-card nx-grid">
            <div className="nx-form-grid">
              <label className="nx-field"><span>Prénom</span><input className="nx-input" name="firstName" required defaultValue={initial?.firstName} /></label>
              <label className="nx-field"><span>Nom</span><input className="nx-input" name="lastName" defaultValue={initial?.lastName} /></label>
            </div>
            <label className="nx-field"><span>Téléphone</span><input className="nx-input mono" name="phone" inputMode="tel" required placeholder="6 90 00 00 00" defaultValue={initial?.phone} /></label>
            <label className="nx-field"><span>Ville</span>
              <select className="nx-select" value={cityId} onChange={(e) => setCityId(e.target.value)} required><option value="">Choisir…</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
            <label className="nx-field"><span>Quartier</span><input className="nx-input" name="neighborhood" defaultValue={initial?.neighborhood} /></label>
            <label className="nx-field"><span>Point de repère</span><input className="nx-input" name="landmark" defaultValue={initial?.landmark} /></label>
            {!number && <label className="nx-field"><span>Commande reçue par</span><select className="nx-select" name="channel" defaultValue="whatsapp">{CHANNELS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>}
            <label className="nx-field"><span>Note interne</span><textarea className="nx-textarea" name="note" defaultValue={initial?.note} /></label>
            {err && <p role="alert" style={{ color: "var(--nx-red)", fontSize: 13.5 }}>{err}</p>}
            <button className="nx-btn dark" type="submit" disabled={pending}><Icon name="check" size={16} /> {pending ? "Enregistrement…" : number ? "Enregistrer les modifications" : "Enregistrer la commande"}</button>
          </div>
        </section>
      </div>
    </form>
  );
}

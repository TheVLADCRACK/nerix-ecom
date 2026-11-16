"use client";
import { useState, useTransition } from "react";
import { savePixels } from "@/server/actions/settings";
import { Icon } from "@/components/ui/icons";
import { MAX_META_PIXELS, META_FORMAT, PIXELS, type PixelIds } from "@/lib/pixels";

const Status = ({ ok }: { ok: boolean }) => (ok ? <span className="nx-pill ok">Actif</span> : <span className="nx-pill off">Inactif</span>);

/** Pixels de la boutique : enregistrés côté serveur (format revérifié, journal d'audit). */
export function PixelsForm({ storeSlug, initial }: { storeSlug: string; initial: PixelIds }) {
  const [ids, setIds] = useState<PixelIds>({ ...initial, metaPixelIds: initial.metaPixelIds.length ? initial.metaPixelIds : [""] });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const metaBad = (v: string) => !!v && !META_FORMAT.test(v);
  const dup = (v: string, i: number) => !!v && ids.metaPixelIds.indexOf(v) !== i;
  const bad = ids.metaPixelIds.some((v, i) => metaBad(v) || dup(v, i)) || PIXELS.some((p) => ids[p.key] && !p.format.test(ids[p.key]));
  const change = (next: PixelIds) => { setSaved(false); setIds(next); };
  const setMeta = (i: number, v: string) => change({ ...ids, metaPixelIds: ids.metaPixelIds.map((x, k) => (k === i ? v.trim() : x)) });
  return (
    <form className="nx-card nx-grid" onSubmit={(e) => { e.preventDefault(); if (bad) return; start(async () => { const r = await savePixels(storeSlug, ids); if (r.ok) { setErr(""); setSaved(true); } else setErr(r.error); }); }} noValidate>
      <fieldset className="nx-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--nx-ink-2)", marginBottom: 6 }}>
          Pixels Meta (Facebook, Instagram)
          <Status ok={ids.metaPixelIds.some((v) => META_FORMAT.test(v))} />
        </legend>
        {ids.metaPixelIds.map((v, i) => (
          <div key={i} style={{ display: "grid", gap: 4, marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="nx-input mono" value={v} placeholder="123456789012345" inputMode="numeric" autoComplete="off" aria-label={`Pixel Meta ${i + 1}`} aria-invalid={metaBad(v) || dup(v, i)} onChange={(e) => setMeta(i, e.target.value)} />
              <button type="button" className="nx-btn sm icon" aria-label={`Retirer le pixel Meta ${i + 1}`} onClick={() => change({ ...ids, metaPixelIds: ids.metaPixelIds.length > 1 ? ids.metaPixelIds.filter((_, k) => k !== i) : [""] })}><Icon name="trash" size={14} /></button>
            </div>
            {(metaBad(v) || dup(v, i)) && <small style={{ color: "var(--nx-red)" }}>{dup(v, i) ? "Ce pixel est déjà dans la liste." : "Un ID de pixel Meta ne contient que des chiffres (5 à 20)."}</small>}
          </div>
        ))}
        <button type="button" className="nx-btn sm" style={{ justifySelf: "start" }} disabled={ids.metaPixelIds.length >= MAX_META_PIXELS} onClick={() => change({ ...ids, metaPixelIds: [...ids.metaPixelIds, ""] })}><Icon name="plus" size={14} /> Ajouter un pixel Meta</button>
        <small>Gestionnaire d'événements Meta &gt; Sources de données. Chaque événement est envoyé à tous les pixels de la liste ({MAX_META_PIXELS} au maximum).</small>
      </fieldset>
      {PIXELS.map((p) => {
        const v = ids[p.key];
        const invalid = !!v && !p.format.test(v);
        return (
          <label key={p.key} className="nx-field">
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>{p.label}<Status ok={!!v && !invalid} /></span>
            <input className="nx-input mono" value={v} placeholder={p.example} autoComplete="off" spellCheck={false} aria-invalid={invalid} onChange={(e) => change({ ...ids, [p.key]: e.target.value.trim().toUpperCase() })} />
            <small style={invalid ? { color: "var(--nx-red)" } : undefined}>{invalid ? `Format attendu : ${p.example}` : p.help}</small>
          </label>
        );
      })}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="nx-btn dark" type="submit" disabled={bad || pending}><Icon name="check" size={16} /> Enregistrer</button>
        {saved && <span role="status" style={{ color: "var(--nx-green)", fontSize: 13 }}>Enregistré.</span>}
        {err && <span role="alert" style={{ color: "var(--nx-red)", fontSize: 13 }}>{err}</span>}
      </div>
    </form>
  );
}

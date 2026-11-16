"use client";
import { Fragment, useState } from "react";
import type { Trend } from "./ui";

const MODES: { key: keyof Trend; label: string }[] = [{ key: "semaine", label: "Jours" }, { key: "mois", label: "Semaines" }, { key: "annee", label: "Mois" }];
const ROWS = 20;

/** Arrondit vers le haut à une graduation lisible (1, 2, 2,5, 5 × 10ⁿ), au moins 5 pour des carrés d'une commande. */
function nice(v: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  return Math.max(5, [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= v)!);
}
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;

/** Commandes par période (maquette) : carrés noirs = commandes livrées, gris = non livrées (en cours ou annulées). */
export function SalesTrend({ trend }: { trend: Trend }) {
  const [mode, setMode] = useState<keyof Trend>("mois");
  const [hover, setHover] = useState<number | null>(null);
  const { points, ticks } = trend[mode];
  const top = nice(Math.max(1, ...points.map((p) => p.delivered + p.other)));
  const rows = Math.min(ROWS, top); // une commande = un carré quand le volume le permet
  const step = top / rows;
  const fill = (v: number) => (v > 0 ? Math.max(1, Math.round(v / step)) : 0);
  const total = points.reduce((s, p) => s + p.delivered + p.other, 0);
  const delivered = points.reduce((s, p) => s + p.delivered, 0);
  const h = hover !== null ? points[hover]! : null;
  return (
    <div className="nx-trend">
      <div className="top">
        <span className="tot"><span>Commandes :</span><strong className="mono">{total}</strong><span>dont livrées :</span><strong className="mono">{delivered}</strong></span>
        <span className="nx-legend"><span className="a">Livrées</span><span className="b">Non livrées</span></span>
        <div className="nx-segment" role="group" aria-label="Regrouper par">
          {MODES.map((m) => <button key={m.key} type="button" aria-current={m.key === mode} onClick={() => { setMode(m.key); setHover(null); }}>{m.label}</button>)}
        </div>
      </div>
      <div className="plot" onMouseLeave={() => setHover(null)}>
        <div className="axis" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((f) => <span key={f}>{Math.round((top * f) / 5)}</span>)}</div>
        <div className="cols" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
          {points.map((p, i) => {
            const d = fill(p.delivered);
            const o = fill(p.other);
            return (
              <button
                key={i} type="button" className="col" data-active={hover === i}
                aria-label={`${p.label} : ${plural(p.delivered + p.other, "commande")}, ${plural(p.delivered, "livrée")}`}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              >
                {Array.from({ length: rows }, (_, r) => <i key={r} className={r < d ? "on" : r < d + o ? "mid" : ""} />)}
                {hover === i && <b className="mark" style={{ bottom: `${(Math.min(rows, d + o) / rows) * 100}%` }} />}
              </button>
            );
          })}
          {h && hover !== null && (
            <div className="tip" style={{ left: `${((hover + 0.5) / points.length) * 100}%` }} data-flip={hover > points.length * 0.6} role="status">
              <div className="head">{h.label}</div>
              <div><span className="dot on" />Livrées <b className="mono">{h.delivered}</b></div>
              <div><span className="dot" />Non livrées <b className="mono">{h.other}</b></div>
            </div>
          )}
        </div>
        <div className="ticks" aria-hidden="true">
          {ticks.map((t, i) => (
            <Fragment key={t + i}>
              {i > 0 && <span className="sep">·</span>}
              <span data-active={h?.tick === i}>{t}</span>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import type { ProductBlock, ProductPage, ProductPageKey } from "@/lib/types";
import { saveProductBody, saveProductPage } from "@/server/actions/settings";

const LABELS: Record<ProductPageKey, [string, string]> = {
  assure: ["Garanties", "Paiement à la livraison, délai, appel… sous les boutons d'achat."],
  benefits: ["Pourquoi ce produit", "Les avantages saisis sur chaque produit."],
  blocks: ["Blocs du produit", "Textes et sections image + texte propres à chaque produit."],
  howto: ["Comment ça marche", "Les images de type « Créative » du produit."],
  reviews: ["Avis clients", "Seulement les avis réels publiés avec l'accord du client."],
  faq: ["Questions fréquentes", "La FAQ saisie sur chaque produit."],
  related: ["Produits similaires", "Carrousel des autres produits."],
};
const ICONS: ProductPage["assure"][number]["icon"][] = ["cash", "truck", "phone", "refresh", "shield", "gift", "star", "clock"];
const ICON_FR: Record<ProductPage["assure"][number]["icon"], string> = { cash: "Espèces", truck: "Camion", phone: "Téléphone", refresh: "Échange", shield: "Bouclier", gift: "Cadeau", star: "Étoile", clock: "Horloge" };
const move = <T,>(a: T[], i: number, d: number) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j]!, b[i]!]; return b; };

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (call: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) => start(async () => {
    const r = await call().catch(() => ({ ok: false as const, error: "Enregistrement impossible. Réessayez." }));
    setMsg(r.ok ? { ok: true, text: r.message ?? "Enregistré." } : { ok: false, text: r.error });
    if (r.ok) router.refresh();
  });
  return { pending, msg, run };
}
const Msg = ({ msg }: { msg: { ok: boolean; text: string } | null }) => msg && <small role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--nx-green)" : "var(--nx-red)" }}>{msg.text}</small>;
const Arrows = ({ i, n, onMove }: { i: number; n: number; onMove: (d: number) => void }) => (
  <span style={{ display: "flex", gap: 4 }}>
    <button type="button" className="nx-btn sm icon" aria-label="Monter" disabled={i === 0} onClick={() => onMove(-1)}><Icon name="up" size={14} /></button>
    <button type="button" className="nx-btn sm icon" aria-label="Descendre" disabled={i === n - 1} onClick={() => onMove(1)}><Icon name="down" size={14} /></button>
  </span>
);

/** Modèle commun à toutes les pages produit : ordre et visibilité des sections, boutons d'achat, garanties. */
export function ProductPageEditor({ storeSlug, initial }: { storeSlug: string; initial: ProductPage }) {
  const [p, setP] = useState(initial);
  const s = useSave();
  return (
    <div className="nx-grid form">
      <section className="nx-panel">
        <header><span className="nx-label">Sections (dans l'ordre d'affichage)</span></header>
        <div className="nx-card flush">
          <table className="nx-table">
            <tbody>
              <tr><td><strong style={{ fontWeight: 500 }}>Photos, prix et boutons d'achat</strong><br /><small className="muted">Toujours en haut de la page.</small></td><td /><td /></tr>
              {p.sections.map((x, i) => (
                <tr key={x.key} style={{ opacity: x.enabled ? 1 : 0.5 }}>
                  <td><strong style={{ fontWeight: 500 }}>{LABELS[x.key][0]}</strong><br /><small className="muted">{LABELS[x.key][1]}</small></td>
                  <td><label className="nx-check"><input type="checkbox" checked={x.enabled} onChange={(e) => setP({ ...p, sections: p.sections.map((y) => (y.key === x.key ? { ...y, enabled: e.target.checked } : y)) })} /> Affichée</label></td>
                  <td><Arrows i={i} n={p.sections.length} onMove={(d) => setP({ ...p, sections: move(p.sections, i, d) })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="nx-grid" style={{ alignContent: "start" }}>
        <section className="nx-panel">
          <header><span className="nx-label">Boutons d'achat</span></header>
          <div className="nx-card nx-grid">
            <label className="nx-check"><input type="checkbox" checked={p.addToCart} onChange={(e) => setP({ ...p, addToCart: e.target.checked })} /> Bouton « Ajouter au panier »</label>
            <label className="nx-check"><input type="checkbox" checked={p.buyNow} onChange={(e) => setP({ ...p, buyNow: e.target.checked })} /> Bouton « Acheter maintenant »</label>
          </div>
        </section>
        <section className="nx-panel">
          <header><span className="nx-label">Garanties</span>{p.assure.length < 6 && <button type="button" className="nx-btn sm" onClick={() => setP({ ...p, assure: [...p.assure, { icon: "shield", text: "" }] })}><Icon name="plus" size={14} /> Ajouter</button>}</header>
          <div className="nx-card nx-grid">
            <small className="muted"><code>{"{delai}"}</code> affiche le délai de livraison le plus court de vos villes. N'annoncez que ce que vous tenez réellement.</small>
            {p.assure.map((a, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 6, alignItems: "center", paddingBottom: 8, borderBottom: "1px solid var(--nx-line)" }}>
                <input className="nx-input" style={{ gridColumn: "1 / -1" }} value={a.text} maxLength={80} aria-label="Texte de la garantie" onChange={(e) => setP({ ...p, assure: p.assure.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                <select className="nx-select" value={a.icon} aria-label="Icône" onChange={(e) => setP({ ...p, assure: p.assure.map((x, j) => (j === i ? { ...x, icon: e.target.value as typeof a.icon } : x)) })}>{ICONS.map((ic) => <option key={ic} value={ic}>Icône : {ICON_FR[ic]}</option>)}</select>
                <Arrows i={i} n={p.assure.length} onMove={(d) => setP({ ...p, assure: move(p.assure, i, d) })} />
                <button type="button" className="nx-btn sm icon" aria-label="Retirer" onClick={() => setP({ ...p, assure: p.assure.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
              </div>
            ))}
          </div>
        </section>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="nx-btn dark" disabled={s.pending} onClick={() => s.run(() => saveProductPage(storeSlug, p))}><Icon name="check" size={16} /> {s.pending ? "Enregistrement…" : "Enregistrer"}</button>
          <Msg msg={s.msg} />
        </div>
      </div>
    </div>
  );
}

const NEW: Record<ProductBlock["type"], () => ProductBlock> = {
  benefits: () => ({ type: "benefits", items: [""] }),
  safety: () => ({ type: "safety", items: [""] }),
  text: () => ({ type: "text", title: "", body: "" }),
  imageText: () => ({ type: "imageText", title: "", body: "", image: "", reverse: false }),
  faq: () => ({ type: "faq", items: [{ q: "", a: "" }] }),
};
const BLOCK_LABEL: Record<ProductBlock["type"], string> = { benefits: "Avantages", safety: "Précautions", text: "Texte", imageText: "Image + texte", faq: "Questions fréquentes" };

/** Contenu de la page d'un produit : blocs ajoutés, modifiés, masqués, réordonnés. */
export function ProductBlocksEditor({ storeSlug, productSlug, initial, images }: { storeSlug: string; productSlug: string; initial: ProductBlock[]; images: { src: string; alt: string }[] }) {
  const [blocks, setBlocks] = useState(initial);
  const s = useSave();
  const set = (i: number, b: ProductBlock) => setBlocks(blocks.map((x, j) => (j === i ? b : x)));
  return (
    <section className="nx-panel">
      <header><span className="nx-label">Contenu de la page produit</span>
        <select className="nx-select" style={{ width: "auto" }} value="" aria-label="Ajouter un bloc" onChange={(e) => { const t = e.target.value as ProductBlock["type"]; if (t) setBlocks([...blocks, NEW[t]()]); }}>
          <option value="">+ Ajouter un bloc…</option>{Object.entries(BLOCK_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </header>
      <div className="nx-card nx-grid">
        {blocks.length === 0 && <p className="muted">Aucun bloc. Ajoutez des avantages, un texte, une image avec texte ou une FAQ.</p>}
        {blocks.map((b, i) => (
          <fieldset key={i} className="nx-grid" style={{ border: "1px solid var(--nx-line)", borderRadius: 12, padding: 12, opacity: b.hidden ? 0.55 : 1 }}>
            <legend style={{ display: "flex", gap: 8, alignItems: "center", padding: "0 6px" }}>
              <strong style={{ fontWeight: 600 }}>{BLOCK_LABEL[b.type]}</strong>
              <Arrows i={i} n={blocks.length} onMove={(d) => setBlocks(move(blocks, i, d))} />
              <button type="button" className="nx-btn sm" onClick={() => set(i, { ...b, hidden: !b.hidden })}><Icon name="eye" size={14} /> {b.hidden ? "Afficher" : "Masquer"}</button>
              <button type="button" className="nx-btn sm icon" aria-label="Supprimer le bloc" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}><Icon name="trash" size={14} /></button>
            </legend>
            {(b.type === "benefits" || b.type === "safety") && (
              <label className="nx-field"><span>Une ligne par point</span><textarea className="nx-textarea" value={b.items.join("\n")} onChange={(e) => set(i, { ...b, items: e.target.value.split("\n") })} /></label>
            )}
            {(b.type === "text" || b.type === "imageText") && (
              <>
                <label className="nx-field"><span>Titre</span><input className="nx-input" value={b.title} maxLength={120} onChange={(e) => set(i, { ...b, title: e.target.value })} /></label>
                <label className="nx-field"><span>Texte</span><textarea className="nx-textarea" value={b.body} onChange={(e) => set(i, { ...b, body: e.target.value })} /></label>
              </>
            )}
            {b.type === "imageText" && (
              <div className="nx-form-grid">
                <label className="nx-field"><span>Image</span><select className="nx-select" value={b.image} onChange={(e) => set(i, { ...b, image: e.target.value })}><option value="">Première photo</option>{images.map((im, k) => <option key={im.src} value={im.src}>Image {k + 1}{im.alt ? ` · ${im.alt.slice(0, 30)}` : ""}</option>)}</select></label>
                <label className="nx-check" style={{ alignSelf: "end" }}><input type="checkbox" checked={b.reverse} onChange={(e) => set(i, { ...b, reverse: e.target.checked })} /> Image à droite</label>
              </div>
            )}
            {b.type === "faq" && (
              <>
                {b.items.map((f, k) => (
                  <div key={k} className="nx-grid" style={{ gap: 6 }}>
                    <input className="nx-input" placeholder="Question" value={f.q} onChange={(e) => set(i, { ...b, items: b.items.map((x, j) => (j === k ? { ...x, q: e.target.value } : x)) })} />
                    <textarea className="nx-textarea" style={{ minHeight: 60 }} placeholder="Réponse" value={f.a} onChange={(e) => set(i, { ...b, items: b.items.map((x, j) => (j === k ? { ...x, a: e.target.value } : x)) })} />
                    {b.items.length > 1 && <button type="button" className="nx-btn sm ghost" style={{ justifySelf: "start" }} onClick={() => set(i, { ...b, items: b.items.filter((_, j) => j !== k) })}>Retirer cette question</button>}
                  </div>
                ))}
                <button type="button" className="nx-btn sm" style={{ justifySelf: "start" }} onClick={() => set(i, { ...b, items: [...b.items, { q: "", a: "" }] })}><Icon name="plus" size={14} /> Question</button>
              </>
            )}
          </fieldset>
        ))}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="nx-btn dark" disabled={s.pending} onClick={() => s.run(() => saveProductBody(storeSlug, productSlug,
            blocks.map((b) => (b.type === "benefits" || b.type === "safety" ? { ...b, items: b.items.map((x) => x.trim()).filter(Boolean) } : b.type === "faq" ? { ...b, items: b.items.filter((f) => f.q.trim() && f.a.trim()) } : b))))}>
            <Icon name="check" size={16} /> {s.pending ? "Enregistrement…" : "Enregistrer le contenu"}
          </button>
          <Msg msg={s.msg} />
        </div>
      </div>
    </section>
  );
}

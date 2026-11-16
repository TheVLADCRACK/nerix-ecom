"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { slugify } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { uploadImage } from "@/server/actions/manage";
import { addProductImage, removeProductImage, saveProduct } from "@/server/actions/settings";

type V = { id: string; title: string; sku: string; price: string; compareAt: string; available: number };
type Img = { src: string; srcSet: string; width: number; height: number; alt: string; kind: "photo" | "creative" };
export type StockItem = { product: string; skus: string[]; left: number };

/** Fiche produit de l'admin : infos, produit en stock lié, images (envoyées et ré-encodées côté serveur), variantes et prix, publication, référencement. */
export function ProductEditor({ storeSlug, base, product, categories, stockItems }: { storeSlug: string; base: string; product: Product | null; categories: Category[]; stockItems: StockItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [short, setShort] = useState(product?.short ?? "");
  const [status, setStatus] = useState(product?.status ?? "draft");
  const leaves = categories.filter((c) => c.parentPath || !categories.some((x) => x.parentPath === c.path));
  const [cat, setCat] = useState(product?.categoryPath ?? leaves[0]?.path ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "");
  const [seoDesc, setSeoDesc] = useState(product?.seoDescription ?? "");
  const [vars, setVars] = useState<V[]>(() => {
    const list = (product?.variants ?? []).map((v) => ({ id: v.id, title: v.title, sku: v.sku, price: String(v.price), compareAt: v.compareAt ? String(v.compareAt) : "", available: v.available }));
    return list.length ? list : [{ id: "", title: "Standard", sku: "", price: "", compareAt: "", available: 0 }];
  });
  const [kind, setKind] = useState<"photo" | "creative">("photo");
  const [soldOut, setSoldOut] = useState(product?.soldOutWhenEmpty ?? true);
  // Produit en stock déjà lié : par SKU, sinon par nom identique (achats saisis avant la fiche).
  const [stockRef, setStockRef] = useState(() => {
    const skus = product?.variants.map((v) => v.sku) ?? [];
    return (stockItems.find((s) => s.skus.some((k) => skus.includes(k))) ?? stockItems.find((s) => product && s.product === product.name))?.product ?? "";
  });
  const linked = stockItems.find((s) => s.product === stockRef);
  // Images d'un produit pas encore enregistré : gardées ici, ajoutées à la création.
  const [draftImgs, setDraftImgs] = useState<Img[]>([]);

  const setVar = (i: number, patch: Partial<V>) => setVars(vars.map((v, k) => (k === i ? { ...v, ...patch } : v)));
  /** Lier un produit en stock : reprend son nom si la fiche n'en a pas encore, et son SKU pour une variante vide. */
  const pickStock = (ref: string) => {
    setStockRef(ref);
    const s = stockItems.find((x) => x.product === ref);
    if (!s) return;
    if (!name.trim()) { setName(s.product); if (!product) setSlug(slugify(s.product)); }
    if (s.skus[0] && vars.length === 1 && !vars[0]!.sku) setVar(0, { sku: s.skus[0] });
  };
  const save = () => start(async () => {
    const r = await saveProduct(storeSlug, product?.slug ?? "nouveau", {
      name: name.trim(), slug: slug || slugify(name), short: short.trim(), status, categoryPath: cat, brand: brand.trim(), seoTitle: seoTitle.trim() || name.trim().slice(0, 70), seoDescription: seoDesc.trim(),
      variants: vars.map((v) => ({ id: v.id, title: v.title.trim(), sku: v.sku.trim().toUpperCase(), price: Number(v.price.replace(/\s/g, "")) || 0, compareAt: v.compareAt ? Number(v.compareAt.replace(/\s/g, "")) : null })),
      soldOutWhenEmpty: soldOut, stockProduct: stockRef, images: product ? [] : draftImgs,
    });
    setMsg(r.ok ? { ok: true, text: r.message ?? "Enregistré." } : { ok: false, text: r.error });
    if (r.ok) router.refresh();
  });
  const upload = (file: File) => start(async () => {
    const fd = new FormData(); fd.append("file", file);
    const up = await uploadImage(storeSlug, "products", fd);
    if (!up.ok) return setMsg({ ok: false, text: up.error });
    const img: Img = { src: up.src, srcSet: up.srcSet, width: up.width, height: up.height, alt: (product?.name ?? name.trim()).slice(0, 160), kind };
    if (!product) { setDraftImgs((l) => [...l, img]); return setMsg({ ok: true, text: "Image prête : elle sera ajoutée à l'enregistrement du produit." }); }
    const r = await addProductImage(storeSlug, product.slug, img);
    setMsg(r.ok ? { ok: true, text: "Image ajoutée." } : { ok: false, text: r.error });
    router.refresh();
  });

  return (
    <>
      <div className="nx-head">
        <Link href={`${base}/produits`} className="nx-btn icon" aria-label="Retour aux produits"><Icon name="arrowLeft" size={16} /></Link>
        <div><h1>{product?.name ?? "Nouveau produit"}</h1><p>{product ? `${storeSlug}.ecom.nerix.site/produits/${product.slug}` : "Brouillon"}</p></div>
        <div className="actions">
          {product && <a className="nx-btn" href={`/s/${storeSlug}/produits/${product.slug}`} target="_blank" rel="noopener"><Icon name="eye" size={16} /> Voir</a>}
          <button className="nx-btn dark" type="button" onClick={save} disabled={pending}><Icon name="check" size={16} /> {pending ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className="nx-alert" style={{ color: msg.ok ? "var(--nx-green)" : "var(--nx-red)" }}>{msg.text}</p>}
      <div className="nx-grid form">
        <div className="nx-grid">
          <section className="nx-panel">
            <header><span className="nx-label">Informations</span></header>
            <div className="nx-card nx-grid">
              <label className="nx-field"><span>Nom</span><input className="nx-input" value={name} maxLength={120} onChange={(e) => { setName(e.target.value); if (!product) setSlug(slugify(e.target.value)); }} /></label>
              <label className="nx-field"><span>Accroche</span><textarea className="nx-textarea" style={{ minHeight: 70 }} value={short} maxLength={400} onChange={(e) => setShort(e.target.value)} /><small>Affichée sous le titre et dans les cartes produit. Courte : les clients n'ont pas le temps de lire.</small></label>
              <label className="nx-field"><span>Produit en stock lié</span>
                <select className="nx-select" value={stockRef} onChange={(e) => pickStock(e.target.value)}>
                  <option value="">Aucun (pas encore acheté)</option>
                  {stockItems.map((s) => <option key={s.product} value={s.product}>{s.product} · {s.left} en stock</option>)}
                </select>
                <small>{linked ? `Le stock de cette fiche est celui de « ${linked.product} » (${linked.left} restants), alimenté par les achats.` : <>Choisissez le produit acheté auquel cette fiche se rapporte. La liste vient des <Link href={`${base}/achats`} style={{ color: "var(--nx-blue)" }}>achats</Link>.</>}</small>
              </label>
            </div>
          </section>
          <section className="nx-panel">
            <header>
              <span className="nx-label">Images</span>
              <div className="nx-segment" role="group" aria-label="Type des prochaines images">
                <button type="button" aria-current={kind === "photo"} onClick={() => setKind("photo")}>Photo</button>
                <button type="button" aria-current={kind === "creative"} onClick={() => setKind("creative")}>Créative</button>
              </div>
            </header>
            <div className="nx-card" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {product?.images.map((im) => (
                <figure key={im.src} style={{ margin: 0, position: "relative" }}>
                  <img src={im.src} alt={im.alt} style={{ width: 96, height: 96, objectFit: "contain", borderRadius: 10, border: "1px solid var(--nx-line)", background: "#fff" }} />
                  <figcaption style={{ fontSize: 11, color: "var(--nx-muted)", textAlign: "center" }}>{im.kind === "creative" ? "Créative" : "Photo"}</figcaption>
                  <button type="button" className="nx-btn sm icon danger" style={{ position: "absolute", top: 4, right: 4, height: 24, width: 24, padding: 0, justifyContent: "center" }} aria-label="Retirer l'image" disabled={pending}
                    onClick={() => start(async () => { await removeProductImage(storeSlug, product.slug, im.src); router.refresh(); })}><Icon name="x" size={12} /></button>
                </figure>
              ))}
              {draftImgs.map((im) => (
                <figure key={im.src} style={{ margin: 0, position: "relative" }}>
                  <img src={im.src} alt={im.alt} style={{ width: 96, height: 96, objectFit: "contain", borderRadius: 10, border: "1px dashed var(--nx-line)", background: "#fff" }} />
                  <figcaption style={{ fontSize: 11, color: "var(--nx-muted)", textAlign: "center" }}>{im.kind === "creative" ? "Créative" : "Photo"} · à enregistrer</figcaption>
                  <button type="button" className="nx-btn sm icon danger" style={{ position: "absolute", top: 4, right: 4, height: 24, width: 24, padding: 0, justifyContent: "center" }} aria-label="Retirer l'image" disabled={pending}
                    onClick={() => setDraftImgs((l) => l.filter((x) => x.src !== im.src))}><Icon name="x" size={12} /></button>
                </figure>
              ))}
              <label className="nx-new" style={{ width: 96, height: 96, minHeight: 0 }}><Icon name="image" /><small>{pending ? "Envoi…" : "JPEG, PNG, WebP · 10 Mo"}</small>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
              </label>
            </div>
          </section>
          <section className="nx-panel">
            <header><span className="nx-label">Variantes et prix</span><button className="nx-btn sm" type="button" onClick={() => setVars([...vars, { id: "", title: "", sku: "", price: "", compareAt: "", available: 0 }])}><Icon name="plus" size={14} /> Variante</button></header>
            <div className="nx-card flush">
              <div className="nx-tablewrap">
                <table className="nx-table">
                  <thead><tr><th scope="col">Variante</th><th scope="col">SKU</th><th scope="col">Prix (FCFA)</th><th scope="col">Prix barré</th><th scope="col" className="right">Stock</th><th scope="col"><span className="sr-only">Retirer</span></th></tr></thead>
                  <tbody>
                    {vars.map((v, i) => (
                      <tr key={v.id || `n${i}`}>
                        <td><input className="nx-input" value={v.title} onChange={(e) => setVar(i, { title: e.target.value })} aria-label="Nom de la variante" /></td>
                        <td><input className="nx-input mono" value={v.sku} onChange={(e) => setVar(i, { sku: e.target.value.toUpperCase() })} aria-label="SKU" placeholder="EP-XXX" /></td>
                        <td><input className="nx-input mono" inputMode="numeric" value={v.price} onChange={(e) => setVar(i, { price: e.target.value })} aria-label="Prix" /></td>
                        <td><input className="nx-input mono" inputMode="numeric" value={v.compareAt} onChange={(e) => setVar(i, { compareAt: e.target.value })} aria-label="Prix barré" placeholder="—" /></td>
                        <td className="right mono">{product && !product.soldOutWhenEmpty ? "Sans limite" : v.available}</td>
                        <td>{vars.length > 1 && <button type="button" className="nx-btn sm icon" aria-label="Retirer la variante" onClick={() => setVars(vars.filter((_, k) => k !== i))}><Icon name="trash" size={14} /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: 12, fontSize: 14 }}>
                <input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} style={{ marginTop: 3 }} />
                <span><strong style={{ fontWeight: 500 }}>Marquer « Épuisé » quand le stock est à zéro</strong><br />
                  <small className="muted">{soldOut ? "Le produit ne se commande plus sans stock." : "Désactivé : le produit reste commandable même sans stock (précommande, réassort en route)."}</small></span>
              </label>
              <p className="nx-alert" style={{ margin: 12 }}>Le stock vient des <Link href={`${base}/achats`} style={{ color: "var(--nx-blue)" }}>achats</Link> : il baisse à chaque commande et à chaque perte. Le prix barré n'est affiché que s'il est réellement pratiqué.</p>
            </div>
          </section>
        </div>
        <div className="nx-grid" style={{ alignContent: "start" }}>
          <section className="nx-panel">
            <header><span className="nx-label">Publication</span></header>
            <div className="nx-card nx-grid">
              <label className="nx-field"><span>Statut</span><select className="nx-select" value={status} onChange={(e) => setStatus(e.target.value as Product["status"])}><option value="active">Actif (visible)</option><option value="draft">Brouillon</option><option value="archived">Archivé</option></select></label>
              <label className="nx-field"><span>Catégorie</span>
                <select className="nx-select" value={cat} onChange={(e) => setCat(e.target.value)}>{leaves.map((c) => <option key={c.path} value={c.path}>{c.parentPath ? `${categories.find((x) => x.path === c.parentPath)?.name} › ` : ""}{c.name}</option>)}</select>
              </label>
              <label className="nx-field"><span>Marque</span><input className="nx-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Facultatif" /></label>
            </div>
          </section>
          <section className="nx-panel">
            <header><span className="nx-label">Référencement</span></header>
            <div className="nx-card nx-grid">
              <div style={{ border: "1px solid var(--nx-line)", borderRadius: 10, padding: 12 }}>
                <div className="mono" style={{ fontSize: 12, color: "var(--nx-green)" }}>{storeSlug}.ecom.nerix.site › produits</div>
                <div style={{ color: "#1a0dab", fontSize: 16, margin: "2px 0" }}>{seoTitle || name || "Titre de la page"}</div>
                <div style={{ color: "var(--nx-muted)", fontSize: 13 }}>{seoDesc || "Description affichée dans Google."}</div>
              </div>
              <label className="nx-field"><span>Titre</span><input className="nx-input" value={seoTitle} maxLength={70} onChange={(e) => setSeoTitle(e.target.value)} /></label>
              <label className="nx-field"><span>Description</span><textarea className="nx-textarea" style={{ minHeight: 80 }} value={seoDesc} maxLength={170} onChange={(e) => setSeoDesc(e.target.value)} /></label>
              <label className="nx-field"><span>Adresse</span><input className="nx-input mono" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /></label>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

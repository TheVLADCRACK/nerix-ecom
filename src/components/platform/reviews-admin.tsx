"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addReview, deleteReview, uploadImage } from "@/server/actions/manage";
import { Icon } from "@/components/ui/icons";
import { dateFr } from "@/lib/format";
import type { Review } from "@/lib/types";

const MAX_PHOTO = 10 * 1024 * 1024;

/** Saisie d'avis réels (accord du client obligatoire) : photo vérifiée et ré-encodée côté serveur, avis enregistré et journalisé. */
export function ReviewsAdmin({ storeSlug, initial, products }: { storeSlug: string; initial: Review[]; products: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const list = initial;
  const [uploading, setUploading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [rating, setRating] = useState<Review["rating"]>(5);
  const [err, setErr] = useState<Record<string, string>>({});
  const name = (slug: string) => products.find((p) => p.slug === slug)?.name ?? slug;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "").trim();
    const next: Record<string, string> = {};
    if (!g("product")) next.product = "Choisissez le produit.";
    if (g("name").length < 2) next.name = "Prénom du client (ou initiales).";
    if (g("text").length < 5) next.text = "Recopiez l'avis du client.";
    if (!g("source")) next.source = "Indiquez d'où vient l'avis.";
    if (!f.get("consent")) next.consent = "Le client doit avoir accepté la publication.";
    setErr(next);
    if (Object.keys(next).length) return;
    const form = e.currentTarget;
    start(async () => {
      const r = await addReview(storeSlug, { productSlug: g("product"), name: g("name"), city: g("city"), rating, text: g("text"), source: g("source"), consent: true, photo });
      if (!r.ok) return setErr({ consent: r.error });
      form.reset(); setPhoto(null); setRating(5); router.refresh();
    });
  }

  const field = (k: string, label: string, el: React.ReactNode, hint?: string) => (
    <label className="nx-field">
      <span>{label}</span>
      {el}
      {err[k] ? <small style={{ color: "var(--nx-red)" }}>{err[k]}</small> : hint && <small>{hint}</small>}
    </label>
  );

  return (
    <div className="nx-grid form">
      <section className="nx-panel">
        <header><span className="nx-label">Ajouter un avis réel</span></header>
        <form className="nx-card nx-grid" onSubmit={submit} noValidate>
          {field("product", "Produit", <select name="product" className="nx-select" defaultValue=""><option value="">Choisir…</option>{products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select>)}
          <div className="nx-grid half">
            {field("name", "Client", <input name="name" className="nx-input" maxLength={40} placeholder="Ex. Carine N." />, "Prénom et initiale, jamais le téléphone.")}
            {field("city", "Ville", <input name="city" className="nx-input" maxLength={40} placeholder="Douala" />)}
          </div>
          <div className="nx-field">
            <span>Note</span>
            <div style={{ display: "flex", gap: 4 }} role="radiogroup" aria-label="Note sur 5">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} sur 5`} onClick={() => setRating(n)} className="nx-btn sm icon" style={{ color: n <= rating ? "#d6ad45" : "var(--nx-faint)" }}><Icon name="star" size={16} /></button>
              ))}
            </div>
          </div>
          {field("text", "Avis du client", <textarea name="text" className="nx-textarea" maxLength={600} style={{ minHeight: 90 }} placeholder="Recopiez ses mots, sans les embellir." />)}
          {field("photo", "Photo envoyée par le client (facultatif)", (
            <input type="file" accept="image/jpeg,image/png,image/webp" className="nx-input" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return setPhoto(null);
              if (file.size > MAX_PHOTO) { setErr({ ...err, photo: "10 Mo au maximum." }); return; }
              const fd = new FormData(); fd.append("file", file);
              setUploading(true);
              uploadImage(storeSlug, "reviews", fd).then((r) => { if (r.ok) setPhoto(r.src); else setErr({ ...err, photo: r.error }); }).finally(() => setUploading(false));
            }} />
          ), "JPEG, PNG ou WebP, 10 Mo au maximum.")}
          {photo && <img src={photo} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 10 }} />}
          {field("source", "Origine de l'avis", <select name="source" className="nx-select" defaultValue=""><option value="">Choisir…</option><option>Message WhatsApp</option><option>Appel après livraison</option><option>Commentaire Facebook ou Instagram</option><option>Autre</option></select>)}
          <label className="nx-check"><input type="checkbox" name="consent" /> Le client a accepté que son avis (et sa photo) soient publiés</label>
          {err.consent && <small style={{ color: "var(--nx-red)" }}>{err.consent}</small>}
          <button className="nx-btn dark" type="submit" style={{ justifySelf: "start" }} disabled={pending || uploading}><Icon name="plus" size={16} /> Publier l'avis</button>
          <div className="nx-alert">Uniquement de vrais avis de clients livrés. Un avis inventé est interdit (pratique commerciale trompeuse) et retirerait toute confiance dans la boutique.</div>
        </form>
      </section>
      <section className="nx-panel">
        <header><span className="nx-label">Avis publiés</span><span className="nx-pill off">{list.length}</span></header>
        <div className="nx-card" style={{ display: "grid", gap: 10 }}>
          {list.length === 0 && <p className="nx-empty">Aucun avis pour le moment. La section Avis reste masquée sur les fiches produit tant qu'elle est vide.</p>}
          {list.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 12, border: "1px solid var(--nx-line)", borderRadius: 10, padding: 12 }}>
              {r.photo && <img src={r.photo} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} />}
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong>{r.name}</strong> <span style={{ color: "#d6ad45" }}>{"★".repeat(r.rating)}</span>
                <p style={{ margin: "4px 0" }}>{r.text}</p>
                <small style={{ color: "var(--nx-muted)" }}>{name(r.productSlug)} · {r.city || "—"} · {r.source} · {dateFr(r.createdAt)}</small>
              </div>
              <button type="button" className="nx-btn sm icon danger" aria-label="Retirer l'avis" onClick={() => start(async () => { await deleteReview(storeSlug, r.id); router.refresh(); })}><Icon name="trash" size={14} /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { publishStore } from "@/server/actions/settings";
import { Icon, type IconName } from "@/components/ui/icons";
import type { Section, SectionType, StoreTheme } from "@/lib/types";

const META: Record<SectionType, { label: string; icon: IconName; desc: string }> = {
  hero: { label: "Bannière d'accueil", icon: "image", desc: "Grand titre en haut de page, deux boutons et la photo d'un produit." },
  trust: { label: "Garanties", icon: "shield", desc: "Bande de 3 promesses courtes : paiement, délai, échange." },
  categories: { label: "Catégories", icon: "tag", desc: "Cartes des univers de la boutique, vers le Shop filtré." },
  products: { label: "Grille de produits", icon: "box", desc: "Produits en grille, avec onglets par catégorie si besoin." },
  featured: { label: "Produit vedette", icon: "star", desc: "Un seul produit mis en avant : photo, prix et bouton d'achat." },
  imageText: { label: "Image et texte", icon: "layout", desc: "Photo d'un produit à côté d'un texte et d'un bouton, côté au choix." },
  banner: { label: "Bandeau sombre", icon: "zap", desc: "Message fort sur fond noir avec un bouton (ex. paiement à la livraison)." },
  richtext: { label: "Texte libre", icon: "file", desc: "Un titre et un paragraphe centrés : histoire, engagement, annonce." },
  faq: { label: "Questions fréquentes", icon: "help", desc: "Questions et réponses dépliables ; rassure avant l'achat." },
  posts: { label: "Articles du blog", icon: "pen", desc: "Les 3 derniers articles du blog." },
  newsletter: { label: "Inscription WhatsApp", icon: "message", desc: "Champ pour laisser son numéro WhatsApp et recevoir les nouveautés." },
};

function blank(type: SectionType): Section {
  const id = `s${Date.now().toString(36)}`;
  switch (type) {
    case "hero": return { id, type, enabled: true, eyebrow: "", title: "Votre titre", text: "", ctaLabel: "Voir la boutique", ctaHref: "/shop", secondaryLabel: "", secondaryHref: "", productSlug: "" };
    case "trust": return { id, type, enabled: true, items: ["Paiement à la livraison", "Livraison rapide", "Échange sous 7 jours"] };
    case "categories": return { id, type, enabled: true, title: "Nos univers" };
    case "products": return { id, type, enabled: true, title: "Nos produits", tabs: true, limit: 8 };
    case "banner": return { id, type, enabled: true, title: "Votre message", text: "", ctaLabel: "", ctaHref: "" };
    case "posts": return { id, type, enabled: true, title: "Conseils" };
    case "newsletter": return { id, type, enabled: true, title: "Restez informé", text: "" };
    case "featured": return { id, type, enabled: true, title: "Le produit du moment", text: "", productSlug: "" };
    case "imageText": return { id, type, enabled: true, title: "Votre titre", text: "", productSlug: "", ctaLabel: "Découvrir", ctaHref: "/shop", reverse: false };
    case "richtext": return { id, type, enabled: true, title: "Notre engagement", text: "" };
    case "faq": return { id, type, enabled: true, title: "Questions fréquentes", items: [{ q: "Comment payer ?", a: "En espèces à la livraison, après avoir vérifié votre colis." }] };
  }
}

const COLOR_LABELS: [keyof StoreTheme["colors"], string][] = [["accent", "Accent"], ["accentDeep", "Accent foncé (texte)"], ["accentSoft", "Accent clair"], ["night", "Sections sombres"], ["ink", "Texte"]];

export function StoreEditor({ slug, initialSections, initialTheme, products }: { slug: string; initialSections: Section[]; initialTheme: StoreTheme; products: { slug: string; name: string }[] }) {
  const [sections, setSections] = useState(initialSections);
  const [theme, setTheme] = useState(initialTheme);
  const [open, setOpen] = useState<string | null>(initialSections[0]?.id ?? null);
  const [tab, setTab] = useState<"sections" | "theme">("sections");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);

  // Envoie l'état à l'aperçu (même origine) à chaque modification et quand l'aperçu est prêt.
  useEffect(() => {
    const push = () => frame.current?.contentWindow?.postMessage({ type: "nerix:sections", sections, theme }, window.location.origin);
    push();
    const onReady = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "nerix:ready") push(); };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [sections, theme]);

  const update = (id: string, patch: Partial<Section>) => { setSections((all) => all.map((s) => (s.id === id ? ({ ...s, ...patch } as Section) : s))); setDirty(true); };
  const move = (i: number, d: number) => { const next = [...sections]; const [x] = next.splice(i, 1); next.splice(i + d, 0, x!); setSections(next); setDirty(true); };

  const text = (s: Section, key: string, label: string, multiline = false) => {
    const value = String((s as Record<string, unknown>)[key] ?? "");
    return (
      <label className="nx-field" key={key}>
        <span>{label}</span>
        {multiline
          ? <textarea className="nx-textarea" style={{ minHeight: 70 }} value={value} onChange={(e) => update(s.id, { [key]: e.target.value } as Partial<Section>)} />
          : <input className="nx-input" value={value} onChange={(e) => update(s.id, { [key]: e.target.value } as Partial<Section>)} />}
      </label>
    );
  };

  const productPick = (s: Section & { productSlug: string }) => (
    <label className="nx-field"><span>Produit</span>
      <select className="nx-select" value={s.productSlug} onChange={(e) => update(s.id, { productSlug: e.target.value })}>
        <option value="">Premier produit du catalogue</option>
        {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
      </select>
    </label>
  );

  function fields(s: Section) {
    switch (s.type) {
      case "hero":
        return <>
          {text(s, "eyebrow", "Sur-titre")}{text(s, "title", "Titre")}{text(s, "text", "Texte", true)}
          <div className="nx-grid half">{text(s, "ctaLabel", "Bouton principal")}{text(s, "ctaHref", "Lien")}</div>
          <div className="nx-grid half">{text(s, "secondaryLabel", "Bouton secondaire")}{text(s, "secondaryHref", "Lien")}</div>
          <label className="nx-field"><span>Produit mis en avant</span>
            <select className="nx-select" value={s.productSlug} onChange={(e) => update(s.id, { productSlug: e.target.value })}>{products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select>
          </label>
        </>;
      case "trust":
        return <label className="nx-field"><span>Garanties (une par ligne)</span><textarea className="nx-textarea" value={s.items.join("\n")} onChange={(e) => update(s.id, { items: e.target.value.split("\n").slice(0, 6) })} /></label>;
      case "categories": case "posts":
        return text(s, "title", "Titre");
      case "products":
        return <>{text(s, "title", "Titre")}
          <label className="nx-check"><input type="checkbox" checked={s.tabs} onChange={(e) => update(s.id, { tabs: e.target.checked })} /> Onglets par catégorie</label>
          <label className="nx-field"><span>Nombre de produits</span><input className="nx-input mono" type="number" min={1} max={24} value={s.limit} onChange={(e) => update(s.id, { limit: Math.max(1, Math.min(24, Number(e.target.value) || 1)) })} /></label>
        </>;
      case "banner":
        return <>{text(s, "title", "Titre")}{text(s, "text", "Texte", true)}<div className="nx-grid half">{text(s, "ctaLabel", "Bouton")}{text(s, "ctaHref", "Lien")}</div></>;
      case "newsletter": case "richtext":
        return <>{text(s, "title", "Titre")}{text(s, "text", "Texte", true)}</>;
      case "featured":
        return <>{text(s, "title", "Titre")}{text(s, "text", "Texte (vide = description du produit)", true)}{productPick(s)}</>;
      case "imageText":
        return <>{text(s, "title", "Titre")}{text(s, "text", "Texte", true)}{productPick(s)}
          <div className="nx-grid half">{text(s, "ctaLabel", "Bouton")}{text(s, "ctaHref", "Lien")}</div>
          <label className="nx-check"><input type="checkbox" checked={s.reverse} onChange={(e) => update(s.id, { reverse: e.target.checked })} /> Image à droite</label>
        </>;
      case "faq":
        return <>{text(s, "title", "Titre")}
          <label className="nx-field"><span>Questions (une question puis sa réponse, séparées par une ligne vide)</span>
            <textarea className="nx-textarea" style={{ minHeight: 140 }} value={s.items.map((x) => `${x.q}\n${x.a}`).join("\n\n")}
              onChange={(e) => update(s.id, { items: e.target.value.split(/\n\s*\n/).map((b) => { const [q = "", ...a] = b.split("\n"); return { q: q.trim(), a: a.join(" ").trim() }; }).filter((x) => x.q).slice(0, 12) })} />
          </label>
        </>;
    }
  }

  return (
    <>
      <div className="nx-head">
        <div><h1>Éditeur de boutique</h1><p>Ajoutez, ordonnez et remplissez les sections de la page d'accueil. L'aperçu se met à jour en direct.</p></div>
        <div className="actions">
          <div className="nx-segment" role="group" aria-label="Appareil">
            <button aria-current={device === "desktop"} onClick={() => setDevice("desktop")}>Ordinateur</button>
            <button aria-current={device === "mobile"} onClick={() => setDevice("mobile")}>Mobile</button>
          </div>
          <a className="nx-btn" href={`/s/${slug}`} target="_blank" rel="noopener"><Icon name="eye" size={16} /> Voir la boutique</a>
          <button className="nx-btn dark" type="button" disabled={!dirty || pending} onClick={() => start(async () => { const r = await publishStore(slug, { sections, theme }); if (r.ok) { setErr(""); setDirty(false); } else setErr(r.error); })}><Icon name="check" size={16} /> {pending ? "Publication…" : dirty ? "Publier les modifications" : "Publié"}</button>
          {err && <small role="alert" style={{ color: "var(--nx-red)" }}>{err}</small>}
        </div>
      </div>
      <div className="nx-editor">
        <div className="nx-panel">
          <header>
            <div className="nx-segment" role="tablist">
              <button role="tab" aria-current={tab === "sections"} onClick={() => setTab("sections")}>Sections</button>
              <button role="tab" aria-current={tab === "theme"} onClick={() => setTab("theme")}>Thème</button>
            </div>
          </header>
          {tab === "sections" ? (
            <div className="nx-sections" style={{ padding: 4 }}>
              {sections.map((s, i) => (
                <div key={s.id} className="nx-sec" data-open={open === s.id}>
                  <button className="head" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                    <span className={s.enabled ? "" : "off"} style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
                      <Icon name={META[s.type].icon} size={16} /><span style={{ fontWeight: 500 }}>{META[s.type].label}</span>
                    </span>
                    <Icon name={open === s.id ? "up" : "down"} size={15} />
                  </button>
                  {open === s.id && (
                    <div className="body">
                      <div style={{ display: "flex", gap: 6, paddingTop: 8 }}>
                        <button className="nx-btn sm" type="button" onClick={() => update(s.id, { enabled: !s.enabled })}><Icon name="eye" size={14} /> {s.enabled ? "Masquer" : "Afficher"}</button>
                        <button className="nx-btn sm icon" type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter"><Icon name="up" size={14} /></button>
                        <button className="nx-btn sm icon" type="button" disabled={i === sections.length - 1} onClick={() => move(i, 1)} aria-label="Descendre"><Icon name="down" size={14} /></button>
                        <button className="nx-btn sm icon danger" type="button" style={{ marginLeft: "auto" }} onClick={() => { setSections(sections.filter((x) => x.id !== s.id)); setDirty(true); }} aria-label="Supprimer la section"><Icon name="trash" size={14} /></button>
                      </div>
                      {fields(s)}
                    </div>
                  )}
                </div>
              ))}
              <div className="nx-field" style={{ marginTop: 10 }}>
                <span>Ajouter une section</span>
                <div className="nx-addsec">
                  {(Object.keys(META) as SectionType[]).map((ty) => (
                    <button key={ty} type="button" onClick={() => { const s = blank(ty); setSections([...sections, s]); setOpen(s.id); setDirty(true); }}>
                      <Icon name={META[ty].icon} size={16} />
                      <span><b>{META[ty].label}</b><small>{META[ty].desc}</small></span>
                      <Icon name="plus" size={14} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="nx-card nx-grid" style={{ margin: 4 }}>
              {COLOR_LABELS.map(([k, label]) => (
                <label key={k} className="nx-swatch">
                  <input type="color" value={theme.colors[k]} onChange={(e) => { setTheme({ ...theme, colors: { ...theme.colors, [k]: e.target.value } }); setDirty(true); }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  <span className="mono" style={{ color: "var(--nx-muted)", fontSize: 12 }}>{theme.colors[k]}</span>
                </label>
              ))}
              <label className="nx-field"><span>Police des titres</span>
                <select className="nx-select" value={theme.headingFont} onChange={(e) => { setTheme({ ...theme, headingFont: e.target.value as StoreTheme["headingFont"] }); setDirty(true); }}>
                  <option value="serif">Instrument Serif (élégante)</option>
                  <option value="sans">Plus Jakarta Sans (sobre)</option>
                </select>
              </label>
              <div className="nx-alert">Le texte reste en Plus Jakarta Sans. Les surfaces claires sont en verre : pas de gris.</div>
            </div>
          )}
        </div>
        <div className="nx-preview" data-device={device}>
          <div className="bar">
            <span style={{ display: "flex", gap: 5 }}>{["#ff5f57", "#febc2e", "#28c840"].map((c) => <i key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}</span>
            <span className="url">{slug}.ecom.nerix.site</span>
            {dirty && <span className="nx-pill wait">Non publié</span>}
          </div>
          <iframe ref={frame} src={`/s/${slug}?apercu=1`} title="Aperçu de la boutique" />
        </div>
      </div>
    </>
  );
}

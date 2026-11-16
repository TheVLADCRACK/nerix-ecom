import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import type { ActionResult } from "@/server/actions/manage";
import { ActionForm } from "./action-form";

/** Édition commune aux articles et aux pages : texte en Markdown, rendu et assaini (liste blanche) à l'affichage. */
export function ContentEditor({ back, title, url, body, kind, action, side }: {
  back: string; title: string; url: string | null; body: string; kind: "article" | "page";
  action: (prev: ActionResult | undefined, f: FormData) => Promise<ActionResult>; side?: React.ReactNode;
}) {
  return (
    <>
      <div className="nx-head">
        <Link href={back} className="nx-btn icon" aria-label="Retour"><Icon name="arrowLeft" size={16} /></Link>
        <div><h1>{title || (kind === "article" ? "Nouvel article" : "Nouvelle page")}</h1>{url && <p className="mono" style={{ fontSize: 12.5 }}>{url}</p>}</div>
        {url && <div className="actions"><a className="nx-btn" href={url} target="_blank" rel="noopener"><Icon name="eye" size={16} /> Voir</a></div>}
      </div>
      <ActionForm action={action} submit="Publier" className="nx-grid form">
        <section className="nx-panel">
          <header><span className="nx-label">Contenu</span></header>
          <div className="nx-card nx-grid">
            <label className="nx-field"><span>Titre</span><input className="nx-input" name="title" defaultValue={title} required maxLength={160} /></label>
            <label className="nx-field">
              <span>Texte</span>
              <textarea className="nx-textarea mono" name="body" defaultValue={body} required style={{ minHeight: 420, fontSize: 13, lineHeight: 1.6 }} />
              <small>Markdown : <code>## Titre</code>, <code>**gras**</code>, <code>- liste</code>, <code>[lien](https://…)</code>. Le texte est nettoyé avant publication.</small>
            </label>
          </div>
        </section>
        {side && <div className="nx-grid" style={{ alignContent: "start" }}><section className="nx-panel"><header><span className="nx-label">Publication</span></header><div className="nx-card nx-grid">{side}</div></section></div>}
      </ActionForm>
    </>
  );
}

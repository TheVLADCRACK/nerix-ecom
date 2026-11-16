"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { archiveOrder } from "@/server/actions/manage";

/** Menu ⋯ d'une commande : voir, modifier, archiver (ou rétablir). */
export function OrderMenu({ storeSlug, base, number, archived, editable }: { storeSlug: string; base: string; number: string; archived: boolean; editable: boolean }) {
  // Position fixe calculée depuis le bouton : le menu n'est pas coupé par le défilement horizontal du tableau.
  const [open, setOpen] = useState<{ top: number; right: number } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(null); };
    const hide = () => setOpen(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", hide, true);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); window.removeEventListener("scroll", hide, true); };
  }, [open]);
  const archive = () => {
    if (!archived && !confirm(`Archiver ${number} ? Elle restera visible en grisé mais ne comptera plus dans les statistiques, le stock et la comptabilité.`)) return;
    start(async () => { const r = await archiveOrder(storeSlug, number, !archived); if (!r.ok) alert(r.error); setOpen(null); router.refresh(); });
  };
  return (
    <div className="nx-menu" ref={box}>
      <button type="button" className="nx-btn sm icon" aria-label={`Actions pour ${number}`} aria-expanded={!!open} aria-haspopup="menu" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setOpen(open ? null : { top: Math.min(r.bottom + 4, window.innerHeight - 150), right: window.innerWidth - r.right }); }} disabled={pending}><Icon name="dots" size={16} /></button>
      {open && (
        <div role="menu" className="nx-menu-pop" style={open}>
          <Link role="menuitem" href={`${base}/commandes/${number}`}><Icon name="eye" size={15} /> Voir la commande</Link>
          {editable && <Link role="menuitem" href={`${base}/commandes/${number}/modifier`}><Icon name="pen" size={15} /> Modifier la commande</Link>}
          <button role="menuitem" type="button" onClick={archive} className={archived ? undefined : "danger"}><Icon name={archived ? "refresh" : "trash"} size={15} /> {archived ? "Rétablir la commande" : "Supprimer (archiver)"}</button>
        </div>
      )}
    </div>
  );
}

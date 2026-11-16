"use client";
import { useActionState } from "react";
import { Icon } from "@/components/ui/icons";
import type { ActionResult } from "@/server/actions/manage";

/** Formulaire relié à une Server Action (état d'envoi et message de retour). Les champs sont passés en enfants. */
export function ActionForm({ action, children, submit = "Enregistrer", className = "nx-grid", id }: {
  action: (prev: ActionResult | undefined, f: FormData) => Promise<ActionResult>; children: React.ReactNode; submit?: string; className?: string; id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} id={id}>
      {children}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="nx-btn dark" type="submit" disabled={pending}><Icon name="check" size={16} /> {pending ? "Enregistrement…" : submit}</button>
        {state && (state.ok ? <small role="status" style={{ color: "var(--nx-green)" }}>{state.message ?? "Enregistré."}</small> : <small role="alert" style={{ color: "var(--nx-red)" }}>{state.error}</small>)}
      </div>
    </form>
  );
}

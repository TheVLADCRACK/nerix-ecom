"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { deleteMessage } from "@/server/actions/manage";

/** Corbeille d'un message : rouge au survol, suppression définitive après confirmation. */
export function MessageDelete({ storeSlug, id, name, after }: { storeSlug: string; id: string; name: string; after?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="nx-btn sm icon nx-trash" disabled={pending} aria-label={`Supprimer le message de ${name}`} title="Supprimer définitivement"
      onClick={() => confirm(`Supprimer définitivement le message de ${name} ? Cette action est irréversible.`) && start(async () => {
        const r = await deleteMessage(storeSlug, id);
        if (!r.ok) return alert(r.error);
        if (after) router.push(after); else router.refresh();
      })}>
      <Icon name="trash" size={14} />
    </button>
  );
}

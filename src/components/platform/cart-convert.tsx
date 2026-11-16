"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { convertCart } from "@/server/actions/manage";

/** Transforme un panier abandonné en commande (prix et stock vérifiés côté serveur), puis ouvre la commande. */
export function CartConvert({ storeSlug, base, id, name }: { storeSlug: string; base: string; id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="nx-btn sm dark" disabled={pending}
      onClick={() => confirm(`Créer une commande à partir du panier de ${name} ?`) && start(async () => {
        const r = await convertCart(storeSlug, id);
        if (!r.ok) return alert(r.error);
        router.push(`${base}/commandes/${r.number}`);
      })}>
      <Icon name="check" size={14} /> {pending ? "Conversion…" : "Convertir en commande"}
    </button>
  );
}

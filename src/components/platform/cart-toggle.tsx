"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setCartContacted } from "@/server/actions/manage";

export function CartToggle({ storeSlug, id, contacted }: { storeSlug: string; id: string; contacted: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className={`nx-pill ${contacted ? "ok" : "wait"}`} disabled={pending} style={{ cursor: "pointer" }} title={contacted ? "Remettre à relancer" : "Marquer comme relancé"}
      onClick={() => start(async () => { await setCartContacted(storeSlug, id, !contacted); router.refresh(); })}>
      {contacted ? "Relancé" : "À relancer"}
    </button>
  );
}

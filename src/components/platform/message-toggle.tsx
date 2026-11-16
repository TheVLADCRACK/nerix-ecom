"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setMessageHandled } from "@/server/actions/manage";

export function MessageToggle({ storeSlug, id, handled }: { storeSlug: string; id: string; handled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className={`nx-pill ${handled ? "ok" : "wait"}`} disabled={pending} style={{ cursor: "pointer" }} title={handled ? "Remettre à traiter" : "Marquer comme traité"}
      onClick={() => start(async () => { await setMessageHandled(storeSlug, id, !handled); router.refresh(); })}>
      {handled ? "Traité" : "À traiter"}
    </button>
  );
}

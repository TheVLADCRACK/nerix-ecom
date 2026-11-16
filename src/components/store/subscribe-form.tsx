"use client";
import { useState, useTransition } from "react";
import { subscribe } from "@/server/actions/shop";
import { useStore } from "./cart";

/** Inscription WhatsApp aux nouveautés : consentement explicite, enregistré côté serveur. */
export function SubscribeForm({ id, button, buttonClass = "sf-btn primary", inputClass }: { id: string; button: string; buttonClass?: string; inputClass?: string }) {
  const { storeSlug } = useStore();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <form onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const v = String(new FormData(form).get("wa") ?? "");
        start(async () => {
          const r = await subscribe(storeSlug, v);
          setMsg(r.ok ? { ok: true, text: "C'est noté : un message par mois au plus, désinscription à tout moment." } : { ok: false, text: r.error ?? "Réessayez." });
          if (r.ok) form.reset();
        });
      }}>
        <label className="sr-only" htmlFor={id}>Votre numéro WhatsApp</label>
        <input id={id} name="wa" className={inputClass} inputMode="tel" autoComplete="tel" placeholder="Votre numéro WhatsApp" required />
        <button className={buttonClass} type="submit" disabled={pending}>{button}</button>
      </form>
      <p className="sf-muted" role="status" style={{ fontSize: 13, marginTop: 10, minHeight: 20 }}>{msg?.text ?? ""}</p>
    </>
  );
}

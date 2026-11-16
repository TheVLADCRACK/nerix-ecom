"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { normalizeCmPhone } from "@/lib/format";
import { sendContactMessage } from "@/server/actions/shop";
import { useStore } from "./cart";
import { track } from "./tracking";

/** Formulaire de contact (nom, téléphone, message) : enregistré côté serveur (Zod, limite de débit) pour l'onglet Messages. */
export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { storeSlug } = useStore();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (sent)
    return (
      <div className="sf-panel sf-glass" role="status" style={{ textAlign: "center", justifyItems: "center" }}>
        <Icon name="check" size={28} />
        <h2>Message reçu</h2>
        <p className="sf-muted">Nous vous rappelons ou vous écrivons sur WhatsApp au numéro indiqué.</p>
      </div>
    );
  return (
    <form
      className="sf-panel sf-glass"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const name = String(f.get("name") ?? "").trim();
        const message = String(f.get("message") ?? "").trim();
        const err: Record<string, string> = {};
        if (name.length < 2) err.name = "Indiquez votre nom.";
        if (!normalizeCmPhone(String(f.get("phone") ?? ""))) err.phone = "Numéro camerounais attendu, par exemple 6 90 00 00 00.";
        if (message.length < 5) err.message = "Écrivez votre message.";
        setErrors(err);
        if (Object.keys(err).length) return;
        setBusy(true);
        sendContactMessage(storeSlug, { name, phone: String(f.get("phone") ?? ""), message }).then((r) => {
          setBusy(false);
          if (!r.ok) return setErrors({ message: r.error ?? "Envoi impossible." });
          track("Contact");
          setSent(true);
        }).catch(() => { setBusy(false); setErrors({ message: "Connexion interrompue. Réessayez." }); });
      }}
    >
      <h2>Écrivez-nous</h2>
      {(["name", "phone", "message"] as const).map((k) => {
        const label = { name: "Nom", phone: "Téléphone", message: "Message" }[k];
        const common = { id: `c-${k}`, name: k, "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `c-${k}-err` : undefined, required: true };
        return (
          <label key={k} className="sf-field" htmlFor={`c-${k}`}>
            <span>{label}</span>
            {k === "message"
              ? <textarea {...common} maxLength={2000} placeholder="Votre question, ou votre numéro de commande" />
              : <input {...common} className="sf-input" maxLength={k === "name" ? 80 : 20} {...(k === "phone" ? { inputMode: "tel" as const, autoComplete: "tel", placeholder: "6 90 00 00 00" } : { autoComplete: "name" })} />}
            {errors[k] && <span id={`c-${k}-err`} className="sf-error">{errors[k]}</span>}
          </label>
        );
      })}
      <button className="sf-btn primary lg" type="submit" disabled={busy}>Envoyer <Icon name="arrowRight" size={16} /></button>
      <p className="sf-muted" style={{ fontSize: 13 }}>Nous répondons par téléphone ou WhatsApp. Vos données servent uniquement à vous répondre.</p>
    </form>
  );
}

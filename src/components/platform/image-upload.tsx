"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadImage } from "@/server/actions/manage";
import { setStoreLogo } from "@/server/actions/settings";

/** Remplacement du logo : envoi et ré-encodage côté serveur, puis mise à jour de la boutique (favicon compris). */
export function LogoUpload({ storeSlug, logo }: { storeSlug: string; logo: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <img src={logo} alt="" style={{ width: 72, height: 72, borderRadius: 14, border: "1px solid var(--nx-line)", objectFit: "cover" }} />
      <div style={{ display: "grid", gap: 6 }}>
        <label className="nx-btn sm" aria-disabled={pending}>{pending ? "Envoi…" : "Remplacer le logo"}
          <input type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" disabled={pending} onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData(); fd.append("file", file);
            start(async () => {
              const up = await uploadImage(storeSlug, "stores", fd);
              if (!up.ok) return setMsg(up.error);
              const r = await setStoreLogo(storeSlug, up.src);
              setMsg(r.ok ? "Logo remplacé." : r.error);
              router.refresh();
            });
          }} />
        </label>
        <small style={{ color: msg && !msg.startsWith("Logo") ? "var(--nx-red)" : "var(--nx-muted)" }}>{msg || "Carré, 512 px minimum. Utilisé aussi comme favicon de la boutique."}</small>
      </div>
    </div>
  );
}

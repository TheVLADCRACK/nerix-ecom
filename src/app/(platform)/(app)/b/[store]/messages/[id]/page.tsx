import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageToggle } from "@/components/platform/message-toggle";
import { loadStore } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";
import { dateTimeFr, displayPhone } from "@/lib/format";
import { getMessages } from "@/server/repo";

export const metadata = { title: "Message" };

/** Lecture d'un message de la page Contact, en entier, avec les actions de réponse. */
export default async function MessageDetail({ params }: { params: Promise<{ store: string; id: string }> }) {
  const { store, base } = await loadStore(params);
  const { id } = await params;
  const m = (await getMessages(store)).find((x) => x.id === id);
  if (!m) notFound();
  const wa = `https://wa.me/${m.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${m.name}, ici ${store.name}. Merci pour votre message.`)}`;
  return (
    <>
      <div className="nx-head">
        <div><Link href={`${base}/messages`} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="chevronLeft" size={14} /> Messages</Link><h1>{m.name}</h1><p>Reçu le {dateTimeFr(m.createdAt)} · <span className="mono">{displayPhone(m.phone)}</span></p></div>
        <div className="actions"><MessageToggle storeSlug={store.slug} id={m.id} handled={m.handled} /></div>
      </div>
      <section className="nx-panel">
        <div className="nx-card nx-grid">
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 15, maxWidth: "70ch" }}>{m.message}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="nx-btn dark" href={`tel:${m.phone}`}><Icon name="phone" size={16} /> Appeler</a>
            <a className="nx-btn" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="message" size={16} /> Répondre sur WhatsApp</a>
          </div>
        </div>
      </section>
    </>
  );
}

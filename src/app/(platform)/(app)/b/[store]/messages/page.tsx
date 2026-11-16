import Link from "next/link";
import { getMessages } from "@/server/repo";
import { MessageToggle } from "@/components/platform/message-toggle";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";
import { dateTimeFr, displayPhone } from "@/lib/format";

export const metadata = { title: "Messages" };

export default async function Messages({ params }: StoreParams) {
  const { store, base } = await loadStore(params);
  const messages = await getMessages(store);
  const list = messages.filter((m) => m.storeSlug === store.slug).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = list.filter((m) => !m.handled).length;
  return (
    <>
      <div className="nx-head">
        <div><h1>Messages</h1><p>Messages envoyés depuis la page Contact de la boutique. {open > 0 ? `${open} à traiter.` : "Rien à traiter."}</p></div>
      </div>
      <section className="nx-panel">
        <div className="nx-card flush">
          {list.length === 0 ? (
            <div className="nx-empty">
              <Icon name="inbox" size={28} />
              <p style={{ marginTop: 10 }}><strong>Aucun message pour le moment.</strong></p>
              <p>Ils apparaîtront ici dès qu'un client écrira depuis la page Contact.</p>
            </div>
          ) : (
            <div className="nx-tablewrap">
              <table className="nx-table">
                <thead><tr><th scope="col">Reçu le</th><th scope="col">Client</th><th scope="col">Téléphone</th><th scope="col">Message</th><th scope="col">Statut</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {list.map((m) => {
                    const wa = `https://wa.me/${m.phone.replace(/\D/g, "")}`;
                    return (
                      <tr key={m.id}>
                        <td className="muted" style={{ whiteSpace: "nowrap" }}>{dateTimeFr(m.createdAt)}</td>
                        <td><Link href={`${base}/messages/${m.id}`}><strong style={{ fontWeight: m.handled ? 400 : 600 }}>{m.name}</strong></Link></td>
                        <td className="mono">{displayPhone(m.phone)}</td>
                        <td style={{ minWidth: 260, maxWidth: 420 }}><Link href={`${base}/messages/${m.id}`} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.message}</Link></td>
                        <td><MessageToggle storeSlug={store.slug} id={m.id} handled={m.handled} /></td>
                        <td className="right" style={{ whiteSpace: "nowrap" }}>
                          <a className="nx-btn sm" href={`tel:${m.phone}`}><Icon name="phone" size={14} /> Appeler</a>{" "}
                          <a className="nx-btn sm" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="message" size={14} /> WhatsApp</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

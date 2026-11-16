import { Icon } from "@/components/ui/icons";
import { requireStaff } from "@/server/auth";
import { listStaff } from "@/server/repo";
import { dateTimeFr } from "@/lib/format";

export const metadata = { title: "Équipe" };

export default async function Team() {
  await requireStaff();
  const staff = await listStaff();
  return (
    <>
      <div className="nx-head">
        <div><h1>Équipe</h1><p>Un seul rôle pour l'instant : administrateur, avec accès à toutes les boutiques. Les droits sont vérifiés côté serveur à chaque action.</p></div>
        <div className="actions"><button className="nx-btn dark" disabled title="Bientôt disponible"><Icon name="plus" size={16} /> Inviter un membre</button></div>
      </div>
      <section className="nx-panel">
        <header><span className="nx-label">Membres</span></header>
        <div className="nx-card flush">
          <table className="nx-table">
            <thead><tr><th scope="col">Membre</th><th scope="col">Rôle</th><th scope="col">Boutiques</th><th scope="col">Dernière activité</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {staff.map((m) => (
                <tr key={m.id}>
                  <td><div className="nx-prod"><span className="nx-avatar" style={{ width: 30, height: 30, borderRadius: 8, fontSize: 12 }}>{m.name[0]}</span><span>{m.name}<small>{m.email}</small></span></div></td>
                  <td><span className="nx-pill info">Administrateur</span>{!m.active && <span className="nx-pill off" style={{ marginLeft: 6 }}>Désactivé</span>}</td>
                  <td className="muted">Toutes</td>
                  <td className="muted">{m.last_seen ? dateTimeFr(m.last_seen.toISOString()) : "—"}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="nx-panel">
        <header><span className="nx-label">Invitations</span><span className="nx-pill off">À venir</span></header>
        <div className="nx-card"><p style={{ color: "var(--nx-muted)" }}>Bientôt : inviter un membre par email et lui attribuer des rôles plus fins (commandes seules, contenu seul) par boutique.</p></div>
      </section>
    </>
  );
}

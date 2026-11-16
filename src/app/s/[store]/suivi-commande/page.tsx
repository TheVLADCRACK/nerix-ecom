import { loadFront, type FrontParams } from "@/components/store/ctx";
import { clientIpHash, rateLimit } from "@/lib/security";
import { findOrderForTracking } from "@/server/repo";
import { dateTimeFr, normalizeCmPhone, xaf } from "@/lib/format";

export const metadata = { title: "Suivi de commande", robots: { index: false } };

const STEPS = [
  { key: "pending", label: "Reçue" },
  { key: "confirmed", label: "Confirmée" },
  { key: "processing", label: "En préparation" },
  { key: "packed", label: "En livraison" },
  { key: "completed", label: "Livrée" },
];

export default async function Tracking({ params, searchParams }: FrontParams & { searchParams: Promise<{ numero?: string; tel?: string }> }) {
  const { store } = await loadFront(params);
  const sp = await searchParams;
  const number = (sp.numero ?? "").trim().toUpperCase();
  const phone = normalizeCmPhone(sp.tel ?? "");
  // Numéro ET téléphone exigés : jamais de lecture par simple identifiant ; 20 recherches par heure et par IP.
  const limited = number && phone ? !(await rateLimit(`track:${await clientIpHash()}`, 20, 3600)) : false;
  const match = number && phone && !limited ? await findOrderForTracking(store.id, number, phone) : null;
  const idx = match ? STEPS.findIndex((s) => s.key === match.status) : -1;
  return (
    <div className="sf-page">
      <div className="sf-wrap" style={{ maxWidth: 760 }}>
        <h1 className="sf-h">Suivi de commande</h1>
        <form className="sf-panel sf-glass" style={{ marginTop: 24 }}>
          <div className="sf-two">
            <label className="sf-field"><span>Numéro de commande</span><input className="sf-input" name="numero" defaultValue={number} placeholder="EP-2026-000123" required /></label>
            <label className="sf-field"><span>Téléphone utilisé</span><input className="sf-input" name="tel" inputMode="tel" defaultValue={sp.tel ?? ""} placeholder="6 90 00 00 00" required /></label>
          </div>
          <button className="sf-btn primary" type="submit">Voir ma commande</button>
        </form>
        {limited && <p className="sf-panel sf-glass" style={{ marginTop: 16 }} role="status">Trop de recherches. Réessayez dans une heure.</p>}
        {number && !match && !limited && <p className="sf-panel sf-glass" style={{ marginTop: 16 }} role="status">Aucune commande ne correspond à ce numéro et à ce téléphone. Vérifiez les deux informations.</p>}
        {match && (
          <section className="sf-panel sf-glass" style={{ marginTop: 16 }} aria-live="polite">
            <h2>Commande {match.number}</h2>
            {match.status === "cancelled" ? (
              <p>Cette commande a été annulée. Contactez-nous si vous pensez qu'il s'agit d'une erreur.</p>
            ) : (
              <div className="sf-steps">{STEPS.map((s, i) => <span key={s.key} data-done={i <= idx}>{s.label}</span>)}</div>
            )}
            <div className="sf-sum">
              <span className="sf-muted">Passée le</span><span>{dateTimeFr(match.placed_at.toISOString())}</span>
              <span className="sf-muted">Livraison</span><span>{match.city}</span>
              <span className="sf-muted">Paiement</span><span>{match.payment_status === "paid" ? "Payé" : "À régler à la livraison"}</span>
              <span className="total">Total</span><span className="total sf-price">{xaf(match.total)}</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

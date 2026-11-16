import Link from "next/link";
import { OrderMenu } from "./order-menu";
import { Icon } from "@/components/ui/icons";
import { dateTimeFr, xaf } from "@/lib/format";
import type { FulfillmentStatus, Order, OrderStatus, PaymentStatus } from "@/lib/types";

export function Kpi({ label, value, unit, delta, spark = [], tone }: { label: string; value: string; unit?: string; delta?: string; spark?: number[]; tone?: "ok" | "bad" }) {
  const max = Math.max(1, ...spark);
  return (
    <div className="nx-panel nx-kpi">
      <div className="nx-card">
        <div>
          <div className="nx-label">{label}</div>
          <div className="value" style={tone ? { color: tone === "ok" ? "var(--nx-green)" : "var(--nx-red)" } : undefined}>{value}{unit && <small>{unit}</small>}</div>
        </div>
        {spark.length > 0 && <div className="nx-spark" aria-hidden="true">
          {spark.map((v, i) => <i key={i} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />)}
        </div>}
      </div>
      <footer>
        <Icon name="help" size={14} />
        <span>{delta ?? "—"}</span>
      </footer>
    </div>
  );
}

const ORDER: Record<OrderStatus, [string, string]> = {
  pending: ["À confirmer", "wait"], confirmed: ["Confirmée", "info"], processing: ["En préparation", "info"], packed: ["Prête", "info"],
  completed: ["Terminée", "ok"], cancelled: ["Annulée", "off"], returned: ["Retournée", "bad"],
};
const PAY: Record<PaymentStatus, [string, string]> = { unpaid: ["Non payée", "off"], pending: ["En attente", "wait"], paid: ["Payée", "ok"], partially_refunded: ["Remb. partiel", "wait"], refunded: ["Remboursée", "bad"] };
const SHIP: Record<FulfillmentStatus, [string, string]> = { unfulfilled: ["À expédier", "off"], in_delivery: ["En livraison", "info"], delivered: ["Livrée", "ok"], failed: ["Échec", "bad"], returned: ["Retour", "bad"] };

export const OrderPill = ({ s }: { s: OrderStatus }) => <span className={`nx-pill ${ORDER[s][1]}`}>{ORDER[s][0]}</span>;
export const PayPill = ({ s }: { s: PaymentStatus }) => <span className={`nx-pill ${PAY[s][1]}`}>{PAY[s][0]}</span>;
export const ShipPill = ({ s }: { s: FulfillmentStatus }) => <span className={`nx-pill ${SHIP[s][1]}`}>{SHIP[s][0]}</span>;

export function OrdersTable({ orders, base, compact = false }: { orders: Order[]; base: string; compact?: boolean }) {
  const storeSlug = base.split("/")[2] ?? "";
  if (!orders.length) return <div className="nx-empty">Aucune commande pour l'instant.</div>;
  return (
    <div className="nx-tablewrap">
      <table className="nx-table">
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">Sélection</span><input type="checkbox" aria-label="Tout sélectionner" /></th>
            <th scope="col">Commande</th>
            <th scope="col">Client</th>
            {!compact && <th scope="col">Ville</th>}
            <th scope="col">Produit</th>
            <th scope="col">Statut</th>
            {!compact && <th scope="col">Paiement</th>}
            {!compact && <th scope="col">Livraison</th>}
            <th scope="col" className="right">Total</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className={o.archived ? "archived" : undefined} title={o.archived ? "Archivée : hors statistiques" : undefined}>
              <td><input type="checkbox" aria-label={`Sélectionner ${o.number}`} /></td>
              <td>
                <Link href={`${base}/commandes/${o.number}`} className="mono">{o.number}</Link>
                <div className="muted mono" style={{ fontSize: 11.5 }}>{dateTimeFr(o.placedAt)}</div>
              </td>
              <td>{o.customer.firstName} {o.customer.lastName}</td>
              {!compact && <td className="muted">{o.city}</td>}
              <td>{o.lines[0]!.name}{o.lines[0]!.quantity > 1 && <span className="muted"> × {o.lines[0]!.quantity}</span>}</td>
              <td><OrderPill s={o.status} /></td>
              {!compact && <td><PayPill s={o.paymentStatus} /></td>}
              {!compact && <td><ShipPill s={o.fulfillmentStatus} /></td>}
              <td className="right mono">{xaf(o.total)}</td>
              <td><OrderMenu storeSlug={storeSlug} base={base} number={o.number} archived={!!o.archived} editable={!o.archived && ["pending", "confirmed", "processing", "packed"].includes(o.status)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Indicateurs calculés à partir des commandes (mêmes définitions qu'en production). */
/** Une colonne : commandes passées sur la période, dont livrées. */
export type TrendPoint = { label: string; tick: number; delivered: number; other: number };
export type TrendMode = { points: TrendPoint[]; ticks: string[] };
export type Trend = Record<"semaine" | "mois" | "annee", TrendMode>;

const MONTHS = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];
const day = (iso: string) => iso.slice(0, 10); // dates déjà à l'heure de Douala dans les données
const fr = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("fr-FR", { ...o, timeZone: "UTC" });

/** Indicateurs et séries du tableau de bord. CA = commandes payées, comptées à la date de livraison. */
export function stats(orders: Order[], now = new Date()) {
  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const decided = orders.filter((o) => o.status === "completed" || o.status === "cancelled");
  const key = (o: Order) => o.customer.phone || o.number;
  const first = new Map<string, string>();
  for (const o of [...orders].sort((a, b) => a.placedAt.localeCompare(b.placedAt))) if (!first.has(key(o))) first.set(key(o), o.placedAt);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const point = (a: Date, b: Date, label: string, tick: number): TrendPoint => {
    const inside = orders.filter((o) => day(o.placedAt) >= iso(a) && day(o.placedAt) < iso(b));
    const delivered = inside.filter((o) => o.status === "completed").length;
    return { label, tick, delivered, other: inside.length - delivered };
  };
  const y = now.getUTCFullYear();
  const D = 86400_000;
  // Semaine : 12 dernières semaines, une colonne par jour.
  const today = Date.UTC(y, now.getUTCMonth(), now.getUTCDate());
  const days = Array.from({ length: 84 }, (_, i) => new Date(today - (83 - i) * D));
  const semaine: TrendMode = {
    points: days.map((a, i) => point(a, new Date(a.getTime() + D), fr(a, { weekday: "long", day: "numeric", month: "long" }), Math.floor(i / 14))),
    ticks: Array.from({ length: 6 }, (_, k) => fr(days[k * 14]!, { day: "numeric", month: "short" }).replace(".", "").toUpperCase()),
  };
  // Mois : l'année en cours, une colonne par semaine, repérée par son mois.
  const mois: TrendMode = {
    points: Array.from({ length: 52 }, (_, w) => {
      const a = new Date(Date.UTC(y, 0, 1 + w * 7));
      return point(a, w === 51 ? new Date(Date.UTC(y + 1, 0, 1)) : new Date(Date.UTC(y, 0, 1 + (w + 1) * 7)), `Semaine du ${fr(a, { day: "numeric", month: "long" })}`, a.getUTCMonth());
    }),
    ticks: MONTHS,
  };
  // Année : une colonne par mois.
  const annee: TrendMode = {
    points: Array.from({ length: 12 }, (_, m) => point(new Date(Date.UTC(y, m, 1)), new Date(Date.UTC(y, m + 1, 1)), fr(new Date(Date.UTC(y, m, 1)), { month: "long", year: "numeric" }), m)),
    ticks: MONTHS,
  };
  return {
    revenue, orders: orders.length, customers: first.size,
    delivered: paid.length,
    deliveryRate: decided.length ? Math.round((orders.filter((o) => o.status === "completed").length / decided.length) * 100) : 0,
    avgBasket: paid.length ? Math.round(revenue / paid.length) : 0,
    pending: orders.filter((o) => o.status === "pending" || o.status === "confirmed" || o.status === "processing" || o.status === "packed").length,
    trend: { semaine, mois, annee } satisfies Trend,
  };
}

/** Montant arrondi au franc, signe moins pour les charges. */
export const fcfa = (n: number) => xaf(Math.round(n) || 0); // jamais « -0 »

/** Sélecteur de période (année ou mois) par lien : ?periode=2026 ou ?periode=2026-07. */
export function PeriodPicker({ base, period, year }: { base: string; period: string; year: number }) {
  const months = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  return (
    <nav className="nx-periods" aria-label="Période">
      <Link href={`${base}?periode=${year}`} aria-current={period === String(year) ? "page" : undefined}>Année {year}</Link>
      {months.map((m, i) => {
        const k = `${year}-${String(i + 1).padStart(2, "0")}`;
        return <Link key={k} href={`${base}?periode=${k}`} aria-current={period === k ? "page" : undefined}>{m}</Link>;
      })}
    </nav>
  );
}


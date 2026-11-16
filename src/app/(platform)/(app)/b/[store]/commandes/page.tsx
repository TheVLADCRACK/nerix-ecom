import Link from "next/link";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { OrdersTable } from "@/components/platform/ui";
import { Icon } from "@/components/ui/icons";
import type { Order } from "@/lib/types";

export const metadata = { title: "Commandes" };

const TABS: { key: string; label: string; match: (o: Order) => boolean }[] = [
  { key: "toutes", label: "Toutes", match: () => true },
  { key: "a-confirmer", label: "À confirmer", match: (o) => o.status === "pending" },
  { key: "en-cours", label: "En cours", match: (o) => ["confirmed", "processing", "packed"].includes(o.status) },
  { key: "terminees", label: "Terminées", match: (o) => o.status === "completed" },
  { key: "annulees", label: "Annulées", match: (o) => o.status === "cancelled" || o.status === "returned" },
  { key: "archivees", label: "Archivées", match: (o) => !!o.archived },
];
// Une commande archivée n'apparaît que dans « Toutes » (en grisé) et « Archivées ».
const inTab = (t: (typeof TABS)[number], o: Order) => (o.archived ? t.key === "toutes" || t.key === "archivees" : t.match(o));

export default async function Orders({ params, searchParams }: StoreParams & { searchParams: Promise<{ statut?: string; page?: string }> }) {
  const { base, allOrders: orders } = await loadStore(params);
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.statut) ?? TABS[0]!;
  const list = orders.filter((o) => inTab(tab, o));
  const page = Math.max(1, Number(sp.page) || 1);
  const per = 15;
  const pages = Math.max(1, Math.ceil(list.length / per));
  return (
    <>
      <div className="nx-head">
        <div><h1>Commandes</h1><p>Confirmez par téléphone, préparez, expédiez.</p></div>
        <div className="actions">
          <Link className="nx-btn dark" href={`${base}/commandes/nouvelle`}><Icon name="plus" size={16} /> Saisir une commande</Link>
        </div>
      </div>
      <section className="nx-panel">
        <div className="nx-toolbar">
          <div className="nx-segment" role="tablist">
            {TABS.map((t) => (
              <Link key={t.key} href={`?statut=${t.key}`} aria-current={t.key === tab.key} role="tab">
                {t.label} <span className="mono" style={{ color: "var(--nx-faint)" }}>{orders.filter((o) => inTab(t, o)).length}</span>
              </Link>
            ))}
          </div>
          <label className="nx-search" style={{ marginLeft: "auto" }}><Icon name="search" size={16} /><input placeholder="N°, client, téléphone…" aria-label="Rechercher une commande" /></label>
        </div>
        <div className="nx-card flush">
          <OrdersTable orders={list.slice((page - 1) * per, page * per)} base={base} />
          <div className="nx-pager">
            <span>{list.length} commande{list.length > 1 ? "s" : ""}</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Link className="nx-btn sm" aria-disabled={page <= 1} href={`?statut=${tab.key}&page=${Math.max(1, page - 1)}`}><Icon name="chevronLeft" size={14} /> Précédent</Link>
              <span className="mono">{page} / {pages}</span>
              <Link className="nx-btn sm" aria-disabled={page >= pages} href={`?statut=${tab.key}&page=${Math.min(pages, page + 1)}`}>Suivant <Icon name="chevronRight" size={14} /></Link>
            </span>
          </div>
        </div>
      </section>
    </>
  );
}

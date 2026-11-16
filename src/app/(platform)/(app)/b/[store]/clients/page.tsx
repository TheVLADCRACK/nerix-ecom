import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";
import { dateFr, displayPhone, xaf } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function Customers({ params }: StoreParams) {
  const { orders } = await loadStore(params);
  const map = new Map<string, { key: string; name: string; phone: string; city: string; orders: number; spent: number; last: string }>();
  for (const o of orders) {
    const key = o.customer.phone || o.number; // téléphone absent dans certaines commandes du classeur
    const c = map.get(key) ?? { key, name: `${o.customer.firstName} ${o.customer.lastName}`, phone: o.customer.phone, city: o.city, orders: 0, spent: 0, last: o.placedAt };
    c.orders += 1;
    if (o.paymentStatus === "paid") c.spent += o.total;
    if (o.placedAt > c.last) c.last = o.placedAt;
    map.set(key, c);
  }
  const list = [...map.values()].sort((a, b) => b.spent - a.spent);
  return (
    <>
      <div className="nx-head">
        <div><h1>Clients</h1><p>{list.length} clients identifiés par leur téléphone. Aucun compte n'est obligatoire pour acheter.</p></div>
        <div className="actions"><button className="nx-btn"><Icon name="download" size={16} /> Exporter</button></div>
      </div>
      <section className="nx-panel">
        <div className="nx-toolbar"><label className="nx-search"><Icon name="search" size={16} /><input placeholder="Nom, téléphone…" aria-label="Rechercher un client" /></label></div>
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead><tr><th scope="col">Client</th><th scope="col">Téléphone</th><th scope="col">Ville</th><th scope="col" className="right">Commandes</th><th scope="col" className="right">Total payé</th><th scope="col">Dernière commande</th></tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.key}>
                    <td><div className="nx-prod"><span className="nx-avatar" style={{ width: 30, height: 30, borderRadius: 8, fontSize: 12 }}>{c.name[0]}</span>{c.name}</div></td>
                    <td className="mono">{c.phone ? displayPhone(c.phone) : "—"}</td>
                    <td className="muted">{c.city}</td>
                    <td className="right mono">{c.orders}</td>
                    <td className="right mono">{xaf(c.spent)}</td>
                    <td className="muted">{dateFr(c.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { getPages } from "@/server/repo";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Pages" };

export default async function Pages({ params }: StoreParams) {
  const { store, base } = await loadStore(params);
  return (
    <>
      <div className="nx-head">
        <div><h1>Pages</h1><p>Pages d'information et pages légales de la boutique.</p></div>
      </div>
      <section className="nx-panel">
        <div className="nx-card flush">
          <table className="nx-table">
            <thead><tr><th scope="col">Titre</th><th scope="col">Adresse</th><th scope="col">Statut</th></tr></thead>
            <tbody>
              {(await getPages(store.id)).map((p) => (
                <tr key={p.slug}>
                  <td><Link href={`${base}/pages/${p.slug}`}><strong style={{ fontWeight: 500 }}>{p.title}</strong></Link></td>
                  <td className="mono muted">{store.slug}.ecom.nerix.site/{p.slug}</td>
                  <td><span className="nx-pill ok">Publiée</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";
import { xaf } from "@/lib/format";

export const metadata = { title: "Produits" };

export default async function Products({ params }: StoreParams) {
  const { base, products, categories } = await loadStore(params);
  return (
    <>
      <div className="nx-head">
        <div><h1>Produits</h1><p>{products.length} produits, {products.reduce((n, p) => n + p.variants.length, 0)} variantes</p></div>
        <div className="actions"><Link className="nx-btn" href={`${base}/editeur/produit`}><Icon name="layout" size={16} /> Modèle de page produit</Link>
          <button className="nx-btn"><Icon name="download" size={16} /> Importer CSV</button>
          <Link href={`${base}/produits/nouveau`} className="nx-btn dark"><Icon name="plus" size={16} /> Ajouter un produit</Link>
        </div>
      </div>
      <section className="nx-panel">
        <div className="nx-toolbar">
          <div className="nx-segment"><button aria-current="true">Tous</button><button>Actifs</button><button>Brouillons</button><button>Archivés</button></div>
          <label className="nx-search" style={{ marginLeft: "auto" }}><Icon name="search" size={16} /><input placeholder="Nom, SKU…" aria-label="Rechercher un produit" /></label>
        </div>
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead>
                <tr><th scope="col">Produit</th><th scope="col">Statut</th><th scope="col">Catégorie</th><th scope="col" className="right">Stock</th><th scope="col" className="right">Prix</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = p.variants.reduce((n, v) => n + v.available, 0);
                  const prices = p.variants.map((v) => v.price);
                  return (
                    <tr key={p.slug}>
                      <td>
                        <Link href={`${base}/produits/${p.slug}`} className="nx-prod">
                          <img className="nx-thumb" src={p.images[0]?.src} alt="" />
                          <span><strong style={{ fontWeight: 500 }}>{p.name}</strong><small>{p.variants.length} variante{p.variants.length > 1 ? "s" : ""}</small></span>
                        </Link>
                      </td>
                      <td><span className="nx-pill ok">Actif</span></td>
                      <td className="muted">{categories.find((c) => c.path === p.categoryPath)?.name}</td>
                      <td className="right">{p.soldOutWhenEmpty ? <span className={`nx-pill ${stock <= 5 ? "wait" : "ok"}`}>{stock}</span> : <span className="nx-pill ok" title="Toujours commandable, même sans stock">Sans limite</span>}</td>
                      <td className="right mono">{Math.min(...prices) === Math.max(...prices) ? xaf(prices[0]!) : `${xaf(Math.min(...prices))} – ${xaf(Math.max(...prices))}`}</td>
                      <td><Link href={`${base}/produits/${p.slug}`} className="nx-btn sm">Modifier</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

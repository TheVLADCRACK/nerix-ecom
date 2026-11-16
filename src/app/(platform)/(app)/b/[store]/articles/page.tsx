import Link from "next/link";
import { getPosts } from "@/server/repo";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";
import { dateFr } from "@/lib/format";

export const metadata = { title: "Articles" };

export default async function Articles({ params }: StoreParams) {
  const { store, base } = await loadStore(params);
  const posts = (await getPosts(store.id, true));
  return (
    <>
      <div className="nx-head">
        <div><h1>Articles</h1><p>Guides et conseils publiés sur le blog de la boutique.</p></div>
        <div className="actions"><Link href={`${base}/articles/nouveau`} className="nx-btn dark"><Icon name="plus" size={16} /> Nouvel article</Link></div>
      </div>
      <section className="nx-panel">
        <div className="nx-card flush">
          <div className="nx-tablewrap">
            <table className="nx-table">
              <thead><tr><th scope="col">Titre</th><th scope="col">Catégorie</th><th scope="col">Statut</th><th scope="col">Publié le</th><th scope="col" className="right">Lecture</th></tr></thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.slug}>
                    <td style={{ whiteSpace: "normal" }}><Link href={`${base}/articles/${p.slug}`}><strong style={{ fontWeight: 500 }}>{p.title}</strong></Link></td>
                    <td className="muted">{p.category}</td>
                    <td><span className="nx-pill ok">Publié</span></td>
                    <td className="muted">{dateFr(p.publishedAt)}</td>
                    <td className="right mono">{p.minutes} min</td>
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

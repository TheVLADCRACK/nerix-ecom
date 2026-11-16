import Link from "next/link";
import { ActionForm } from "@/components/platform/action-form";
import { loadStore, type StoreParams } from "@/components/platform/store-ctx";
import { Icon } from "@/components/ui/icons";
import { deleteCategory, moveCategory, saveCategory } from "@/server/actions/settings";

export const metadata = { title: "Catégories" };

export default async function Categories({ params, searchParams }: StoreParams & { searchParams: Promise<{ c?: string }> }) {
  const { store, base, products, categories } = await loadStore(params);
  const c = (await searchParams).c ?? "";
  const editing = categories.find((x) => x.path === c);
  const creating = c === "nouvelle" || !editing;
  const count = (path: string) => products.filter((p) => p.categoryPath === path || p.categoryPath.startsWith(`${path}/`)).length;
  // Arborescence dans l'ordre d'affichage : chaque catégorie suivie de ses sous-catégories.
  const tree = (parent: string | null, depth = 0): { cat: (typeof categories)[number]; depth: number }[] =>
    categories.filter((x) => x.parentPath === parent).flatMap((cat) => [{ cat, depth }, ...tree(cat.path, depth + 1)]);
  const rows = tree(null);
  const parents = categories.filter((x) => x.path.split("/").length < 3 && x.path !== editing?.path && !x.path.startsWith(`${editing?.path}/`));
  return (
    <>
      <div className="nx-head">
        <div><h1>Catégories</h1><p>Organisez le catalogue (3 niveaux au plus). Une catégorie vide peut être supprimée.</p></div>
        <div className="actions"><Link className="nx-btn dark" href={`${base}/categories?c=nouvelle`}><Icon name="plus" size={16} /> Nouvelle catégorie</Link></div>
      </div>
      <div className="nx-grid form">
        <section className="nx-panel">
          <header><span className="nx-label">Arborescence</span></header>
          <div className="nx-card flush">
            <table className="nx-table">
              <thead><tr><th scope="col">Nom</th><th scope="col">Adresse</th><th scope="col" className="right">Produits</th><th scope="col"><span className="sr-only">Ordre</span></th></tr></thead>
              <tbody>
                {rows.map(({ cat, depth }) => (
                  <tr key={cat.path} aria-current={cat.path === editing?.path || undefined}>
                    <td style={{ paddingLeft: 14 + depth * 20 }}>{depth ? "└ " : ""}<Link href={`${base}/categories?c=${encodeURIComponent(cat.path)}`}><strong style={{ fontWeight: depth ? 400 : 600 }}>{cat.name}</strong></Link></td>
                    <td className="mono muted">/categories/{cat.path}</td>
                    <td className="right mono">{count(cat.path)}</td>
                    <td>
                      <span style={{ display: "flex", gap: 4 }}>
                        <form action={moveCategory.bind(null, store.slug, cat.path, "up")}><button className="nx-btn sm icon" aria-label={`Monter ${cat.name}`}><Icon name="up" size={14} /></button></form>
                        <form action={moveCategory.bind(null, store.slug, cat.path, "down")}><button className="nx-btn sm icon" aria-label={`Descendre ${cat.name}`}><Icon name="down" size={14} /></button></form>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="nx-panel">
          <header><span className="nx-label">{creating ? "Nouvelle catégorie" : `Modifier : ${editing.name}`}</span></header>
          <div className="nx-card">
            <ActionForm key={editing?.path ?? "new"} action={saveCategory.bind(null, store.slug, creating ? "" : editing.path)} submit={creating ? "Créer" : "Enregistrer"}>
              <label className="nx-field"><span>Nom</span><input className="nx-input" name="name" required defaultValue={editing?.name} /></label>
              <label className="nx-field"><span>Adresse (minuscules et tirets)</span><input className="nx-input mono" name="slug" required pattern="[a-z0-9-]{2,60}" defaultValue={editing?.slug} /></label>
              <label className="nx-field"><span>Catégorie parente</span>
                <select className="nx-select" name="parent" defaultValue={editing?.parentPath ?? ""}><option value="">Aucune (racine)</option>{parents.map((r) => <option key={r.path} value={r.path}>{r.path.replace(/\//g, " › ")}</option>)}</select>
              </label>
              <label className="nx-field"><span>Description</span><textarea className="nx-textarea" name="description" defaultValue={editing?.description} /></label>
            </ActionForm>
            {!creating && count(editing.path) === 0 && !categories.some((x) => x.parentPath === editing.path) && (
              <form action={deleteCategory.bind(null, store.slug, editing.path)} style={{ marginTop: 12 }}><button className="nx-btn ghost" style={{ color: "var(--nx-red)" }}><Icon name="x" size={14} /> Supprimer la catégorie</button></form>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

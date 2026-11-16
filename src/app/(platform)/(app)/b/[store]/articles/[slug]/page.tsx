import { notFound } from "next/navigation";
import { ContentEditor } from "@/components/platform/content-editor";
import { loadStore } from "@/components/platform/store-ctx";
import { savePost } from "@/server/actions/settings";
import { getPostBySlug } from "@/server/repo";

export default async function ArticleEdit({ params }: { params: Promise<{ store: string; slug: string }> }) {
  const { store, base, products } = await loadStore(params);
  const { slug } = await params;
  const post = slug === "nouveau" ? null : await getPostBySlug(store.id, slug);
  if (slug !== "nouveau" && !post) notFound();
  return (
    <ContentEditor
      kind="article"
      back={`${base}/articles`}
      title={post?.title ?? ""}
      url={post ? `/s/${store.slug}/blog/${post.slug}` : null}
      body={post?.bodyMd ?? ""}
      action={savePost.bind(null, store.slug, slug)}
      side={
        <>
          <label className="nx-field"><span>Statut</span><select className="nx-select" name="status" defaultValue={post?.status ?? "draft"}><option value="draft">Brouillon</option><option value="published">Publié</option></select></label>
          <label className="nx-field"><span>Adresse</span><input className="nx-input mono" name="slug" defaultValue={post?.slug ?? ""} required pattern="[a-z0-9-]{2,60}" /></label>
          <label className="nx-field"><span>Catégorie</span><input className="nx-input" name="category" defaultValue={post?.category ?? ""} maxLength={60} /></label>
          <label className="nx-field"><span>Résumé</span><textarea className="nx-textarea" name="excerpt" defaultValue={post?.excerpt ?? ""} maxLength={300} /></label>
          <label className="nx-field"><span>Produit cité (un seul)</span>
            <select className="nx-select" name="product" defaultValue={post?.productSlugs[0] ?? ""}><option value="">Aucun</option>{products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select>
          </label>
          {post && post.sources.length > 0 && (
            <div className="nx-field"><span>Sources</span>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--nx-muted)", fontSize: 12.5 }}>{post.sources.map((s) => <li key={s.url}>{s.title || s.url}</li>)}</ul>
            </div>
          )}
        </>
      }
    />
  );
}

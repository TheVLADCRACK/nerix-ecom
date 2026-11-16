import { notFound } from "next/navigation";
import { ContentEditor } from "@/components/platform/content-editor";
import { loadStore } from "@/components/platform/store-ctx";
import { savePage } from "@/server/actions/settings";
import { getPageBySlug } from "@/server/repo";

export default async function PageEdit({ params }: { params: Promise<{ store: string; slug: string }> }) {
  const { store, base } = await loadStore(params);
  const { slug } = await params;
  const page = await getPageBySlug(store.id, slug);
  if (!page) notFound();
  return (
    <ContentEditor kind="page" back={`${base}/pages`} title={page.title} url={`/s/${store.slug}/${page.slug}`} body={page.bodyMd} action={savePage.bind(null, store.slug, slug)}
      side={page.bodyMd.includes("{{DELIVERY_TABLE}}") ? <p className="nx-alert"><code>{"{{DELIVERY_TABLE}}"}</code> affiche automatiquement le tableau des villes, frais et délais.</p> : undefined} />
  );
}

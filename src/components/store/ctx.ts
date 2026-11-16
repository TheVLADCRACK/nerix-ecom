import { notFound } from "next/navigation";
import { getCatalog, getCities, getPosts, getStore } from "@/server/repo";
import { getBase } from "./base";
import type { SectionData } from "./sections";

export type FrontParams = { params: Promise<{ store: string }> };

/** Boutique publique : uniquement les boutiques en ligne ; données filtrées par store_id. */
export async function loadFront(params: FrontParams["params"]) {
  const { store: slug } = await params;
  const store = await getStore(slug);
  if (!store || store.status !== "active") notFound();
  const [base, catalog, posts, cities] = await Promise.all([getBase(store.slug), getCatalog(store.id), getPosts(store.id), getCities(store.id)]);
  const data: SectionData = {
    products: catalog.products.filter((p) => p.status === "active"),
    categories: catalog.categories,
    posts: posts.map(({ slug: s, title, excerpt, category, minutes }) => ({ slug: s, title, excerpt, category, minutes })),
    heroImage: store.heroImage,
  };
  return { store, base, data, cities, posts };
}

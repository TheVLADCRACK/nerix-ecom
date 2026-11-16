import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth";
import { getBooks, getCatalog, getCities, getOrders, getStore } from "@/server/repo";

export type StoreParams = { params: Promise<{ store: string }> };

/** Boutique de l'URL /b/[store] (après contrôle de la session) avec ses données (lectures mises en cache pour la requête). 404 si inconnue. */
export async function loadStore(params: StoreParams["params"]) {
  const staff = await requireStaff(); // chaque page de boutique vérifie la session et l'appartenance à l'équipe
  const { store: slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  const [orders, books, catalog, cities] = await Promise.all([getOrders(store.id), getBooks(store), getCatalog(store.id), getCities(store.id, true)]);
  // Commandes archivées (tests, doublons) : seulement dans la liste des commandes, jamais dans les calculs.
  return { staff, store, base: `/b/${store.slug}`, orders: orders.filter((o) => !o.archived), allOrders: orders, books, products: catalog.products, categories: catalog.categories, cities, lists: store.settings.lists };
}

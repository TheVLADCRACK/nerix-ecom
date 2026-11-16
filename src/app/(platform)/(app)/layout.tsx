import { Sidebar } from "@/components/platform/sidebar";
import { ServiceWorker } from "@/components/platform/sw-register";
import { Topbar } from "@/components/platform/topbar";
import { requireStaff } from "@/server/auth";
import { getMenuCounts, listStores } from "@/server/repo";

// Outil réservé à l'équipe : toujours rendu à la demande (session lue à chaque requête).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [stores, counts] = await Promise.all([listStores(), getMenuCounts()]);
  return (
    <div className="nx-shell">
      <Sidebar stores={stores.map(({ slug, name, logo, status }) => ({ slug, name, logo, status }))} pending={counts.pending} unread={counts.unread} user={{ name: user.name, role: "Administrateur" }} />
      <div className="nx-main">
        <Topbar storeNames={Object.fromEntries(stores.map((s) => [s.slug, s.name]))} initials={user.name.slice(0, 1).toUpperCase()} />
        <main className="nx-content">{children}</main>
        <ServiceWorker />
      </div>
    </div>
  );
}

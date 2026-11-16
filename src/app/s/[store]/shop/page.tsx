import Link from "next/link";
import { NewsBand } from "@/components/store/band";
import { Carousel } from "@/components/store/carousel";
import { loadFront, type FrontParams } from "@/components/store/ctx";
import { ProductCard } from "@/components/store/product-card";
import { Icon, type IconName } from "@/components/ui/icons";
import { getSoldBySku } from "@/server/repo";

export const metadata = { title: "Shop" };

const PER_PAGE = 9;
const ICONS: Record<string, IconName> = { energie: "zap", maison: "store", beaute: "sparkle" };

type SP = { categorie?: string; tri?: string; page?: string };

export default async function Shop({ params, searchParams }: FrontParams & { searchParams: Promise<SP> }) {
  const { store, base, data } = await loadFront(params);
  const sp = await searchParams;
  const cat = data.categories.find((c) => c.path === sp.categorie);
  const bySku = await getSoldBySku(store.id);
  const sold = new Map(data.products.map((p) => [p.name, p.variants.reduce((n, v) => n + (bySku.get(v.sku) ?? 0), 0)]));
  let list = data.products.filter((p) => !cat || p.categoryPath === cat.path || p.categoryPath.startsWith(`${cat.path}/`));
  if (sp.tri === "promotions") list = list.filter((p) => p.variants.some((v) => v.compareAt));
  if (sp.tri === "ventes") list = [...list].sort((a, b) => (sold.get(b.name) ?? 0) - (sold.get(a.name) ?? 0));
  if (sp.tri === "nouveautes") list = [...list].reverse();
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const href = (patch: Partial<SP>) => {
    const q = new URLSearchParams(Object.entries({ categorie: sp.categorie, tri: sp.tri, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `${base}/shop${q.size ? `?${q}` : ""}`;
  };
  const roots = data.categories.filter((c) => !c.parentPath);
  const filters: { key: string; label: string; icon: IconName }[] = [
    { key: "nouveautes", label: "Nouveautés", icon: "sparkle" },
    { key: "ventes", label: "Meilleures ventes", icon: "star" },
    { key: "promotions", label: "En promotion", icon: "tag" },
  ];
  const nums = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <>
      <section className="sf-shophero" aria-hidden="true">
        <div className="bg" style={{ backgroundImage: `url(${store.heroImage})` }} />
        <div className="giant">Shop</div>
      </section>
      <div className="sf-wrap">
        <div className="sf-shopbar">
          <h1 className="sf-t">{cat ? cat.name : "Tout ce qu'il vous faut"}</h1>
          <form action={`${base}/recherche`} role="search">
            <Icon name="search" size={16} />
            <label className="sr-only" htmlFor="shop-q">Rechercher</label>
            <input id="shop-q" name="q" placeholder={`Rechercher sur ${store.name}`} />
            <button className="sf-btn primary" type="submit">Rechercher</button>
          </form>
        </div>
        <div className="sf-shop">
          <nav className="sf-tree" aria-label="Catégories">
            <h2>Catégories</h2>
            <Link href={href({ categorie: undefined, page: undefined })} aria-current={!cat && !sp.tri ? "page" : undefined}>
              <Icon name="box" size={16} /> Tous les produits <span className="sf-count">{data.products.length}</span>
            </Link>
            {roots.map((r) => {
              const kids = data.categories.filter((c) => c.parentPath === r.path);
              return (
                <div key={r.path} style={{ display: "contents" }}>
                  <Link href={href({ categorie: r.path, page: undefined })} aria-current={cat?.path === r.path ? "page" : undefined}>
                    <Icon name={ICONS[r.slug] ?? "tag"} size={16} /> {r.name}
                  </Link>
                  {kids.length > 0 && (
                    <div className="kids">
                      {kids.map((c) => <Link key={c.path} href={href({ categorie: c.path, page: undefined })} aria-current={cat?.path === c.path ? "page" : undefined}>{c.name}</Link>)}
                    </div>
                  )}
                </div>
              );
            })}
            <hr />
            {filters.map((f) => (
              <Link key={f.key} href={href({ tri: sp.tri === f.key ? undefined : f.key, page: undefined })} aria-current={sp.tri === f.key ? "page" : undefined}>
                <Icon name={f.icon} size={16} /> {f.label} <Icon name="chevron" size={14} className="chev" />
              </Link>
            ))}
          </nav>
          <div>
            {shown.length ? (
              <div className="sf-grid">{shown.map((p, i) => <ProductCard key={p.slug} p={p} priority={i < 3} />)}</div>
            ) : (
              <div className="sf-empty sf-glass"><strong>Aucun produit pour ce filtre pour le moment.</strong><Link href={`${base}/shop`} className="sf-btn light">Voir tous les produits</Link></div>
            )}
            <nav className="sf-pager" aria-label="Pagination">
              <Link href={href({ page: String(page - 1) })} aria-disabled={page <= 1}><Icon name="arrowLeft" size={15} /> Précédent</Link>
              <span className="nums">{nums.map((n) => <Link key={n} href={href({ page: String(n) })} aria-current={n === page ? "page" : undefined}>{n}</Link>)}</span>
              <Link href={href({ page: String(page + 1) })} aria-disabled={page >= pages}>Suivant <Icon name="arrowRight" size={15} /></Link>
            </nav>
          </div>
        </div>
        <Carousel title="Nos recommandations">{data.products.map((p) => <ProductCard key={p.slug} p={p} />)}</Carousel>
        <NewsBand storeName={store.name} />
      </div>
    </>
  );
}

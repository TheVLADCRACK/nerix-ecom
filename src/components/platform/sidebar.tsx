"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { signOutAction } from "@/server/auth-actions";

type StoreLite = { slug: string; name: string; logo: string; status: string };
type Item = { href: string; label: string; icon: IconName; count?: number; exact?: boolean };

export function Sidebar({ stores, pending, unread = {}, user }: { stores: StoreLite[]; pending: Record<string, number>; unread?: Record<string, number>; user: { name: string; role: string } }) {
  const path = usePathname();
  const bar = useRef<HTMLElement>(null);
  const slug = path.match(/^\/b\/([^/]+)/)?.[1];
  const current = stores.find((s) => s.slug === slug);
  const b = slug ? `/b/${slug}` : "";

  // Dans une boutique : seulement ses menus (la plateforme reste accessible par le sélecteur en haut).
  const groups: { title: string; items: Item[] }[] = current
    ? [
        { title: "Boutique", items: [
          { href: b, label: "Tableau de bord", icon: "dashboard", exact: true },
          { href: `${b}/commandes`, label: "Commandes", icon: "orders", count: pending[current.slug] },
          { href: `${b}/produits`, label: "Produits", icon: "box" },
          { href: `${b}/paniers`, label: "Paniers abandonnés", icon: "cart" },
          { href: `${b}/clients`, label: "Clients", icon: "users" },
          { href: `${b}/messages`, label: "Messages", icon: "inbox", count: unread[current.slug] },
          { href: `${b}/avis`, label: "Avis clients", icon: "star" },
        ] },
        { title: "Gestion", items: [
          { href: `${b}/compta`, label: "Comptabilité", icon: "wallet" },
          { href: `${b}/achats`, label: "Achats et stock", icon: "box" },
          { href: `${b}/depenses`, label: "Dépenses et pertes", icon: "cash" },
          { href: `${b}/campagnes`, label: "Campagnes et pixels", icon: "pixel" },
          { href: `${b}/livraison`, label: "Livraison", icon: "truck" },
          { href: `${b}/paiements`, label: "Paiements", icon: "phone" },
        ] },
        { title: "Site", items: [
          { href: `${b}/editeur`, label: "Éditeur de boutique", icon: "layout" },
          { href: `${b}/categories`, label: "Catégories", icon: "tag" },
          { href: `${b}/articles`, label: "Articles", icon: "pen" },
          { href: `${b}/pages`, label: "Pages", icon: "file" },
          { href: `${b}/parametres`, label: "Paramètres", icon: "settings" },
          { href: `${b}/journal`, label: "Journal d'activité", icon: "file" },
        ] },
      ]
    : [{ title: "Plateforme", items: [
        { href: "/", label: "Vue d'ensemble", icon: "globe", exact: true },
        { href: "/boutiques", label: "Boutiques", icon: "store" },
        { href: "/equipe", label: "Équipe", icon: "shield" },
        { href: "/parametres", label: "Paramètres", icon: "settings" },
      ] }];

  const isActive = (i: Item) => (i.exact ? path === i.href || path === `${i.href}/` : path === i.href || path.startsWith(`${i.href}/`));
  // Barre du bas (mobile) : garde l'onglet actif visible après navigation.
  useEffect(() => { bar.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" }); }, [path]);

  return (
    <aside className="nx-side">
      <div className="nx-brand">
        <img src="/nerix.png" alt="" />
        <span>Nerix Ecom</span>
        <span className="nx-demo" title="Étape A : les modifications ne sont pas encore enregistrées">Aperçu</span>
      </div>
      <details className="nx-switch">
        <summary>
          <span className="logo">{current ? <img src={current.logo} alt="" /> : <img src="/nerix.png" alt="" style={{ padding: 6, background: "#fff" }} />}</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <small>{current ? "Boutique" : "Espace"}</small>
            <strong>{current?.name ?? "Toutes les boutiques"}</strong>
          </span>
          <Icon name="updown" size={16} />
        </summary>
        <div className="nx-switch-menu" role="menu">
          <Link href="/" aria-current={!current}>
            <img src="/nerix.png" alt="" style={{ padding: 3 }} /> Vue d'ensemble
          </Link>
          <hr />
          {stores.map((s) => (
            <Link key={s.slug} href={`/b/${s.slug}`} aria-current={s.slug === slug}>
              <img src={s.logo} alt="" /> {s.name}
              {s.status === "draft" && <span className="nx-pill off" style={{ marginLeft: "auto" }}>Brouillon</span>}
            </Link>
          ))}
          <hr />
          <Link href="/boutiques/nouvelle"><Icon name="plus" /> Créer une boutique</Link>
        </div>
      </details>
      {groups.map((g) => (
        <nav className="nx-nav" key={g.title} aria-label={g.title}>
          <div className="nx-nav-title">{g.title}</div>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href || "/"} aria-current={isActive(i) ? "page" : undefined}>
              <Icon name={i.icon} /> {i.label}
              {!!i.count && <span className="count">{i.count}</span>}
            </Link>
          ))}
        </nav>
      ))}
      <nav className="nx-bottom" aria-label="Menu" ref={bar}>
        {groups.flatMap((g) => g.items).map((i) => (
          <Link key={`m${i.href}`} href={i.href || "/"} aria-current={isActive(i) ? "page" : undefined}>
            <span className="ic"><Icon name={i.icon} size={19} />{!!i.count && <span className="count">{i.count}</span>}</span>
            {i.label}
          </Link>
        ))}
      </nav>
      <div className="nx-me">
        <span className="nx-avatar">{user.name.slice(0, 1)}</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <strong>{user.name}</strong>
          <small>{user.role}</small>
        </span>
        <form action={signOutAction}><button type="submit" className="nx-iconbtn" style={{ width: 30, height: 30 }} aria-label="Se déconnecter"><Icon name="logout" size={15} /></button></form>
      </div>
    </aside>
  );
}

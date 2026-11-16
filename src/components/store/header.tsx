"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { useStore } from "./cart";

export function StoreHeader({ name, logo }: { name: string; logo: string }) {
  const { base, count } = useStore();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links: { href: string; label: string; icon: IconName }[] = [
    { href: `${base}/`, label: "Accueil", icon: "store" },
    { href: `${base}/shop`, label: "Shop", icon: "box" },
    { href: `${base}/blog`, label: "Blog", icon: "pen" },
  ];
  const active = (href: string) => (href.endsWith("/") ? path === href || path === href.slice(0, -1) : path.startsWith(href));
  return (
    <header className="sf-header">
      <div className="sf-wrap">
        <div className="sf-nav sf-glass">
          <Link href={`${base}/`} className="sf-logo"><img src={logo} alt="" width={30} height={30} /> {name}</Link>
          <nav className="links" aria-label="Navigation principale">
            {links.map((l) => <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}>{l.label}</Link>)}
          </nav>
          <div className="tools">
            <Link href={`${base}/recherche`} className="sf-iconbtn" aria-label="Rechercher"><Icon name="search" size={19} /></Link>
            <Link href={`${base}/panier`} className="sf-iconbtn" aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}>
              <Icon name="cart" size={19} />
              {count > 0 && <span className="sf-badge">{count}</span>}
            </Link>
            <Link href={`${base}/suivi-commande`} className="sf-iconbtn track" aria-label="Suivre une commande"><Icon name="truck" size={19} /></Link>
            <button className="sf-iconbtn sf-menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "x" : "menu"} size={20} /></button>
          </div>
        </div>
        {open && (
          <nav className="sf-drawer sf-glass" aria-label="Menu mobile">
            {[...links, { href: `${base}/suivi-commande`, label: "Suivre ma commande", icon: "truck" as IconName }, { href: `${base}/contact`, label: "Contact", icon: "message" as IconName }].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} aria-current={active(l.href) ? "page" : undefined}><Icon name={l.icon} size={18} /> {l.label}</Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

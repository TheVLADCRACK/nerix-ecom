"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { NotificationBell } from "./notifications";

const LABELS: Record<string, string> = {
  b: "", commandes: "Commandes", produits: "Produits", categories: "Catégories", clients: "Clients", livraison: "Livraison", paiements: "Paiements",
  editeur: "Éditeur de boutique", articles: "Articles", pages: "Pages", parametres: "Paramètres", boutiques: "Boutiques", nouvelle: "Nouvelle boutique", modifier: "Modifier", produit: "Page produit",
  nouveau: "Nouveau", equipe: "Équipe", messages: "Messages", avis: "Avis clients", compta: "Comptabilité", achats: "Achats et stock", depenses: "Dépenses et pertes", campagnes: "Campagnes et pixels", journal: "Journal d'activité", suivi: "Pixels et suivi", paniers: "Paniers abandonnés",
};

export function Topbar({ storeNames, initials }: { storeNames: Record<string, string>; initials: string }) {
  const parts = usePathname().split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [{ label: "Nerix Ecom", href: "/" }];
  let acc = "";
  parts.forEach((p, i) => {
    acc += `/${p}`;
    if (p === "b") return;
    // « nouvelle » après « commandes » = saisie de commande, ailleurs = nouvelle boutique.
    const label = parts[i - 1] === "b" ? (storeNames[p] ?? p) : parts[i - 1] === "commandes" && p === "nouvelle" ? "Saisir une commande" : (LABELS[p] ?? decodeURIComponent(p));
    crumbs.push({ label, href: acc });
  });
  if (crumbs.length === 1) crumbs.push({ label: "Vue d'ensemble", href: "/" });

  return (
    <header className="nx-top">
      <nav className="nx-crumbs" aria-label="Fil d'Ariane">
        {crumbs.map((c, i) => (
          <span key={c.href + i} style={{ display: "contents" }}>
            {i > 0 && <Icon name="chevronRight" size={14} />}
            {i === crumbs.length - 1 ? <b>{c.label}</b> : <Link href={c.href}>{c.label}</Link>}
          </span>
        ))}
      </nav>
      <label className="nx-search">
        <Icon name="search" size={16} />
        <input placeholder="Rechercher…" aria-label="Rechercher" />
        <span className="nx-kbd">⌘ K</span>
      </label>
      <NotificationBell />
      <button className="nx-iconbtn" aria-label="Messages"><Icon name="inbox" size={17} /></button>
      <span className="nx-avatar" aria-hidden="true">{initials}</span>
    </header>
  );
}

import type { MetadataRoute } from "next";

/** Application installable de l'outil (ecom.nerix.site) : écran d'accueil du téléphone, plein écran, raccourcis. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nerix Ecom",
    short_name: "Nerix",
    description: "Gérez vos boutiques : commandes, stock, paniers abandonnés et comptabilité.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Vue d'ensemble", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Boutiques", url: "/boutiques", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

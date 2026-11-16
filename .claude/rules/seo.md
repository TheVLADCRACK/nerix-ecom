---
paths:
  - "src/app/**"
  - "src/components/store/**"
  - "src/data/**"
  - "docs/content/**"
---
# SEO et contenu

Références : docs/seo/ (STRATEGY, TECHNICAL_ARCHITECTURE, PRODUCT_CONTENT_STRATEGY, BLOG_CONTENT_STRATEGY).

- URL en français, en minuscules et avec des tirets, stables. Un changement de slug crée une entrée dans `redirects` (301).
- Chaque page indexable définit `generateMetadata` : title (≤ 60 caractères utiles), description (≤ 160), canonical absolu, Open Graph.
- Pages filtrées, triées, de recherche interne, panier, checkout, suivi et admin : `noindex`. L'admin est aussi exclu par `robots.txt` **et** protégé par authentification.
- Données structurées JSON-LD générées côté serveur à partir des données réelles : `Product` + `Offer` (prix XAF, disponibilité), `BreadcrumbList`, `Organization`, `Article`, `FAQPage` si la FAQ est visible. Pas d'`AggregateRating` sans avis réels.
- `sitemap.ts` et `robots.ts` dynamiques ; pas de `.htaccess` (Hostinger exécute Next.js en serveur Node : à confirmer avant toute règle Apache/LiteSpeed).
- Contenu : aucune caractéristique, promesse ou allégation sans source enregistrée (`product_specifications.source`, `posts.sources`). Pas de texte généré en masse ni de pages dupliquées par variante.
- Images : nom de fichier descriptif, `alt` qui décrit l'image, AVIF/WebP, dimensions explicites.

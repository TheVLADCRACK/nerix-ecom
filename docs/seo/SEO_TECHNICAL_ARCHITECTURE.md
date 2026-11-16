# Architecture SEO technique

> Statut : **proposé, à valider**.

## 1. URL

| Page | URL | Indexée |
|---|---|---|
| Accueil | `/` | Oui |
| Catégorie (1 à 3 niveaux) | `/categories/energie`, `/categories/energie/powerbanks` | Oui (si ≥ 2 produits actifs) |
| Fiche produit | `/produits/powerbank-magnetique-10000-mah` | Oui |
| Marque | `/marques/biodance` | Oui (si contenu utile) |
| Ventes flash | `/ventes-flash` | Oui pendant une vente, sinon `noindex` et contenu « Aucune vente en cours » |
| Nouveautés | `/nouveautes` | Oui |
| Recherche | `/recherche?q=` | **Non** |
| Filtres / tri | `?prix=…&tri=…` | **Non** (canonical vers la catégorie sans paramètre) |
| Pagination | `/categories/energie?page=2` | Oui, canonical **vers elle-même** (pas vers la page 1) |
| Panier, commande, confirmation, suivi | `/panier`, `/commande`, `/suivi-commande` | **Non** |
| Blog | `/blog`, `/blog/[slug]`, `/blog/categorie/[slug]` | Oui |
| Pages | `/livraison`, `/paiement`, `/retours`, `/contact`, `/a-propos`, `/faq`, `/cgv`, `/confidentialite`, `/mentions-legales` | Oui (sauf mentions si souhaité) |
| Admin | `/admin/**` | **Non** (robots + authentification + `noindex`) |

Les variantes ne créent pas d'URL indexables (paramètre `?variante=` avec canonical vers la fiche). Un slug modifié crée automatiquement une redirection 301 (table `redirects`).

Pas de conflit de routes : `categories`, `produits`, `marques` et `blog` sont des préfixes distincts ; les pages éditoriales ont des slugs réservés, contrôlés à la création.

## 2. Métadonnées

- `generateMetadata` côté serveur sur chaque route indexable.
- Title : `{Nom produit} – {bénéfice clé} | Energy Plus` (≤ 60 caractères utiles). Valeur administrable (`seo_title`), avec un gabarit par défaut.
- Description : 140 à 160 caractères, administrable. Gabarit par défaut sans remplissage artificiel.
- Canonical absolu sur toutes les pages. `metadataBase` = domaine de production.
- Open Graph et Twitter Card : titre, description, image 1200×630 (variante générée), `og:type=product` pour les fiches (avec prix en XAF), `article` pour le blog.
- `lang="fr"` ; pas de `hreflang` en V1 (une seule langue, un seul pays). À prévoir si une version anglaise est faite (question Q-S3).

## 3. Données structurées (JSON-LD, côté serveur)

| Page | Types | Règles |
|---|---|---|
| Toutes | `Organization` (nom, logo, contacts), `WebSite` | Logo PNG carré ≥ 112 px (le logo actuel de 322 px convient). |
| Fiche produit | `Product`, `Offer` (`price`, `priceCurrency: XAF`, `availability`, `itemCondition`), `BreadcrumbList` | `brand` seulement si la marque est connue. `aggregateRating` et `review` **seulement** avec de vrais avis approuvés. Politique de retour et livraison (`hasMerchantReturnPolicy`, `shippingDetails`) une fois validées. |
| Catégorie | `BreadcrumbList`, `ItemList` | — |
| Article | `Article`, `BreadcrumbList`, `FAQPage` si la FAQ est visible | `author` = Energy Plus ; `datePublished` / `dateModified` réels. |

Validation : Rich Results Test de Google et tests unitaires qui comparent le JSON-LD aux données affichées.

## 4. Sitemap et robots

- `src/app/sitemap.ts` : produits actifs, catégories indexables, articles publiés, pages ; `lastModified` = `updated_at`. Découpage en plusieurs sitemaps au-delà de 10 000 URL (limite Google : 50 000).
- `src/app/robots.ts` :
  ```
  User-agent: *
  Disallow: /admin
  Disallow: /api/
  Disallow: /panier
  Disallow: /commande
  Disallow: /suivi-commande
  Disallow: /recherche
  Sitemap: https://<domaine>/sitemap.xml
  ```
  `robots.txt` n'est pas une protection : l'admin reste protégé par l'authentification.

## 5. `.htaccess`

**Non créé.** Une Web App Node.js Hostinger exécute le serveur Next.js ; redirections et en-têtes sont gérés dans `next.config` (`redirects()`, `headers()`) et dans la table `redirects`. On ne vérifiera la présence d'un serveur Apache ou LiteSpeed en frontal que sur l'offre réelle (question Q-H1), et un `.htaccess` ne sera ajouté que si c'est utile et confirmé.

## 6. llms.txt et llms-full.txt

Constat : `llms.txt` est une proposition de convention, pas un standard. Aucune documentation officielle de Google consultée dans cette phase ne le mentionne comme signal de classement (à revérifier avant la mise en ligne). Son coût est faible (fichier statique généré). **Proposition** : `llms.txt` court (présentation, liens vers catégories, guides et politiques) généré par une route ; **pas** de `llms-full.txt` en V1 (risque de dupliquer le catalogue et les prix). Décision ADR-012.

## 7. Redirections et erreurs

- Table `redirects` administrable (301 par défaut), lue par le proxy (cache court en mémoire).
- Produit archivé : page conservée avec « Produit plus disponible » et alternatives (code 200) pendant 6 mois, puis 301 vers la catégorie. Produit supprimé par erreur : 410 seulement sur décision.
- 404 utile (recherche, catégories), avec un vrai statut 404.

## 8. Images

- Variantes AVIF et WebP (320, 640, 960, 1600 px), `next/image` avec `sizes`, largeur et hauteur explicites.
- Nom de fichier descriptif à l'import (`powerbank-magnetique-10000-mah-blanc-face.avif`).
- `alt` rédigé (décrit l'image, sans liste de mots-clés).
- Sitemap d'images facultatif (V2).

## 9. Rendu et indexabilité

Pages publiques rendues côté serveur (HTML complet sans JavaScript). Pas de contenu chargé seulement côté client. Vérification par l'inspection d'URL de Search Console après lancement.

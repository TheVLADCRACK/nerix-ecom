# Stratégie SEO

> Statut : **proposé, à valider**. Volumes de recherche : **non mesurés** (aucun outil de mots-clés connecté : Ahrefs nécessite une autorisation, Search Console n'existe pas encore). Les priorités ci-dessous sont des hypothèses à vérifier.

## 1. Objectifs

1. Être trouvé sur les recherches **produit + Cameroun / ville** (« powerbank magnétique Douala », « lampe anti moustique Yaoundé »).
2. Capter les recherches de **problème** (« téléphone se décharge vite », « se protéger des moustiques la nuit », « pores dilatés ») avec des guides honnêtes, reliés aux produits.
3. Rassurer : pages livraison, paiement à la livraison, retours et contact, indexées et reliées.

Le trafic initial viendra surtout des publicités et de WhatsApp. Le SEO est un levier de moyen terme : il compte dès la conception (structure, performance, données structurées), même si son effet est progressif.

## 2. Architecture des URL

Voir [SEO_TECHNICAL_ARCHITECTURE.md § 1](SEO_TECHNICAL_ARCHITECTURE.md). Principe : URL françaises, courtes, sans identifiant technique, sans date dans les articles.

## 3. Stratégie de mots-clés (hypothèses)

| Groupe | Intention | Exemples de requêtes à vérifier | Page cible |
|---|---|---|---|
| Powerbank magnétique | Transactionnelle | powerbank magnétique, batterie externe MagSafe, power bank iPhone Cameroun, powerbank 10000mAh prix Douala | Fiche produit + catégorie Powerbanks |
| Autonomie / coupures | Informationnelle | téléphone déchargé coupure de courant, combien de recharges 10000mAh | Articles powerbank 1 et 2 |
| Anti-moustiques | Transactionnelle | lampe anti moustique rechargeable, piège à moustique électrique prix Cameroun | Fiche MosqitoShot |
| Moustiques / paludisme | Informationnelle (sensible) | comment éloigner les moustiques la nuit, moustiquaire ou lampe | Articles MosqitoShot 1 et 2 |
| Biodance | Transactionnelle (marque) | biodance collagen ampoule, biodance Cameroun, sérum collagène pores | Fiche Biodance |
| Pores, routine | Informationnelle | resserrer les pores, routine peau grasse climat chaud | Articles Biodance |
| Réassurance | Navigationnelle | paiement à la livraison Douala, boutique en ligne fiable Cameroun | Pages livraison, paiement, retours |

Méthode de validation (EP-062) : Google Search Console après le lancement, Google Trends (Cameroun), suggestions de recherche, puis outil payant si le budget le permet (question Q-S1).

**Mapping** : une requête principale par page, pas de cannibalisation (une seule page vise « powerbank magnétique »).

## 4. Fiches produits

Règles dans [PRODUCT_CONTENT_STRATEGY.md](PRODUCT_CONTENT_STRATEGY.md). En résumé : un dossier de recherche par produit, des caractéristiques sourcées, du contenu propre à Energy Plus (pas de description fournisseur copiée), et des allégations prudentes.

## 5. Catégories

Chaque catégorie indexable a : un H1, un texte d'introduction utile (80 à 150 mots, écrit, pas généré), une grille produits, une FAQ courte si elle répond à de vraies questions, et des liens vers les guides. Une catégorie vide ou avec un seul produit est **non indexée** jusqu'à ce qu'elle soit fournie.

## 6. Blog

Stratégie détaillée dans [BLOG_CONTENT_STRATEGY.md](BLOG_CONTENT_STRATEGY.md). 9 premiers brouillons (3 par produit) dans [docs/content/blog-drafts/](../content/blog-drafts/).

## 7. Maillage interne

- Accueil → univers → catégories → produits (3 clics au plus).
- Fiche produit → 2 ou 3 guides liés (« Pour aller plus loin ») et accessoires.
- Article → produits cités (bloc produit) et article voisin.
- Fil d'Ariane sur toutes les pages, avec données structurées `BreadcrumbList`.
- Pied de page : livraison, paiement, retours, contact, à propos.

## 8. SEO local

- Page « Livraison » listant les villes desservies et les délais (données issues de `delivery_zones`).
- Fiche d'établissement Google si un point de retrait ou une adresse physique existe (question Q-S2) ; sinon, pas de fausse adresse.
- Numéros de service client par opérateur (comme Oraimo), visibles et cohérents partout (NAP).

## 9. Fichiers et techniques

`robots.txt`, `sitemap.xml`, canonical, Open Graph, redirections, optimisation des images : voir [SEO_TECHNICAL_ARCHITECTURE.md](SEO_TECHNICAL_ARCHITECTURE.md).

## 10. Mesure

Search Console (impressions, clics, pages indexées, Core Web Vitals) dès la mise en ligne. GA4 seulement après la mise en place du consentement (voir SECURITY_ARCHITECTURE § Données personnelles).

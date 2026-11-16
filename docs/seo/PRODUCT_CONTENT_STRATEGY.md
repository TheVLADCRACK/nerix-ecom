# Stratégie de contenu des fiches produits

> Statut : **proposé, à valider**. Dossiers de recherche : [docs/content/products/](../content/products/).

## 1. Processus obligatoire avant rédaction

1. **Identifier le produit exact** : marque, référence ou modèle, fournisseur, variantes réellement en stock. Sans référence identifiée, pas de fiche publiée.
2. **Collecter les sources** : fiche technique du fournisseur, emballage (photo), notice, certificats, page officielle de la marque. Les revendeurs tiers ne valent que comme indice.
3. **Remplir le dossier produit** (`docs/content/products/<produit>.md`) : faits confirmés (avec source), faits à confirmer, allégations interdites, questions clients.
4. **Rédiger** la fiche à partir des seuls faits confirmés.
5. **Relire** : chaque chiffre a une source ; aucune promesse de santé ou de résultat garanti ; prix et garanties conformes aux données du back-office.
6. **Valider** : le propriétaire approuve, puis la fiche passe en statut `active`.

## 2. Structure d'une fiche (blocs administrables, tous facultatifs sauf *)

| Bloc | Contenu |
|---|---|
| Galerie* | 4 à 8 images réelles du produit vendu, fond neutre en premier |
| Titre* | Nom générique clair + élément distinctif (`Powerbank magnétique 10 000 mAh`) |
| Prix* | Prix XAF ; prix barré seulement si réellement pratiqué avant |
| Disponibilité* | Calculée depuis le stock (« En stock », « Plus que 3 » seulement si vrai, « Rupture ») |
| Réassurance* | Paiement à la livraison, Mobile Money, délais de livraison par ville, retours |
| Bénéfices | 3 à 5 puces concrètes, chacune reliée à une caractéristique sourcée |
| Description | 150 à 300 mots : à qui il sert, dans quelles situations, limites d'usage |
| Caractéristiques | Tableau généré depuis `product_specifications` (seulement les lignes vérifiées) |
| Contenu de la boîte | D'après l'emballage réel |
| Compatibilité | Liste exacte (ex. modèles d'iPhone) avec source |
| Conseils d'utilisation et sécurité | Charge, chaleur, stockage, précautions (notice) |
| FAQ | 3 à 6 vraies questions clients (WhatsApp, appels) |
| Avis | Avis modérés, badge « Achat vérifié » si c'est le cas |
| Guides liés | 2 ou 3 articles du blog |
| Produits complémentaires | Accessoires, `product_relations` |

## 3. Règles de rédaction

- Ton : direct, concret, en français courant du Cameroun ; vouvoiement.
- Pas de superlatifs invérifiables (« le meilleur », « n°1 »), pas de « garanti à vie ».
- Les capacités sont présentées honnêtement (la capacité nominale en mAh n'est pas l'énergie restituée, voir l'article dédié).
- **Santé et cosmétique** : aucun effet médical (« soigne », « élimine l'acné », « protège du paludisme »). On parle de confort, de routine, d'usage ; un renvoi vers un professionnel de santé si nécessaire.
- **Marques tierces** : nommer la marque seulement pour un produit authentique (Biodance), sans utiliser son logo hors de la photo produit, et sans laisser croire à un partenariat officiel.
- Aucune description de fournisseur ou de concurrent copiée.

## 4. SEO de la fiche

- Une requête principale par fiche, dans le H1, le title, le premier paragraphe et l'`alt` de l'image principale, sans répétition forcée.
- Données structurées `Product` + `Offer`, voir [SEO_TECHNICAL_ARCHITECTURE.md § 3](SEO_TECHNICAL_ARCHITECTURE.md#3-données-structurées-json-ld-côté-serveur).
- Variantes sur la même URL.

## 5. État des 3 produits (14/11/2026)

| Produit | Référence identifiée | Sources fiables | Publiable |
|---|---|---|---|
| Powerbank magnétique | **Non** (plusieurs modèles différents sur les photos) | Aucune fiche fournisseur | Non : référence et fiche technique requises |
| MosqitoShot | **Non** (nom commercial seul, fabricant inconnu) | Aucune | Non : notice et fiche technique requises |
| Biodance Pore Tightening Collagen Ampoule | Oui (marque et nom), format à confirmer (15, 30 ou 50 ml existent) | Revendeurs européens et australiens (composition partielle) | Non : photo de l'emballage réel (INCI) et preuve d'approvisionnement requises |

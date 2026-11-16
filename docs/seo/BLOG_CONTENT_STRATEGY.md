# Stratégie éditoriale du blog

> Statut : **proposé, à valider**. Remplace la reprise des articles Abersoft, introuvables (décision du 14/11/2026 : 3 articles par produit).

## 1. Principe

Partir des **problèmes réels des clients** (coupures de courant, autonomie, moustiques la nuit, peau sous un climat chaud et humide), y répondre honnêtement, et proposer le produit seulement quand il est pertinent, **en disant aussi ce qu'il ne fait pas**. Un article qui vend trop perd la confiance et, sur la santé, expose juridiquement la boutique.

## 2. Types d'articles

| Type | But | Exemple |
|---|---|---|
| Guide problème | Capter une recherche informationnelle | « Coupures de courant : garder son téléphone chargé » |
| Explication technique | Rendre un achat plus éclairé | « 10 000 mAh : combien de recharges réelles ? » |
| Mode d'emploi / sécurité | Réduire les retours et le SAV | « Bien placer sa lampe anti-moustiques » |
| Comparatif honnête | Aider à choisir | « Moustiquaire, répulsif, lampe : que fait chaque solution ? » |
| Composition / routine | Rassurer sur un cosmétique | « Ce que contient l'ampoule Biodance » |

## 3. Architecture éditoriale

- Catégories du blog : **Énergie et mobile**, **Maison et confort**, **Beauté et soins**, **Guides d'achat**.
- Chaque article : 1 requête principale, H1 unique, introduction qui répond tout de suite, intertitres en questions, FAQ facultative, **sources listées en bas** (champ `posts.sources`), bloc « Produits cités » (`post_products`).
- Longueur : celle qu'il faut pour répondre (600 à 1 200 mots), sans remplissage.
- Date de mise à jour visible ; révision tous les 12 mois ou à chaque changement de produit.

## 4. Règles de rédaction

- Aucun chiffre sans source ; les calculs montrent leurs hypothèses.
- Santé : citer l'OMS ou une autorité sanitaire, renvoyer vers un médecin ou un pharmacien, ne jamais présenter un produit comme une prévention médicale.
- Pas de faux témoignages, pas d'« avant / après ».
- Ton de conseil, pas de pression (« offre limitée » interdit dans un article).
- Rédaction humaine ou relue par un humain : chaque brouillon est relu et validé par le propriétaire avant publication.

## 5. Les 9 premiers brouillons

| Produit | Article | Requête visée (hypothèse) | Fichier |
|---|---|---|---|
| Powerbank | Coupures de courant : comment garder son téléphone chargé | téléphone déchargé coupure de courant | [powerbank-magnetique/01-coupures-de-courant.md](../content/blog-drafts/powerbank-magnetique/01-coupures-de-courant.md) |
| Powerbank | 10 000 mAh : combien de recharges pour votre téléphone ? | combien de recharge powerbank 10000mah | [02-capacite-reelle-mah.md](../content/blog-drafts/powerbank-magnetique/02-capacite-reelle-mah.md) |
| Powerbank | Batterie magnétique : compatibilité, sécurité, voyage | batterie magnétique iPhone compatible | [03-compatibilite-securite.md](../content/blog-drafts/powerbank-magnetique/03-compatibilite-securite.md) |
| MosqitoShot | Lampe anti-moustiques : ce qu'elle fait vraiment | lampe anti moustique efficace | [mosqitoshot/01-ce-que-fait-une-lampe.md](../content/blog-drafts/mosqitoshot/01-ce-que-fait-une-lampe.md) |
| MosqitoShot | Paludisme : les gestes de protection recommandés à la maison | se protéger des moustiques la nuit | [02-proteger-la-maison.md](../content/blog-drafts/mosqitoshot/02-proteger-la-maison.md) |
| MosqitoShot | Bien utiliser et entretenir sa lampe | comment utiliser lampe anti moustique | [03-utilisation-entretien.md](../content/blog-drafts/mosqitoshot/03-utilisation-entretien.md) |
| Biodance | Pores dilatés : comprendre avant de choisir un soin | resserrer les pores du visage | [biodance-collagen-ampoule/01-pores-dilates.md](../content/blog-drafts/biodance-collagen-ampoule/01-pores-dilates.md) |
| Biodance | Ce que contient l'ampoule Biodance au collagène | biodance collagen ampoule avis | [02-composition.md](../content/blog-drafts/biodance-collagen-ampoule/02-composition.md) |
| Biodance | Routine simple sous climat chaud et humide | routine peau grasse climat chaud | [03-routine-climat-chaud.md](../content/blog-drafts/biodance-collagen-ampoule/03-routine-climat-chaud.md) |

Statut de tous les brouillons : **à valider**. Les passages marqués `[À CONFIRMER]` attendent une donnée produit (référence, notice, emballage).

## 6. Suite (après lancement)

Un article par mois et par univers au départ, choisi d'après les questions reçues sur WhatsApp et les requêtes réelles de Search Console.

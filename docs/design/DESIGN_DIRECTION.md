# Direction artistique (cadre validé par le propriétaire)

> Statut : cadre **validé** le 14/11/2026 ; typographie **en attente de choix**. Le design system complet (tokens, composants) sera produit en tâche EP-020, après validation.

## Décisions du propriétaire

| Sujet | Décision |
|---|---|
| Nom | **Energy Plus** (ZAVORA est abandonné). |
| Référence principale | **Oraimo Cameroun** (https://cm.oraimo.com/) pour l'expérience commerciale. Shopify pour la gestion du back-office. On s'inspire des mécanismes, sans copier le code, l'identité ou les contenus. |
| Couleurs | **Celles du logo** : noir profond et or (éclair dégradé). |
| Thème | **Clair**, avec des **sections sombres** (hero, ventes flash, bandeaux de marque). |
| Police d'interface | **Plus Jakarta Sans**. |
| Police de titre | À choisir parmi 3 propositions (spécimen visuel publié en artefact). Recommandation : Clash Display (proposition « Tension »), sous réserve de la licence ITF. |

## Palette de départ (déduite du logo, à confirmer)

| Token | Valeur | Usage |
|---|---|---|
| `--ink` | #121211 | Texte principal |
| `--night` | #0c0c0c | Sections sombres |
| `--gold` | #d6ad45 | Accent sur fond sombre, boutons principaux sur fond sombre |
| `--gold-hi` | #f1d27c | Reflet, badges sur fond noir |
| `--gold-deep` | #8a6a1f | Or lisible sur fond clair (contraste ≈ 5:1 sur blanc) |
| `--paper` | #ffffff | Fond principal |
| `--mist` | #f3f3f1 | Sections claires secondaires |

Règle d'accessibilité : l'or clair (#d6ad45) n'est jamais utilisé pour du texte sur fond blanc (contraste insuffisant) ; on utilise alors `--gold-deep`.

## Enseignements d'Oraimo Cameroun (page d'accueil consultée le 14/11/2026)

Observés sur la page :
- Bandeau supérieur avec les numéros du service client par opérateur (Orange / MTN).
- Méga-menu par univers (Audio, Power, Montre et bureau, Soins personnels, Électroménager…), avec badges « Nouveau » et « Vente Flash » sur les produits.
- Rappel des garanties au panier : livraison gratuite à partir d'un seuil, paiement à la livraison, garantie.
- Vente flash avec **compte à rebours**, badge de remise en %, **pourcentage vendu**, prix barré, bouton « Acheter maintenant ».
- Cartes produits avec 2 bénéfices clés, note et nombre d'avis, boutons « Découvrir » et « Ajouter au panier ».
- Prix affichés en « FCFA 12,500 ».

Ce qu'Energy Plus retient : la clarté de l'offre (remise visible, bénéfices courts), les garanties près de l'achat, les ventes flash à durée affichée et le service client par opérateur.

Ce qu'Energy Plus fait autrement : un catalogue plus court et une mise en valeur premium (noir et or, grandes photos), des prix au format local `14 900 FCFA`, et **aucun pourcentage « vendu » ou compte à rebours fictif** (seulement des données réelles).

Limite : le site bloque les lectures automatisées (HTTP 403). Seule la page d'accueil a été consultée dans un navigateur ; checkout et compte client n'ont pas été explorés.

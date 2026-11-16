# Classeur ERP → Nerix Ecom

Source : `NERIX_ERP_E-com.xlsx` (classeur du propriétaire). L'application doit le remplacer entièrement. Ce document décrit son fonctionnement, ce qui en est extrait, et où chaque donnée vit dans l'application.

## Extraction

- `python3 -I scripts/erp_extract.py "<chemin du .xlsx>"` lit le classeur en lecture seule (bibliothèque standard) et écrit `data-private/erp.json`.
- `data-private/` est ignoré par Git : le fichier contient des téléphones de clients et des noms d'employés.
- Seules les **colonnes saisies** sont extraites. Les colonnes calculées (coûts, marges, stocks restants, rapports) sont recalculées par l'application avec les règles ci-dessous.
- Étape A : `src/data/erp.ts` lit ce fichier pour l'interface (commandes, prix, stocks). Étape B : import en base (script d'import idempotent, par `store_id`).

## Feuilles et correspondances

| Feuille | Contenu saisi | Lignes (au 2026-11-14) | Dans l'application |
|---|---|---|---|
| 02 - PARAMETRES | entreprise, taux EUR/FCFA (656), exercice (2026), seuil de stock faible (5), impôt (25 %), listes de référence | 6 réglages, 10 listes | Paramètres de la boutique + listes administrables |
| 03 - PRODUITS | lots d'achat : produit, SKU, fournisseur, date, quantité, prix unitaire, frais (transport, douane, expédition, emballage, bancaires, autres) | 7 lots | Produits + **Achats / lots** (coût de revient) |
| 04 - STOCK | journal des mouvements (stock initial, achat, vente, retour, perte, ajustements) | 7 | **Journal de stock** |
| 05 - COMMANDES | date, client, téléphone, ville, lieu, produit, quantité, prix, remise, partenaire, frais du partenaire, date de livraison, statut, motif d'annulation | 73 (63 livrées, 10 annulées), du 2026-06-25 au 2026-10-21 | Commandes, Clients |
| 08 - PUBLICITE | campagnes : plateforme, produits, villes, dépense et devise, taux, visites, commandes, CA attribué | 3 (Meta Ads) | **Publicité** (ROAS) |
| 09 - CHARGES | charges : catégorie, montant, périodicité, moyen de paiement, « inclus dans le coût de revient » | 9 | **Dépenses** |
| 10 - EMPLOYES | employés, fonction, salaire, paiements | 2 | **Employés** (hors outil public) |
| 11 - PERTES | pertes : produit, quantité, motif | 2 | **Pertes** |
| ACCUEIL, RAPPORTS, COMPTABILITE, LIVRAISONS (blocs de performance) | uniquement des calculs | — | Tableau de bord, Rapports, Comptabilité, Livraison |

## Règles de calcul reprises

- **CA, coût des ventes, marge** : uniquement les commandes **Livrée**, à la **date de livraison**.
- **Total client** = quantité × prix − remise. **Le client ne paie pas la livraison** : les « frais de livraison » sont ce que le partenaire facture à la boutique. L'application affiche donc la livraison « Offerte » au client (frais modifiables par ville dans Livraison).
- **Coût de revient unitaire d'un lot** = (quantité × prix d'achat + tous les frais) ÷ quantité, figé par lot. Frais bancaires du classeur : 1,79 % × achat + 350.
- **Stock restant** = Σ mouvements signés − quantités livrées. Écart constaté : le classeur affiche 127 Mosquitoshot alors que 2 pertes sont saisies sans mouvement « Perte » ; l'application les déduit (125). À confirmer par un inventaire.
- **Charges** marquées « inclus dans le coût de revient » exclues des charges (déjà dans les lots).
- **Résultat net** = résultat avant impôt × (1 − 25 %).
- **Prix de vente affiché** : prix le plus pratiqué sur les commandes livrées (Mosquitoshot 10 000, Powerbank 12 000).
- Statuts : En attente → `pending`, En cours → `processing`, Livrée → `completed` + payée, Annulée → `cancelled`.

## Chiffres de contrôle (exercice 2026, calculés par le classeur)

CA 806 250 · coût des ventes 114 120,52 · marge brute 692 129,48 · livraison 95 700 · publicité 136 284 · charges 19 108 · pertes 2 250,46 · résultat avant impôt 438 787,02 · résultat net 329 090,26 FCFA. Le tableau de bord de l'outil retrouve le même CA (806 250).

## Qualité des données à corriger avant l'import en base

- 8 commandes ont un téléphone non valide (« 1 », « 2 »…) : importées sans téléphone, donc introuvables par le suivi de commande.
- La plupart des commandes n'ont pas de nom de client : elles apparaissent comme « Client ».
- 9 commandes annulées ont une quantité de 0.
- Produits sans fiche boutique : Hub Multiports, Blender Fresh Juice, Bracelet Smart Tag, Smart Tag (photos et textes à fournir).
- Biodance n'a jamais été vendu : son prix (19 500) n'est pas confirmé par le classeur.
- « Powerbank Magsafe » = la version 10 000 mAh, seule vendue (confirmé par le propriétaire le 2026-11-14).
- Aucun client n'a commandé deux fois (65 numéros distincts) : la part « clients fidèles » du tableau de bord est donc à zéro.

## Dans l'outil (interface faite, enregistrement à l'étape B)

| Classeur | Outil |
|---|---|
| PARAMETRES | Paramètres de la boutique > Gestion (taux EUR, impôt, seuil de stock, partenaires, catégories de dépenses) |
| PRODUITS + STOCK | Achats et stock : lots, coût de revient unitaire, prix de vente, marge par unité, stock restant |
| COMMANDES + LIVRAISONS | Commandes : confirmer, livreur, frais facturés, livrée ou annulée avec motif, marge de la commande |
| PUBLICITE | Campagnes et pixels : dépense (FCFA ou EUR), période, commandes, CA attribué, ROAS, coût par livrée |
| CHARGES + PERTES | Dépenses et pertes |
| RAPPORTS + COMPTABILITE | Comptabilité (compte de résultat par mois et par année) et tableau de bord |
| EMPLOYES | Non repris : les salaires payés se saisissent comme dépense « Salaires » |

Contrôle : le compte de résultat 2026 de l'outil donne exactement les chiffres du classeur (bénéfice net 329 090 FCFA).
Le moteur de calcul est `src/lib/finance.ts` (testé dans `tests/finance.test.ts`).

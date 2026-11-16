# Nerix Ecom : plan de travail

> Décisions du 14/11/2026 : plateforme multi-boutiques réservée au propriétaire et à son équipe ; adresses `boutique.ecom.nerix.site` (en développement : `boutique.localhost:3000`) ; édition des boutiques par sections avec aperçu en direct ; outil en Plus Jakarta Sans + chiffres en mono ; boutiques en Plus Jakarta Sans + titres en Instrument Serif.

## 1. Produit

**Nerix Ecom** est l'outil d'administration : il permet de créer, construire et gérer plusieurs boutiques, et de passer de l'une à l'autre.
**Energy Plus** est la première boutique, publiée sur `energyplus.nerixecom.com`.
Chaque boutique a son nom, son logo (aussi utilisé comme favicon public), ses couleurs, ses polices, ses sections de page, son catalogue, ses commandes et ses contenus.

## 2. Architecture

Une seule application Next.js 16 (App Router), une seule base Neon, multi-boutique par la colonne `store_id`.

| Hôte | Rôle | Route interne |
|---|---|---|
| `ecom.nerix.site` (dev : `localhost:3000`) | Outil Nerix Ecom (privé, installable sur téléphone) | `src/app/(platform)/…` |
| `<boutique>.ecom.nerix.site` (dev : `<boutique>.localhost:3000`) | Boutique publique | réécrite par `src/proxy.ts` vers `src/app/s/[store]/…` |

- `src/proxy.ts` : lit le sous-domaine et réécrit les requêtes vers `/s/<boutique>/…`. L'accès direct à `/s/…` depuis l'hôte de l'outil sert aussi d'aperçu dans l'éditeur.
- **Sécurité multi-boutique** : chaque requête de l'outil vérifie la session, puis le rôle du membre **sur la boutique demandée** (`store_members`). Chaque requête SQL de la boutique filtre par `store_id`.
- Thème d'une boutique : jeton de couleurs et de polices + liste de sections ordonnées (JSON validé par Zod), rendus par une bibliothèque de sections.

## 3. Design

| Surface | Référence | Règles |
|---|---|---|
| Outil Nerix Ecom | `design/dashboard principal.jpg` (structure), `design/inspiration 2.jpg` (compléments) | Fond blanc, panneaux encadrés, sélecteur de boutique en haut de la barre latérale, KPI en mono, graphique en blocs, tableaux denses. Accent bleu du logo Nerix (`design/favicon-32.png`, aussi favicon de l'outil). |
| Boutique Energy Plus | `design/inspiration du shop.jpg` (page boutique), `design/inspirstion.jpg` (accueil et catégories) | Noir et or du logo, **pas de gris clair** : les sections claires deviennent des panneaux en verre (glassmorphisme), sections sombres pour les temps forts. Titres en Instrument Serif. |

## 4. Étapes

### Étape A : interface complète (données de démonstration typées)
1. Socle : polices, jetons CSS (outil et boutiques), proxy des sous-domaines, favicons.
2. Outil :
   - connexion et invitation ;
   - coque (barre latérale, sélecteur de boutique, barre supérieure) ;
   - vue d'ensemble de toutes les boutiques ;
   - liste des boutiques et création d'une boutique ;
   - par boutique : tableau de bord, commandes (liste et fiche), produits (liste et édition), catégories, clients, livraison, paiements, articles, pages, éditeur de boutique (sections et aperçu), paramètres ;
   - équipe et paramètres de la plateforme.
3. Boutique :
   - accueil construit à partir des sections ;
   - page boutique (catégories en arbre, grille, pagination) ;
   - fiche produit, recherche, panier, commande, confirmation, suivi de commande ;
   - blog et article, pages, contact, 404.
4. Démarrage et tests visuels (mobile et bureau, dans le navigateur).

### Étape B : back-end
1. Nouveau schéma multi-boutique (migrations), réinitialisation de la base de développement (aucune donnée réelle), seed d'Energy Plus.
2. Authentification Neon Auth, rôles par boutique, premier administrateur via jeton d'installation.
3. Branchement de chaque écran sur la base : catalogue, panier, commande transactionnelle, paiement à la livraison, KPay (activé si clés), livraison, contenus, éditeur de sections, médias (Neon Object Storage).
4. Sécurité : limitation de débit, en-têtes, audit, tests Vitest ; build ; déploiement.

## 5. Hors périmètre pour l'instant
Inscription publique de marchands, facturation, domaines personnalisés par boutique, comptes clients.

## 6. État au 14/11/2026

**Étape A terminée** (interface complète, données de démonstration) :
- Outil : connexion, invitation, réinitialisation ; coque avec sélecteur de boutique ; vue d'ensemble ; boutiques (liste, création) ; par boutique : tableau de bord, commandes (liste, fiche), produits (liste, édition), catégories, clients, livraison, paiements, articles, pages, éditeur avec aperçu en direct, paramètres ; équipe ; paramètres de la plateforme.
- Boutique Energy Plus : accueil par sections, page boutique, fiche produit (JSON-LD), recherche, panier, commande, confirmation, suivi, blog, article, pages, contact, 404.
- Vérifié : 33 routes en 200, typage strict sans erreur, test Vitest du formatage, parcours d'achat complet dans le navigateur, aperçu en direct de l'éditeur, pas de débordement horizontal sur mobile (375 px).

**Prochaine étape : B (back-end).** Les écrans lisent `src/data/demo.ts` ; ils seront branchés sur la base sans changer l'interface.

## 7. État du back-end (2026-11-14)

- Schéma `ecom` multi-boutiques en base ; Energy Plus importée avec les données réelles du classeur (73 commandes, 7 lots, campagnes, charges, pertes).
- Toutes les pages lisent la base ; toutes les modifications de l'admin passent par des Server Actions journalisées.
- Connexion Neon Auth (compte créé avec le code d'installation), sessions renouvelées à l'usage, réinitialisation du mot de passe par email.
- Commande publique côté serveur : prix, stock (verrou par boutique), frais et total recalculés, numéro attribué, double envoi bloqué.
- KPay : Mobile Money et carte prêts ; inactifs tant que les clés de `.env.local` sont vides. Webhook signé : `POST /api/webhooks/kpay`.
- Ancien schéma `public` (premier essai mono-boutique, sans donnée réelle) : à supprimer après accord.
- Reste : premier compte administrateur (propriétaire), test d'une vraie commande, mise en ligne (propriétaire), invitations d'équipe.

# Stratégie de tests

> Statut : **proposé, à valider**. Outils : Vitest 5 (unitaires et intégration), Playwright 1.65 (E2E), branche Neon dédiée aux tests. Aucun test n'existe encore.

## 1. Pyramide

| Niveau | Part | Cible | Environnement |
|---|---|---|---|
| Unitaires | ~60 % | Fonctions pures : prix, promotions, frais, téléphone, transitions d'état, signature HMAC, formatage | Vitest, sans base |
| Intégration | ~30 % | Services + base réelle : commandes, stock, paiements, permissions, migrations | Vitest + branche Neon `test` (réinitialisée depuis le schéma) |
| E2E | ~10 % | Parcours critiques dans un navigateur mobile | Playwright (viewport 390×844, réseau ralenti pour 2 scénarios) |

KPay n'est **jamais** appelé dans les tests automatiques : un faux fournisseur (`FakeKpay`) implémente `PaymentProvider` et produit des webhooks signés avec un secret de test. La sandbox KPay sert à la recette manuelle (EP-047).

## 2. Scénarios obligatoires (repris de PROMPT.md et complétés)

| # | Scénario | Niveau | Critère de réussite |
|---|---|---|---|
| 1 | Création d'un produit | Intégration + E2E admin | Produit en brouillon, slug unique, audit écrit |
| 2 | Création d'une variante | Intégration | SKU unique, stock initialisé à 0, prix > 0 |
| 3 | Achat express (1 article) | E2E | Commande `pending`, numéro EP-…, réservation active |
| 4 | Achat panier (plusieurs articles) | E2E | Totaux = somme des lignes − remises + livraison (contrôle en base) |
| 5 | Commande COD jusqu'à la livraison | Intégration | Statuts commande, paiement et livraison cohérents à chaque étape |
| 6 | Mobile Money réussi | Intégration | Webhook signé → paiement `succeeded`, commande `paid`, outbox créée |
| 7 | Mobile Money échoué | Intégration | `failed`, commande conservée, nouvelle tentative possible |
| 8 | Webhook reçu deux fois | Intégration | Un seul effet, 2ᵉ réponse 200 sans changement |
| 9 | Stock insuffisant | Intégration + E2E | Rejet propre, aucune réservation partielle |
| 10 | Deux clients pour le dernier article | Intégration (concurrence, 20 requêtes parallèles) | Exactement 1 commande réussie, stock jamais négatif |
| 11 | Annulation | Intégration | Réservations libérées, promotion rendue, événement écrit |
| 12 | Retour | Intégration | Remboursement enregistré, stock réintégré après contrôle |
| 13 | Livraison échouée | Intégration | Motif obligatoire, nouvelle tentative ou retour en stock |
| 14 | Remboursement | Intégration | `refunded_xaf` ≤ montant, statut de la commande mis à jour, audit |
| 15 | Avis vérifié | Intégration | Badge seulement si la ligne de commande est livrée et appartient au client |
| 16 | Coupon expiré | Unitaire + intégration | Refus avec message clair |
| 17 | Vente flash terminée | Unitaire (horloge simulée) | Prix normal appliqué dès `ends_at` |
| 18 | Upload d'image invalide | Intégration | Faux JPEG (script renommé) refusé, rien en base |
| 19 | Accès non autorisé au dashboard | Intégration + E2E | Sans session → redirection ; mauvais rôle → 403 + audit |
| 20 | Perte temporaire de connexion à Neon | Intégration (driver coupé) | Erreur propre côté client, aucune commande à moitié écrite, nouvelle tentative idempotente réussie |
| 21 | Double clic sur « Confirmer la commande » | E2E | Une seule commande (clé d'idempotence) |
| 22 | Prix modifié entre panier et checkout | Intégration | Le client voit le nouveau total avant de confirmer |
| 23 | Webhook à signature invalide | Intégration | 401, `webhook_rejections`, aucun effet |
| 24 | Montant KPay différent de l'attendu | Intégration | Alerte et audit, pas de confirmation silencieuse |
| 25 | Réservation expirée | Intégration (horloge simulée) | Stock libéré par la tâche, commande annulée si non payée |

## 3. Autres types de tests

| Type | Contenu | Outil | Moment |
|---|---|---|---|
| API / actions | Contrats Zod, codes d'erreur, absence de fuite d'informations | Vitest | CI |
| Base de données | Migrations appliquées sur une base vide et sur une copie de `main` ; contraintes (les 8 contrôles déjà réalisés en conception, automatisés) | Vitest + branche Neon | CI + avant chaque migration |
| Sécurité | Tests d'autorisation de chaque action admin, en-têtes, `npm audit`, recherche de secrets, upload malveillant, webhook falsifié | Vitest, script CI | CI + avant mise en production |
| Accessibilité | axe-core sur les pages clés + contrôle manuel au clavier et au lecteur d'écran (VoiceOver / TalkBack) | Playwright + @axe-core/playwright (dépendance à valider) | Avant chaque mise en production |
| Responsive | Captures 360, 390, 768, 1280 px des pages clés | Playwright | Avant chaque mise en production |
| Performance | Lighthouse mobile (LCP, CLS, INP en laboratoire) sur accueil, catégorie, fiche, checkout ; `EXPLAIN` des requêtes principales | Lighthouse CI ou Chrome DevTools MCP | Avant mise en production + mensuel |
| Non-régression | Toute la suite + un test par bug corrigé | CI | Chaque changement |

## 4. Données de test

Fixtures dans `tests/fixtures` : catalogue de test (produits nommés « Produit test… »), 3 villes, 5 quartiers, comptes admin par rôle. Aucune donnée personnelle réelle. La branche Neon de test est recréée à chaque exécution de CI.

## 5. Critères de fin d'une tâche

Lint, typecheck et tests au vert ; nouveaux tests pour la logique ajoutée ; critères d'acceptation de la tâche vérifiés ; résultats rapportés tels quels (y compris les échecs).

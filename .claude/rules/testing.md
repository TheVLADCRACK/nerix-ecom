---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "tests/**"
---
# Tests

Référence : docs/testing/TEST_STRATEGY.md.

- Unitaires (Vitest) pour toute logique pure : calcul de prix et remises, frais de livraison, normalisation du téléphone, transitions d'état, vérification de signature.
- Intégration (Vitest + branche Neon de test, jamais `main`) pour tout ce qui touche la base : création de commande, réservation concurrente, webhooks en double, permissions.
- E2E (Playwright, viewport mobile) pour les parcours critiques : achat COD, achat Mobile Money simulé, suivi, connexion admin, confirmation de commande.
- KPay n'est jamais appelé en test : utiliser l'adaptateur de test et des webhooks signés avec un secret de test. La sandbox KPay sert seulement à la recette manuelle.
- Chaque bug corrigé ajoute un test qui le reproduit.
- Un test qui échoue n'est ni supprimé ni désactivé sans accord ; le rapport indique les résultats réels.
- Données de test dans `tests/fixtures`, jamais de données personnelles réelles.

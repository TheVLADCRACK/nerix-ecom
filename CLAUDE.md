# Nerix Ecom

Plateforme multi-boutiques (type Shopify) réservée au propriétaire et à son équipe. L'outil **Nerix Ecom** crée, construit (éditeur de sections sans code) et gère des boutiques. Première boutique : **Energy Plus** (Cameroun, XAF, mobile d'abord, paiement à la livraison). Plan et décisions : [docs/PLAN.md](docs/PLAN.md).

## Phase en cours

Développement autorisé par le propriétaire : étape A (interface complète), puis étape B (back-end). Suivre l'ordre de docs/PLAN.md.

## Stack

- Next.js 16 App Router, React 19, TypeScript strict, Zod 4 à toutes les frontières.
- PostgreSQL 18 sur Neon (projet `odd-tree-12471015`), requêtes SQL paramétrées via `@neondatabase/serverless` (`src/lib/db.ts`).
- Neon Auth (`@neon/auth`) pour l'outil. Neon Object Storage pour les médias. KPay + paiement à la livraison.
- Hébergement Vercel (sous-domaines génériques). Pas de Cloudflare.

## Architecture

- `src/proxy.ts` réécrit `<boutique>.<domaine>` vers `src/app/s/[store]/…`. L'outil vit dans `src/app/(platform)/…`.
- Multi-boutique : toute donnée métier porte un `store_id` ; toute requête filtre par boutique ; toute action de l'outil vérifie la session **et** le rôle du membre sur la boutique.
- Données dans le schéma Postgres `ecom` (`database/migrations/0100_ecom.sql`). Lectures : `src/server/repo.ts` ; écritures : Server Actions `src/server/actions/*` (session + permission, Zod strict, store_id, audit_log).
- `src/server/*` : logique serveur (`import "server-only"`). `src/lib/*` : utilitaires (dont `finance.ts`, moteur de calcul testé). `src/components/{platform,store,ui}` : interface.
- Server Components par défaut ; Client Components seulement pour l'interactivité.

## Design

- Outil : `design/dashboard principal.jpg`. Plus Jakarta Sans + Geist Mono pour les chiffres, accent bleu Nerix, favicon `design/favicon-32.png`.
- Boutiques : `design/inspiration du shop.jpg` et `design/inspirstion.jpg`. Energy Plus : noir et or, pas de gris clair (panneaux en verre), titres Instrument Serif, logo de la boutique comme favicon public.
- Couleurs et tailles uniquement via les variables CSS (`src/styles`).

## Règles absolues

- **Git** : jamais de commit, push, PR ni publication. Le propriétaire s'en charge.
- **Attribution** : aucune signature, aucune mention « généré par IA ».
- **Secrets** : `.env.local` uniquement (ignoré par Git), lus via `src/lib/env.ts`, jamais en `NEXT_PUBLIC_*`, jamais affichés.
- **Contenu** : aucune caractéristique, garantie ou promesse de santé sans source ; aucun avis, compteur ou « % vendu » fictif sur une boutique publique.
- **Sécurité** : session et permission vérifiées côté serveur dans chaque action ; Zod sur chaque entrée ; prix, stock et paiement toujours recalculés côté serveur ; webhooks KPay vérifiés par HMAC sur le corps brut. Détails : `.claude/rules/security.md`.
- **Honnêteté** : ne jamais annoncer un test ou une opération qui n'a pas été exécuté.

## Commandes

`npm run dev` · `npm run build` · `npm run typecheck` · `npm test` · `npm run db:migrate` · `npm run db:import` (boutique + classeur ERP, refuse d'écraser sans `--reset`)

En local, la boutique s'ouvre sur `http://energyplus.localhost:3000` et l'outil sur `http://localhost:3000`.

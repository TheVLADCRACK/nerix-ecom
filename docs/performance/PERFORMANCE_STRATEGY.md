# Stratégie de performance

> Statut : **proposé, à valider**. Aucune mesure n'existe (pas de code). Les objectifs seront vérifiés par des mesures réelles, pas par déclaration.

## 1. Objectifs (mobile milieu de gamme, 4G)

| Indicateur | Objectif (75ᵉ centile) |
|---|---|
| LCP | ≤ 2,5 s (fiche produit, accueil, catégorie) |
| INP | ≤ 200 ms |
| CLS | ≤ 0,1 |
| TTFB (page en cache ISR) | ≤ 600 ms depuis le Cameroun [À MESURER : distance Hostinger / Neon Francfort] |
| JavaScript client initial | ≤ 120 Ko compressé sur les pages boutique |
| Poids de l'image LCP | ≤ 120 Ko (AVIF) |
| Création de commande (serveur) | ≤ 800 ms au p95 |

## 2. Contraintes propres au projet

- **Pas de CDN** (Cloudflare écarté) : les images sont servies directement depuis Neon Object Storage (Francfort) et les pages par Hostinger. Il faut donc des fichiers légers, un cache navigateur long et des variantes pré-générées.
- **Démarrage à froid** possible du processus Node.js Hostinger et de la base Neon (mise en veille après 5 min en Free) : les premières requêtes seront plus lentes. Mesures : surveillance de `/api/health` (qui garde l'application active) et plan Neon sans mise en veille en production (ADR-002).
- Clientèle majoritairement mobile, réseaux parfois lents : chaque Ko compte.

## 3. Checklist des 31 règles de `RULES.md`

Statut : **P** = prévu dans l'architecture · **S** = sans objet · **V2** = plus tard.

| # | Règle | Statut | Comment / pourquoi |
|---|---|---|---|
| 1 | Squelettes au lieu de spinners | P | `loading.tsx` en squelette sur catégories, fiche, admin |
| 2 | Images WebP/AVIF, tailles adaptées | P | Variantes 320–1600 px générées à l'import, `next/image` + `sizes` |
| 3 | Pas d'appels API en double | P | Données lues en Server Components avec `cache()` de React ; pas de récupération côté client des données de page |
| 4 | Debounce de la recherche | P | 250 ms, minimum 2 caractères |
| 5 | Pagination | P | Toutes les listes ; curseur pour la boutique |
| 6 | Fichiers statiques sur CDN | **Adapté** | Pas de CDN (décision) : cache long et versionné ; Neon recommande pourtant un CDN pour les objets publics. Risque R-04 |
| 7 | Tâches lentes en file | P | `outbox_jobs` (notifications, médias, réconciliation) |
| 8 | Requêtes N+1 | P | Jointures et `inArray`, règle de revue |
| 9 | Compression Brotli/gzip | P | Compression de Next.js / serveur Hostinger [À VÉRIFIER sur l'offre] |
| 10 | Cache Redis | **S (V1)** | Pas de Redis : cache ISR et `unstable_cache` par tags suffisent au volume prévu |
| 11 | Dépendances inutiles | P | Chaque dépendance justifiée (CLAUDE.md) ; analyse du bundle en CI |
| 12 | Timeouts sur les API externes | P | 10 s KPay, 5 s SMS, via `AbortSignal.timeout` |
| 13 | Réponses IA en streaming | S | Aucune IA dans le produit V1 |
| 14 | Interface optimiste | P | Panier, avec rétablissement en cas d'erreur |
| 15 | Lazy load des images sous l'écran | P | Par défaut avec `next/image` ; `priority` seulement pour l'image LCP |
| 16 | Requêtes indépendantes en parallèle | P | `Promise.all` dans les services (règle backend) |
| 17 | Index sur les filtres et tris | P | [INDEXING_STRATEGY.md](../database/INDEXING_STRATEGY.md) |
| 18 | Traces OpenTelemetry | V2 | Logs JSON avec durée et `requestId` en V1 ; OTel si un problème le justifie |
| 19 | Serveurs près de la base | **À valider** | Neon Francfort ; centre de données Hostinger à choisir en Europe (France ou Pays-Bas) [question Q-H2] |
| 20 | Rendu serveur ou au build | P | RSC + ISR pour les pages publiques |
| 21 | Scripts tiers après la page | P | Pixels chargés après consentement, `next/script` en `lazyOnload` |
| 22 | JavaScript découpé par page | P | Natif avec l'App Router |
| 23 | Listes virtualisées | V2 | Seulement si une liste admin dépasse quelques centaines de lignes affichées (pagination d'abord) |
| 24 | Pas de `SELECT *` | P | Règle base de données |
| 25 | Pool de connexions | P | Chaîne poolée Neon (PgBouncer) + Pool du driver |
| 26 | Pas de re-renders inutiles | P | Îlots clients petits, état au plus près de son usage |
| 27 | Cache navigateur sur les statiques | P | `immutable` sur `/_next/static` et les médias versionnés |
| 28 | Load balancing | S | Une instance suffit au trafic prévu ; à réévaluer avec les mesures |
| 29 | Polices auto-hébergées, 2 graisses | P | `next/font`, 2 familles, 3 graisses au total (voir étude typographique) |
| 30 | Monitoring des vrais utilisateurs | P (V1 simple) | `useReportWebVitals` vers une route interne, agrégé dans l'admin ; Search Console |
| 31 | Tests sur téléphone et réseau lents | P | Profils Playwright et DevTools : CPU ×4, réseau « Slow 4G » |

## 4. Mesure

- Laboratoire : Lighthouse mobile sur 4 pages clés à chaque mise en production (seuils bloquants : LCP 2,5 s, CLS 0,1, poids JS).
- Terrain : Web Vitals collectés (sans donnée personnelle), tableau p75 par page dans l'admin.
- Serveur : durée des requêtes dans les logs ; requêtes lentes vues via les outils Neon.

# Architecture de sécurité

> Statut : **proposé, à valider**. Démarche : modèle de menaces STRIDE par frontière de confiance (skill `security-and-hardening`), puis contrôles alignés sur OWASP Top 10 (2021), OWASP API Security Top 10 (2023) et les chapitres pertinents d'OWASP ASVS 4.0 (niveau 2 visé pour l'admin et les paiements). **Aucune application n'est « totalement sécurisée »** : les risques résiduels sont listés en § 8.

## 1. Actifs à protéger

| Actif | Pourquoi |
|---|---|
| Comptes administrateurs | Contrôle total : prix, commandes, remboursements |
| Données clients | Nom, téléphone, quartier : données personnelles (loi n° 2024/017) |
| Flux d'argent | Paiements KPay, espèces COD, remboursements |
| Stock et prix | Fraude par manipulation du panier ou de l'admin |
| Secrets | Clés KPay, chaîne Neon, secret de webhook, secret de cron |
| Réputation | Allégations trompeuses, défiguration du site |

## 2. Frontières de confiance et menaces (STRIDE)

| Frontière | Menaces principales | Contrôles |
|---|---|---|
| Navigateur → boutique (checkout, recherche, suivi) | Falsification de prix ou de quantité (T), robots de fausses commandes (D), énumération du suivi (I), XSS par champs libres (T) | Recalcul serveur de tout montant, Zod strict, limitation de débit, couple numéro + téléphone pour le suivi, échappement React, CSP |
| Navigateur → admin | Vol de session (S), force brute (S), CSRF (T), élévation de privilège (E), IDOR (I) | Neon Auth (cookies HTTP-only, Secure, SameSite), blocage progressif, Server Actions avec contrôle d'origine, `requirePermission` dans chaque action, journal d'audit |
| KPay → webhook | Faux webhook « payé » (S), rejeu (T), surcharge (D) | HMAC-SHA256 sur le corps brut, comparaison en temps constant, dédoublonnage en base, relecture du statut par `GET` en cas de doute, limitation de débit |
| Application → KPay | Fuite de clés (I), montant falsifié (T) | Clés côté serveur seulement, montant lu en base, `externalId` = id du paiement |
| Upload admin → stockage | Fichier piégé (T), contenu illégal, exfiltration | URL pré-signée courte (5 min), bucket privé d'entrée, vérification de signature binaire, ré-encodage sharp, taille maximale |
| Application → Neon | Injection SQL (T), fuite de chaîne de connexion (I) | Drizzle paramétré, rôle `app_rw` sans DDL, secrets dans les variables Hostinger |
| Cron → `/api/cron/*` | Déclenchement abusif (D) | En-tête `CRON_SECRET` (comparaison en temps constant), tâches idempotentes |

## 3. Authentification et sessions (admin)

- **Neon Auth** (Better Auth géré) : email + mot de passe, sessions par cookie HTTP-only. Vérification de l'email activée. Réinitialisation par email (SMTP Neon partagé au démarrage, SMTP de la boutique en production : question Q-A3).
- Politique de mot de passe : 12 caractères minimum, mots de passe connus refusés si l'option est disponible, sinon contrôle dans le formulaire d'invitation.
- Expiration : session persistante par appareil (décision du propriétaire, 2026-11-14), renouvelée à l'usage, sans déconnexion pour inactivité. Révocation de toutes les sessions lors d'une désactivation, d'un changement de rôle ou via « Déconnecter tous les appareils ». Cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- Blocage progressif : 5 échecs en 15 min par compte et par IP → attente croissante + entrée dans `audit_log`.
- **MFA : non disponible dans Neon Auth à ce jour** (feuille de route Neon du 09/11/2026 : « coming soon »). Options dans l'ADR-005 :
  1. Neon Auth sans MFA + mesures compensatoires (comptes nominatifs, peu de super-administrateurs, alerte à chaque connexion d'un super-administrateur, revue hebdomadaire du journal), puis MFA dès sa sortie. **Recommandé.**
  2. Better Auth auto-hébergé sur Hostinger (avec plugin 2FA), base toujours sur Neon. Plus de maintenance, et écart à la consigne « Neon Auth ».

## 4. Autorisation

- Modèle RBAC : `roles` → `role_permissions` (codes `module.action`). Liste fermée des permissions dans le code ; la base ne fait que les attribuer.
- `requirePermission()` appelée **dans chaque Server Action et Route Handler admin**, pas seulement dans le proxy ou l'interface.
- Principe du moindre privilège : 4 rôles (USER_FLOWS § B). Le super-administrateur ne sert pas aux opérations quotidiennes.
- Tests automatiques : chaque action admin est appelée sans session, avec un rôle insuffisant et avec un compte désactivé (attendu : refus + audit).

## 5. Protection des entrées et des sorties

| Risque | Contrôle |
|---|---|
| Injection SQL | Drizzle / `sql` paramétré ; `sql.raw` interdit sur une donnée externe (règle de revue) |
| XSS | Rendu React échappé ; Markdown du blog converti côté serveur puis assaini (liste blanche de balises) ; CSP avec nonce |
| CSRF | Server Actions (vérification d'origine intégrée à Next.js) ; cookies `SameSite=Lax` ; aucun endpoint mutatif en `GET` |
| Validation | Zod `strict()` sur chaque entrée ; téléphones normalisés E.164 ; longueurs bornées (et doublées par des `CHECK` SQL) |
| Upload | Types autorisés : JPEG, PNG, WebP, AVIF, MP4 ; signature binaire vérifiée ; 10 Mo (images) / 50 Mo (vidéos) ; ré-encodage ; EXIF supprimées ; noms générés |
| Limitation de débit | `rate_limit_buckets` en base (pas de Redis en V1) : checkout 5 / 10 min / IP et téléphone ; suivi 5 / 10 min ; connexion 5 / 15 min ; recherche 30 / min |
| Erreurs | Message générique côté client + code ; détail et identifiant de requête dans les logs uniquement |

## 6. Webhooks et paiements

Voir [PAYMENT_AND_DELIVERY.md § 3](../architecture/PAYMENT_AND_DELIVERY.md#3-cycle-de-vie-dun-paiement). Points clés : signature HMAC vérifiée avant toute lecture du JSON, dédoublonnage, montant comparé à la base, paiement jamais confirmé par une redirection, tâche de réconciliation, alertes sur les écarts.

## 7. En-têtes HTTP (définis dans `next.config`)

`Content-Security-Policy` (nonce, `default-src 'self'`, `img-src` limité au domaine du stockage Neon, `connect-src` minimal, `frame-ancestors 'none'`), `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (caméra, micro, géolocalisation désactivés). La CSP s'élargit seulement après accord (pixels publicitaires).

## 8. Secrets

- Variables d'environnement Hostinger (jamais dans Git) : `DATABASE_URL` (poolée, rôle applicatif), `DATABASE_URL_MIGRATIONS` (hors serveur de production), `NEON_AUTH_*`, `KPAY_API_KEY`, `KPAY_SECRET_KEY`, `KPAY_WEBHOOK_SECRET`, `KPAY_GATEWAY_SECRET`, `S3_*` (Neon Object Storage), `CRON_SECRET`, `APP_URL`.
- `lib/env.ts` valide la présence et le format au démarrage (échec immédiat si un secret manque).
- Clés de test (`kpay_test_`) et de production (`kpay_live_`) séparées par environnement ; contrôle au démarrage qu'aucune clé `live` n'est chargée hors production.
- Rotation : en cas de départ d'un administrateur ou de suspicion de fuite (procédure dans le runbook, EP-090).

## 9. Données personnelles (Cameroun)

- **Loi n° 2024/017 du 23 décembre 2024** relative à la protection des données à caractère personnel : autorité de contrôle (APDP), consentement préalable au traitement. Entrée en vigueur annoncée au **23 juin 2026** après un moratoire de 18 mois, selon des commentaires juridiques. **Texte officiel à faire vérifier par un juriste** (question Q-J1).
- Lois n° 2010/012 (cybersécurité et cybercriminalité) et n° 2010/021 (commerce électronique) : obligations d'information du vendeur et de sécurisation. **À vérifier par un juriste.**
- Mesures prévues : collecte minimale (email facultatif), consentement marketing séparé et décoché (`marketing_consents`), politique de confidentialité, durées de conservation (DATABASE_DESIGN § 8), anonymisation sur demande, journaux sans données en clair, IP hachées, pixels publicitaires seulement après consentement et sans données personnelles brutes (hachage selon les exigences de chaque plateforme).

## 10. Sauvegardes et reprise

- Neon : restauration à un instant donné (historique : 6 h en Free, jusqu'à 7 jours en Launch) et instantanés manuels avant chaque migration à risque.
- Export logique hebdomadaire (`pg_dump` chiffré) vers un stockage distinct (option à valider, ADR-008), pour ne pas dépendre d'un seul fournisseur.
- Objectifs proposés : **RPO ≤ 1 h** (perte de données maximale), **RTO ≤ 4 h** (remise en service), cohérents avec un petit budget.
- Test de restauration trimestriel sur une branche.

## 11. Journalisation et détection

`audit_log` (actions sensibles), `webhook_rejections`, `app_errors`, logs JSON. Alertes (email ou WhatsApp de l'administrateur, V1 simple) : 10 échecs de connexion en 1 h, écart de montant de paiement, tâche en statut `dead`, `/api/health` en échec.

## 12. Contrôles avant mise en production

`npm audit` (aucune vulnérabilité critique ou élevée), recherche de secrets dans le dépôt, tests d'autorisation, test du webhook falsifié, test d'upload malveillant, scan des en-têtes, revue de la CSP, revue des règles de `robots.txt` et de l'exclusion de l'admin. Tout problème critique ou élevé bloque la mise en ligne.

## 13. Risques résiduels acceptés (à confirmer)

| Risque | Raison | Atténuation |
|---|---|---|
| Pas de WAF ni de protection DDoS dédiée (Cloudflare écarté) | Décision du propriétaire | Limitation de débit applicative, surveillance, plan de bascule documenté |
| Pas de MFA admin au lancement | Limite actuelle de Neon Auth | Mesures compensatoires (§ 3) |
| Fraude COD (fausses commandes) | Propre au paiement à la livraison | Confirmation téléphonique, détection de doublons, limitation par téléphone |

# Sécurité (s'applique à tout le code)

Référence : docs/security/SECURITY_ARCHITECTURE.md.

- Chaque Server Action et chaque route `/admin` ou `/api` (hors webhooks publics signés et `/api/health`) appelle `requirePermission(<code>)`, qui vérifie la session Neon Auth, `staff_members.is_active` et la permission. **Cacher un bouton ne protège rien.**
- Contrôle d'accès à l'objet (IDOR) : une ressource client (commande, suivi) n'est lue qu'avec son jeton signé ou le couple numéro + téléphone, jamais avec un simple identifiant.
- Toute entrée externe (formulaire, query string, en-têtes, webhook, CSV) est validée par un schéma Zod `strict()` avant usage. Rejeter, ne pas « nettoyer en silence ».
- Requêtes SQL : uniquement paramétré via `src/lib/db.ts`. **Interdit** : concaténer une entrée dans du SQL (`sql.raw` avec une donnée utilisateur).
- HTML : pas de `dangerouslySetInnerHTML`, sauf pour un Markdown rendu côté serveur **et** assaini par une liste blanche.
- Webhook KPay : lire le corps brut, HMAC-SHA256 avec `KPAY_WEBHOOK_SECRET`, comparaison en temps constant (`crypto.timingSafeEqual`), dédoublonnage avant tout effet. La redirection du navigateur ne confirme jamais un paiement.
- Montants, prix, frais, remises et stock sont toujours recalculés côté serveur.
- Secrets : lus via `lib/env.ts` (validé par Zod au démarrage), jamais logués, jamais en `NEXT_PUBLIC_*`, jamais commités. `.env*` sauf `.env.example` sont ignorés par Git.
- Fichiers importés : type vérifié par signature binaire (pas par l'extension), 10 Mo maximum, images ré-encodées (sharp) et EXIF retirées, noms générés côté serveur.
- Limitation de débit sur : connexion admin, checkout, suivi de commande, recherche, upload.
- Logs : jamais de mot de passe, jeton, numéro complet ou payload de paiement brut ; hacher les IP.
- Toute action sensible (prix, stock, statut, remboursement, rôle, paramètre) écrit dans `audit_log`.
- Dépendances : `npm audit` en CI ; une vulnérabilité critique ou élevée bloque la mise en production.

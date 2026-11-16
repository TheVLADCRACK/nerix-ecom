-- KPay remplace SasPay pour les nouveaux paiements (les anciennes lignes 'saspay' restent pour l'historique).
ALTER TABLE ecom.payments ALTER COLUMN provider SET DEFAULT 'kpay';

-- Produit : « épuisé quand le stock est à zéro » (activé par défaut). Désactivé, le produit reste commandable sans stock.
ALTER TABLE ecom.products ADD COLUMN IF NOT EXISTS sold_out_when_empty boolean NOT NULL DEFAULT true;

-- Campagnes : chaque ajout de budget est daté ; la publicité compte le jour où le budget est engagé (début, puis chaque ajout).
ALTER TABLE ecom.campaigns ADD COLUMN IF NOT EXISTS budget_adds jsonb NOT NULL DEFAULT '[]';

-- SasPay remplace KPay : transaction vérifiée, montant débité au client (frais SasPay inclus) et net reçu.
ALTER TABLE ecom.payments ALTER COLUMN provider SET DEFAULT 'saspay';
ALTER TABLE ecom.payments ADD COLUMN IF NOT EXISTS transaction_id text, ADD COLUMN IF NOT EXISTS charged int, ADD COLUMN IF NOT EXISTS net int;
CREATE INDEX IF NOT EXISTS payments_pending ON ecom.payments (provider, status, created_at DESC);

-- Commande archivée (tests, doublons) : visible en grisé, exclue des statistiques, du stock et de la comptabilité.
ALTER TABLE ecom.orders ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Visites des boutiques (visiteur = empreinte anonyme hachée, jamais l'IP) : trafic, visiteurs en ligne, conversion, campagnes.
CREATE TABLE IF NOT EXISTS ecom.visits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES ecom.stores ON DELETE CASCADE,
  visitor text NOT NULL,
  path text NOT NULL DEFAULT '/',
  channel text NOT NULL DEFAULT '',
  campaign text NOT NULL DEFAULT '',
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visits_store_at ON ecom.visits (store_id, at DESC);
ALTER TABLE ecom.lots ALTER COLUMN unit_price TYPE numeric(14, 4); -- prix unitaire = total ÷ quantité, sans perte d'arrondi

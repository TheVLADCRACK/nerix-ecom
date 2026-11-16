-- Double clic ou réseau lent : la même commande envoyée deux fois n'est créée qu'une fois.
ALTER TABLE ecom.orders ADD COLUMN idempotency_key uuid;
CREATE UNIQUE INDEX orders_idempotency ON ecom.orders (store_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
-- Inscriptions WhatsApp aux nouveautés (consentement explicite, désinscription possible).
CREATE TABLE ecom.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES ecom.stores ON DELETE CASCADE,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  UNIQUE (store_id, phone)
);

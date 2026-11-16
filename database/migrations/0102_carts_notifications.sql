-- Paniers abandonnés : saisie du formulaire de commande enregistrée avant validation (clé = clé d'idempotence de la commande).
CREATE TABLE ecom.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES ecom.stores ON DELETE CASCADE,
  key uuid NOT NULL,
  customer jsonb NOT NULL DEFAULT '{}',
  city text NOT NULL DEFAULT '',
  lines jsonb NOT NULL DEFAULT '[]',
  total int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ordered', 'contacted')),
  order_number text,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, key)
);
CREATE INDEX ON ecom.carts (store_id, status, updated_at DESC);

-- Notifications de l'outil : commandes, paiements, annulations, paniers abandonnés, stock faible, messages.
CREATE TABLE ecom.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES ecom.stores ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('order', 'payment', 'cancel', 'cart', 'stock', 'message')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  dedupe text, -- évite deux fois la même alerte (ex. stock:SKU:2)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, dedupe)
);
CREATE INDEX ON ecom.notifications (id DESC);

-- Dernière notification lue, par membre de l'équipe.
CREATE TABLE ecom.notification_reads (
  staff_id uuid PRIMARY KEY REFERENCES ecom.staff ON DELETE CASCADE,
  last_id bigint NOT NULL DEFAULT 0
);

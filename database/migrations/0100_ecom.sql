-- Nerix Ecom : schéma multi-boutiques. Toute donnée métier porte store_id ; toute requête filtre par boutique.
-- Montants en FCFA entiers (XAF sans décimale), sauf coûts d'achat (numeric : coût de revient à la décimale).
CREATE SCHEMA IF NOT EXISTS ecom;
SET search_path = ecom;

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  logo text NOT NULL DEFAULT '',
  favicon text NOT NULL DEFAULT '',
  hero_image text,
  theme jsonb NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]',
  contact jsonb NOT NULL DEFAULT '{}',
  social jsonb NOT NULL DEFAULT '{}',
  tracking jsonb NOT NULL DEFAULT '{"metaPixelIds":[],"tiktokPixelId":"","ga4Id":"","googleAdsId":"","gtmId":""}',
  settings jsonb NOT NULL DEFAULT '{}', -- eurRate, taxRate, lowStock, listes de référence
  currency text NOT NULL DEFAULT 'XAF',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Équipe de la plateforme (un seul rôle pour l'instant : admin, accès à toutes les boutiques).
CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE, -- neon_auth.user.id
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  slug text NOT NULL,
  path text NOT NULL,
  parent_path text,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  UNIQUE (store_id, path)
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  category_path text NOT NULL,
  brand text,
  short text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '',
  specs jsonb NOT NULL DEFAULT '[]',
  body jsonb NOT NULL DEFAULT '[]',
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products ON DELETE CASCADE,
  src text NOT NULL,
  src_set text NOT NULL DEFAULT '',
  alt text NOT NULL DEFAULT '',
  width int NOT NULL,
  height int NOT NULL,
  kind text NOT NULL DEFAULT 'photo' CHECK (kind IN ('photo', 'creative')),
  position int NOT NULL DEFAULT 0
);
CREATE INDEX ON product_images (product_id, position);

CREATE TABLE variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products ON DELETE CASCADE,
  sku text NOT NULL,
  title text NOT NULL,
  price int NOT NULL CHECK (price >= 0),
  compare_at int CHECK (compare_at IS NULL OR compare_at > price),
  position int NOT NULL DEFAULT 0,
  UNIQUE (store_id, sku)
);

-- Achats (lots) : coût de revient = (quantité × prix + frais) / quantité, figé par lot. Stock = achats − livrées − pertes.
CREATE TABLE lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  ref text, -- identifiant du classeur (PRD-001)
  product text NOT NULL,
  skus text[] NOT NULL DEFAULT '{}',
  supplier text NOT NULL DEFAULT '',
  purchased_on date NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  fees jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON lots (store_id, product);

CREATE TABLE cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  name text NOT NULL,
  fee int NOT NULL DEFAULT 0 CHECK (fee >= 0),
  eta_min int NOT NULL,
  eta_max int NOT NULL,
  neighborhoods text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  UNIQUE (store_id, name)
);

CREATE TABLE order_counters (store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE, year int NOT NULL, last int NOT NULL DEFAULT 0, PRIMARY KEY (store_id, year));

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  number text NOT NULL,
  placed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'processing', 'packed', 'completed', 'cancelled', 'returned')),
  payment_status text NOT NULL CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'partially_refunded', 'refunded')),
  fulfillment_status text NOT NULL CHECK (fulfillment_status IN ('unfulfilled', 'in_delivery', 'delivered', 'failed', 'returned')),
  payment_method text NOT NULL CHECK (payment_method IN ('cod', 'mobile_money', 'card')),
  customer jsonb NOT NULL, -- firstName, lastName, phone (E.164), whatsapp, email
  city text NOT NULL,
  neighborhood text NOT NULL DEFAULT '',
  landmark text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  subtotal int NOT NULL CHECK (subtotal >= 0),
  shipping int NOT NULL DEFAULT 0 CHECK (shipping >= 0),
  discount int NOT NULL DEFAULT 0 CHECK (discount >= 0),
  payment_fee int NOT NULL DEFAULT 0 CHECK (payment_fee >= 0),
  total int NOT NULL CHECK (total >= 0),
  courier text,
  courier_fee int CHECK (courier_fee IS NULL OR courier_fee >= 0),
  delivered_at timestamptz,
  settled boolean NOT NULL DEFAULT false,
  cancel_reason text,
  source jsonb,
  access_hash text, -- empreinte du jeton de la page de confirmation (jamais le jeton lui-même)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, number)
);
CREATE INDEX ON orders (store_id, placed_at DESC);
CREATE INDEX ON orders (store_id, status);
CREATE INDEX ON orders (store_id, ((customer ->> 'phone')));

CREATE TABLE order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  variant text NOT NULL DEFAULT '',
  unit_price int NOT NULL CHECK (unit_price >= 0),
  quantity int NOT NULL CHECK (quantity >= 0),
  position int NOT NULL DEFAULT 0
);
CREATE INDEX ON order_lines (order_id);
CREATE INDEX ON order_lines (store_id, sku);

CREATE TABLE order_events (
  id bigserial PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  label text NOT NULL,
  actor text NOT NULL DEFAULT 'Système'
);
CREATE INDEX ON order_events (order_id, at);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'kpay',
  method text NOT NULL CHECK (method IN ('mobile_money', 'card')),
  operator text,
  external_id text NOT NULL UNIQUE,
  provider_payment_id text UNIQUE,
  reference text,
  amount int NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  gateway_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON payments (order_id);

-- Webhooks reçus : dédoublonnage avant tout effet.
CREATE TABLE payment_events (
  id bigserial PRIMARY KEY,
  provider text NOT NULL,
  payment_id text NOT NULL,
  external_id text,
  event text NOT NULL,
  status text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, payment_id, event)
);

CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  ref text,
  code text NOT NULL DEFAULT '',
  platform text NOT NULL,
  name text NOT NULL DEFAULT '',
  products text NOT NULL DEFAULT '',
  cities text NOT NULL DEFAULT '',
  start_on date NOT NULL,
  end_on date CHECK (end_on IS NULL OR end_on >= start_on),
  spend numeric(12, 2) NOT NULL CHECK (spend >= 0),
  currency text NOT NULL CHECK (currency IN ('XAF', 'EUR')),
  rate numeric(10, 4) NOT NULL DEFAULT 1,
  orders int NOT NULL DEFAULT 0,
  delivered int NOT NULL DEFAULT 0,
  revenue int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON campaigns (store_id, code) WHERE code <> '';

CREATE TABLE charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  ref text,
  spent_on date NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT '',
  included_in_cost boolean NOT NULL DEFAULT false,
  monthly boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON charges (store_id, spent_on);

CREATE TABLE losses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  ref text,
  lost_on date NOT NULL,
  product text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON messages (store_id, created_at DESC);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  product_slug text NOT NULL,
  name text NOT NULL,
  city text NOT NULL DEFAULT '',
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text NOT NULL,
  photo text,
  source text NOT NULL,
  consent boolean NOT NULL CHECK (consent), -- jamais d'avis publié sans accord du client
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  body_md text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]',
  product_slugs text[] NOT NULL DEFAULT '{}',
  minutes int NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL,
  UNIQUE (store_id, slug)
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  store_id uuid REFERENCES stores ON DELETE CASCADE,
  actor_id uuid REFERENCES staff,
  actor_name text NOT NULL,
  action text NOT NULL,
  target text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}',
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_log (store_id, at DESC);

-- Limitation de débit (fenêtre fixe) : checkout, contact, suivi, connexion.
CREATE TABLE rate_limits (key text PRIMARY KEY, window_start timestamptz NOT NULL, count int NOT NULL);

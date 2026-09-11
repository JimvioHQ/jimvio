-- Jimvio Commerce OS — native storefront platform
-- Additive only. Does not replace Marketplace, Dropshipping OS, or merchant_stores.

-- Theme registry (platform-owned templates merchants can apply)
CREATE TABLE IF NOT EXISTS public.jimvio_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('modern', 'minimal', 'fashion', 'electronics', 'beauty', 'creator', 'general')),
  preview_image text,
  default_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Native Jimvio stores (PRIMARY commerce surface — not Shopify connectors)
CREATE TABLE IF NOT EXISTS public.jimvio_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  handle text NOT NULL,
  description text,
  logo_url text,
  favicon_url text,
  industry text,
  default_currency text NOT NULL DEFAULT 'USD',
  default_country text NOT NULL DEFAULT 'US',
  contact_email text,
  contact_phone text,
  business_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'paused', 'archived')),
  theme_id uuid REFERENCES public.jimvio_themes(id) ON DELETE SET NULL,
  theme_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_theme_at timestamptz,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  policies jsonb NOT NULL DEFAULT '{}'::jsonb,
  announcement_bar text,
  primary_domain text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jimvio_stores_handle_format CHECK (handle ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT jimvio_stores_handle_len CHECK (char_length(handle) BETWEEN 2 AND 48)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jimvio_stores_handle ON public.jimvio_stores(handle);
CREATE INDEX IF NOT EXISTS idx_jimvio_stores_vendor ON public.jimvio_stores(vendor_id, status);

-- Custom / Jimvio subdomain connections
CREATE TABLE IF NOT EXISTS public.jimvio_store_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  hostname text NOT NULL,
  kind text NOT NULL DEFAULT 'jimvio_subdomain'
    CHECK (kind IN ('jimvio_subdomain', 'custom')),
  is_primary boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'failed', 'removed')),
  ssl_status text NOT NULL DEFAULT 'pending'
    CHECK (ssl_status IN ('pending', 'active', 'failed', 'unknown')),
  dns_instructions jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hostname)
);

CREATE INDEX IF NOT EXISTS idx_jimvio_store_domains_store ON public.jimvio_store_domains(store_id);

-- Products published to a Jimvio store (reuse products table)
CREATE TABLE IF NOT EXISTS public.jimvio_store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  sort_order integer NOT NULL DEFAULT 0,
  store_seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_jimvio_store_products_store ON public.jimvio_store_products(store_id, status);
CREATE INDEX IF NOT EXISTS idx_jimvio_store_products_product ON public.jimvio_store_products(product_id);

-- Store collections (separate from marketplace_collections)
CREATE TABLE IF NOT EXISTS public.jimvio_store_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title text NOT NULL,
  handle text NOT NULL,
  description text,
  image_url text,
  collection_type text NOT NULL DEFAULT 'manual'
    CHECK (collection_type IN ('manual', 'automatic')),
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, handle)
);

CREATE TABLE IF NOT EXISTS public.jimvio_store_collection_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.jimvio_store_collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, product_id)
);

-- Store pages (About, Policies, etc.)
CREATE TABLE IF NOT EXISTS public.jimvio_store_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title text NOT NULL,
  handle text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, handle)
);

-- Navigation
CREATE TABLE IF NOT EXISTS public.jimvio_store_navigation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  location text NOT NULL DEFAULT 'header'
    CHECK (location IN ('header', 'footer', 'mobile')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, location)
);

-- Store-scoped discounts (extends promo concept without mutating platform promo_codes)
CREATE TABLE IF NOT EXISTS public.jimvio_store_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  code text,
  title text NOT NULL,
  discount_type text NOT NULL
    CHECK (discount_type IN ('percent', 'fixed', 'free_shipping')),
  value numeric(14,4) NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'order'
    CHECK (applies_to IN ('order', 'products', 'collections', 'shipping')),
  product_ids uuid[] NOT NULL DEFAULT '{}',
  collection_ids uuid[] NOT NULL DEFAULT '{}',
  min_order_amount numeric(14,2),
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_automatic boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jimvio_store_discounts_code
  ON public.jimvio_store_discounts(store_id, lower(code))
  WHERE code IS NOT NULL AND is_active = true;

-- Shipping zones / rates
CREATE TABLE IF NOT EXISTS public.jimvio_shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  countries text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jimvio_shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.jimvio_shipping_zones(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate_type text NOT NULL DEFAULT 'flat'
    CHECK (rate_type IN ('flat', 'free', 'weight', 'price', 'supplier')),
  price numeric(14,2) NOT NULL DEFAULT 0,
  min_order_amount numeric(14,2),
  max_order_amount numeric(14,2),
  min_weight numeric(14,4),
  max_weight numeric(14,4),
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tax rules (configurable infrastructure — not legal compliance)
CREATE TABLE IF NOT EXISTS public.jimvio_tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  country_code text,
  region text,
  rate_percent numeric(8,4) NOT NULL DEFAULT 0,
  inclusive boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Staff / team
CREATE TABLE IF NOT EXISTS public.jimvio_store_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'support'
    CHECK (role IN ('owner', 'admin', 'manager', 'support', 'fulfillment', 'marketing', 'analyst')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);

-- Abandoned carts (architecture + tracking; marketing gated by consent)
CREATE TABLE IF NOT EXISTS public.jimvio_abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  customer_email text,
  customer_user_id uuid,
  cart_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  recovered boolean NOT NULL DEFAULT false,
  recovered_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  consent_marketing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jimvio_abandoned_carts_store
  ON public.jimvio_abandoned_carts(store_id, recovered, updated_at DESC);

-- Extend orders for native store channel
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS jimvio_store_id uuid REFERENCES public.jimvio_stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_jimvio_store
  ON public.orders(jimvio_store_id, created_at DESC)
  WHERE jimvio_store_id IS NOT NULL;

-- Expand order_channel to include jimvio_store (drop + recreate check if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_channel_check'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_order_channel_check;
  END IF;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_order_channel_check
    CHECK (
      order_channel IS NULL OR order_channel IN (
        'marketplace', 'shopify', 'woocommerce', 'custom', 'api', 'jimvio_store'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed starter themes
INSERT INTO public.jimvio_themes (code, name, description, category, default_settings, templates)
VALUES
(
  'modern',
  'Modern',
  'Clean commerce layout with bold product grids.',
  'modern',
  '{"primaryColor":"#FF5A1F","backgroundColor":"#F8FAFC","textColor":"#111827","fontFamily":"DM Sans","radius":"12px"}'::jsonb,
  '{"home":["announcement","header","hero","featured_products","collections","footer"],"product":["header","product_detail","footer"],"collection":["header","collection_grid","footer"],"cart":["header","cart","footer"]}'::jsonb
),
(
  'minimal',
  'Minimal',
  'Whitespace-first storefront for premium brands.',
  'minimal',
  '{"primaryColor":"#111827","backgroundColor":"#FFFFFF","textColor":"#111827","fontFamily":"DM Sans","radius":"4px"}'::jsonb,
  '{"home":["header","hero","featured_products","footer"],"product":["header","product_detail","footer"],"collection":["header","collection_grid","footer"],"cart":["header","cart","footer"]}'::jsonb
),
(
  'creator',
  'Creator',
  'Built for creator-led product storytelling.',
  'creator',
  '{"primaryColor":"#FF5A1F","backgroundColor":"#FFF7F3","textColor":"#111827","fontFamily":"DM Sans","radius":"16px"}'::jsonb,
  '{"home":["announcement","header","hero","featured_products","testimonials","footer"],"product":["header","product_detail","footer"],"collection":["header","collection_grid","footer"],"cart":["header","cart","footer"]}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

-- RLS
ALTER TABLE public.jimvio_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_store_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_store_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_store_collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_store_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_store_navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_store_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_store_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_abandoned_carts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY jimvio_themes_public_read ON public.jimvio_themes
    FOR SELECT TO anon, authenticated USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_stores_owner_all ON public.jimvio_stores FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_stores_public_read ON public.jimvio_stores
    FOR SELECT TO anon, authenticated USING (status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_domains_owner ON public.jimvio_store_domains FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_products_owner ON public.jimvio_store_products FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_products_public ON public.jimvio_store_products
    FOR SELECT TO anon, authenticated
    USING (
      status = 'published'
      AND store_id IN (SELECT id FROM public.jimvio_stores WHERE status = 'published')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_collections_owner ON public.jimvio_store_collections FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_collections_public ON public.jimvio_store_collections
    FOR SELECT TO anon, authenticated
    USING (published = true AND store_id IN (SELECT id FROM public.jimvio_stores WHERE status = 'published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_collection_products_public ON public.jimvio_store_collection_products
    FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_collection_products_owner ON public.jimvio_store_collection_products FOR ALL TO authenticated
    USING (collection_id IN (
      SELECT id FROM public.jimvio_store_collections
      WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    ))
    WITH CHECK (collection_id IN (
      SELECT id FROM public.jimvio_store_collections
      WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_pages_owner ON public.jimvio_store_pages FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_pages_public ON public.jimvio_store_pages
    FOR SELECT TO anon, authenticated
    USING (published = true AND store_id IN (SELECT id FROM public.jimvio_stores WHERE status = 'published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_navigation_owner ON public.jimvio_store_navigation FOR ALL TO authenticated
    USING (store_id IN (SELECT id FROM public.jimvio_stores WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())))
    WITH CHECK (store_id IN (SELECT id FROM public.jimvio_stores WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_navigation_public ON public.jimvio_store_navigation
    FOR SELECT TO anon, authenticated
    USING (store_id IN (SELECT id FROM public.jimvio_stores WHERE status = 'published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_discounts_owner ON public.jimvio_store_discounts FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_shipping_zones_owner ON public.jimvio_shipping_zones FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_shipping_rates_owner ON public.jimvio_shipping_rates FOR ALL TO authenticated
    USING (zone_id IN (
      SELECT id FROM public.jimvio_shipping_zones
      WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    ))
    WITH CHECK (zone_id IN (
      SELECT id FROM public.jimvio_shipping_zones
      WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_tax_rules_owner ON public.jimvio_tax_rules FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_store_staff_owner ON public.jimvio_store_staff FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY jimvio_abandoned_carts_owner ON public.jimvio_abandoned_carts FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.jimvio_stores IS 'Jimvio Commerce OS native merchant stores (not external connectors)';
COMMENT ON TABLE public.jimvio_themes IS 'Theme registry for native Jimvio storefronts';

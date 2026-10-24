-- Jimvio Dropshipping OS
-- Extends existing commerce (products, variants, orders, vendors, CJ, Shopify)
-- without replacing working Marketplace / checkout / CJ fulfillment.

CREATE TABLE IF NOT EXISTS public.merchant_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('shopify', 'woocommerce', 'custom')),
  name text NOT NULL,
  domain text,
  external_store_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'connected', 'disconnected', 'error', 'expired')),
  scopes text[] NOT NULL DEFAULT '{}',
  sync_preferences jsonb NOT NULL DEFAULT '{"inventory": true, "price": true, "images": true, "description": true, "title": false, "seo": false}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_stores_vendor ON public.merchant_stores(vendor_id);
CREATE INDEX IF NOT EXISTS idx_merchant_stores_platform ON public.merchant_stores(platform, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_stores_vendor_platform_domain
  ON public.merchant_stores(vendor_id, platform, domain)
  WHERE domain IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.merchant_store_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.merchant_stores(id) ON DELETE CASCADE,
  access_token_encrypted text,
  refresh_token_encrypted text,
  api_key_encrypted text,
  api_secret_encrypted text,
  webhook_secret_encrypted text,
  api_version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.merchant_stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  store_product_id text,
  store_variant_id text,
  store_sku text,
  supplier_code text NOT NULL DEFAULT 'cj'
    CHECK (supplier_code IN ('cj', 'vendor', 'shopify', 'zendrop', 'spocket', 'alibaba', 'private', 'other')),
  supplier_product_id text,
  supplier_variant_id text,
  connection_status text NOT NULL DEFAULT 'pending'
    CHECK (connection_status IN (
      'connected', 'pending', 'syncing', 'sync_error', 'disconnected', 'out_of_stock'
    )),
  field_ownership jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  safety_stock integer NOT NULL DEFAULT 0 CHECK (safety_stock >= 0),
  last_inventory_sync_at timestamptz,
  last_price_sync_at timestamptz,
  last_product_sync_at timestamptz,
  last_error text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_store_product_links_vendor ON public.store_product_links(vendor_id);
CREATE INDEX IF NOT EXISTS idx_store_product_links_store ON public.store_product_links(store_id);
CREATE INDEX IF NOT EXISTS idx_store_product_links_product ON public.store_product_links(product_id);
CREATE INDEX IF NOT EXISTS idx_store_product_links_store_product
  ON public.store_product_links(store_id, store_product_id)
  WHERE store_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_product_links_supplier
  ON public.store_product_links(supplier_code, supplier_variant_id)
  WHERE supplier_variant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ds_price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.merchant_stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  markup_type text NOT NULL DEFAULT 'percent'
    CHECK (markup_type IN ('percent', 'fixed')),
  markup_value numeric(14,4) NOT NULL DEFAULT 40,
  min_profit numeric(14,2),
  max_price numeric(14,2),
  rounding_rule text NOT NULL DEFAULT 'none'
    CHECK (rounding_rule IN ('none', 'nearest_0_99', 'nearest_integer', 'ceil_integer')),
  currency text NOT NULL DEFAULT 'USD',
  include_shipping boolean NOT NULL DEFAULT false,
  jimvio_margin_percent numeric(8,4) NOT NULL DEFAULT 0,
  auto_sync boolean NOT NULL DEFAULT true,
  require_approval boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ds_price_rules_vendor ON public.ds_price_rules(vendor_id, is_active, priority);

CREATE TABLE IF NOT EXISTS public.ds_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.merchant_stores(id) ON DELETE SET NULL,
  supplier_code text,
  job_type text NOT NULL CHECK (job_type IN (
    'PRODUCT_IMPORT', 'PRODUCT_UPDATE', 'INVENTORY_SYNC', 'PRICE_SYNC',
    'ORDER_SYNC', 'FULFILLMENT_SYNC', 'TRACKING_SYNC', 'CONNECTION_TEST'
  )),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'success', 'partial', 'failed', 'cancelled')),
  idempotency_key text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ds_sync_jobs_idempotency
  ON public.ds_sync_jobs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ds_sync_jobs_active_dedupe
  ON public.ds_sync_jobs(vendor_id, store_id, job_type)
  WHERE status IN ('pending', 'running') AND store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ds_sync_jobs_status ON public.ds_sync_jobs(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_ds_sync_jobs_vendor ON public.ds_sync_jobs(vendor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ds_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ds_sync_jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed', 'cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  items_processed integer NOT NULL DEFAULT 0,
  items_succeeded integer NOT NULL DEFAULT 0,
  items_failed integer NOT NULL DEFAULT 0,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ds_sync_runs_job ON public.ds_sync_runs(job_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.ds_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute integer NOT NULL DEFAULT 120,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ds_api_keys_vendor ON public.ds_api_keys(vendor_id)
  WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ds_api_keys_prefix ON public.ds_api_keys(key_prefix);

CREATE TABLE IF NOT EXISTS public.ds_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  scope text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text,
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  UNIQUE (scope, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ds_idempotency_expires ON public.ds_idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS public.ds_integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.merchant_stores(id) ON DELETE SET NULL,
  supplier_code text,
  operation text NOT NULL,
  request_id text,
  job_id uuid,
  external_id text,
  duration_ms integer,
  status text NOT NULL CHECK (status IN ('success', 'error', 'skipped', 'retry')),
  error_code text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ds_integration_logs_vendor
  ON public.ds_integration_logs(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ds_integration_logs_op
  ON public.ds_integration_logs(operation, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ds_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.merchant_stores(id) ON DELETE SET NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN (
      'requested', 'merchant_review', 'jimvio_review', 'supplier_review',
      'approved', 'rejected', 'received', 'refunded', 'closed'
    )),
  reason text,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ds_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.ds_returns(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ds_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  return_id uuid REFERENCES public.ds_returns(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  subject text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ds_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL UNIQUE REFERENCES public.vendors(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'business', 'enterprise')),
  max_stores integer NOT NULL DEFAULT 1,
  max_products integer NOT NULL DEFAULT 50,
  max_orders_per_month integer NOT NULL DEFAULT 100,
  max_api_calls_per_day integer NOT NULL DEFAULT 1000,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS merchant_store_id uuid REFERENCES public.merchant_stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_order_id text,
  ADD COLUMN IF NOT EXISTS order_channel text DEFAULT 'marketplace',
  ADD COLUMN IF NOT EXISTS source_payload jsonb,
  ADD COLUMN IF NOT EXISTS fulfillment_status_normalized text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_channel_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_channel_check
      CHECK (order_channel IS NULL OR order_channel IN (
        'marketplace', 'shopify', 'woocommerce', 'custom', 'api'
      ));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_store_external
  ON public.orders(merchant_store_id, external_order_id)
  WHERE merchant_store_id IS NOT NULL AND external_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_merchant_store
  ON public.orders(merchant_store_id, created_at DESC)
  WHERE merchant_store_id IS NOT NULL;

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dead_letter boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS merchant_store_id uuid REFERENCES public.merchant_stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_dead_letter
  ON public.webhook_events(dead_letter, created_at DESC)
  WHERE dead_letter = true;

ALTER TABLE public.shopify_credentials
  ADD COLUMN IF NOT EXISTS merchant_store_id uuid REFERENCES public.merchant_stores(id) ON DELETE SET NULL;

ALTER TABLE public.merchant_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_store_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_product_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_entitlements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY merchant_stores_select_own ON public.merchant_stores
    FOR SELECT TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY merchant_stores_insert_own ON public.merchant_stores
    FOR INSERT TO authenticated
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY merchant_stores_update_own ON public.merchant_stores
    FOR UPDATE TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY merchant_stores_delete_own ON public.merchant_stores
    FOR DELETE TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY store_product_links_select_own ON public.store_product_links
    FOR SELECT TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY store_product_links_mutate_own ON public.store_product_links
    FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY ds_price_rules_own ON public.ds_price_rules
    FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY ds_sync_jobs_select_own ON public.ds_sync_jobs
    FOR SELECT TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY ds_sync_runs_select_own ON public.ds_sync_runs
    FOR SELECT TO authenticated
    USING (job_id IN (
      SELECT id FROM public.ds_sync_jobs
      WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY ds_api_keys_select_own ON public.ds_api_keys
    FOR SELECT TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY ds_integration_logs_select_own ON public.ds_integration_logs
    FOR SELECT TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY ds_returns_own ON public.ds_returns
    FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY ds_return_items_own ON public.ds_return_items
    FOR ALL TO authenticated
    USING (return_id IN (
      SELECT id FROM public.ds_returns
      WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    ))
    WITH CHECK (return_id IN (
      SELECT id FROM public.ds_returns
      WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY ds_disputes_own ON public.ds_disputes
    FOR ALL TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
    WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY ds_entitlements_select_own ON public.ds_entitlements
    FOR SELECT TO authenticated
    USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.merchant_stores IS 'Dropshipping OS: merchant external store connections';
COMMENT ON TABLE public.store_product_links IS 'Maps Jimvio products/variants to merchant store + supplier IDs';
COMMENT ON TABLE public.ds_sync_jobs IS 'Durable sync job queue for inventory/price/order/fulfillment';
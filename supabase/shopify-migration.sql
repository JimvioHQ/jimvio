-- Add Shopify fields to existing orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shopify_order_id text,
  ADD COLUMN IF NOT EXISTS shopify_order_number integer,
  ADD COLUMN IF NOT EXISTS shopify_fulfillment_status text DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS shopify_order_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS integration_source text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_status text;

-- Add Shopify fields to existing order_items table
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS shopify_variant_id bigint,
  ADD COLUMN IF NOT EXISTS shopify_product_id text;

-- Add Shopify fields to existing products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shopify_product_id text,
  ADD COLUMN IF NOT EXISTS shopify_variant_id bigint,
  ADD COLUMN IF NOT EXISTS shopify_handle text,
  ADD COLUMN IF NOT EXISTS shopify_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'jimvio';

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_shopify_id
  ON public.products(shopify_product_id, vendor_id)
  WHERE shopify_product_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.shopify_credentials (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id       uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  shop_domain     text NOT NULL,
  access_token    text NOT NULL,
  api_version     text NOT NULL DEFAULT '2024-07',
  platform_commission_rate numeric NOT NULL DEFAULT 8,
  connected_at    timestamptz DEFAULT now(),
  last_synced_at  timestamptz,
  is_active       boolean DEFAULT true,
  UNIQUE(vendor_id)
);

ALTER TABLE public.shopify_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_own_shopify_credentials"
  ON public.shopify_credentials
  FOR ALL
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_shopify_creds_domain
  ON public.shopify_credentials(shop_domain);

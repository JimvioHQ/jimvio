-- One cheap RWF product on the platform Shopify vendor for live PawaPay smoke tests (20 RWF).
-- Vendor must exist: JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID=0a069302-23f8-4594-80ac-3b4d980af5a3
-- Apply in Supabase SQL editor or: supabase db push / your migration runner.

INSERT INTO public.products (
  vendor_id,
  category_id,
  name,
  slug,
  short_description,
  description,
  product_type,
  status,
  price,
  currency,
  sku,
  images,
  requires_shipping,
  track_inventory,
  inventory_quantity,
  is_digital,
  is_active,
  affiliate_enabled,
  influencer_enabled,
  published_at
) VALUES (
  '0a069302-23f8-4594-80ac-3b4d980af5a3'::uuid,
  NULL,
  'PawaPay live test — 20 RWF',
  'jimvio-pawapay-live-test-20-rwf',
  'Minimal amount for mobile money confirmation tests.',
  'Use at checkout with PawaPay (live). Approve the prompt on your phone. Safe to delete after testing.',
  'physical',
  'active',
  20,
  'RWF',
  'JIMVIO-PAWAPAY-TEST-20',
  '[]'::jsonb,
  true,
  true,
  999,
  false,
  true,
  true,
  true,
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  status = 'active',
  is_active = true,
  updated_at = NOW();

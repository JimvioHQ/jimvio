-- Multi-source marketplace: unified product lineage + per-line fulfillment routing.
-- Sources: vendor (manual), shopify (connected store), cj (dropship API — fulfillment wired in app).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'vendor';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.source_metadata IS 'Source-specific IDs and sync payload (CJ SKU, Shopify IDs mirror dedicated columns, etc.)';

-- Normalize legacy labels
UPDATE public.products
SET source = 'vendor'
WHERE source IS NULL OR lower(trim(source)) = 'jimvio';

UPDATE public.products
SET source = 'vendor'
WHERE source NOT IN ('vendor', 'shopify', 'cj');

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_source_chk;
ALTER TABLE public.products
  ADD CONSTRAINT products_source_chk
  CHECK (source IN ('vendor', 'shopify', 'cj'));

ALTER TABLE public.products ALTER COLUMN source SET DEFAULT 'vendor';

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_source TEXT NOT NULL DEFAULT 'vendor';

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.order_items oi
SET product_source = CASE
  WHEN p.source IN ('vendor', 'shopify', 'cj') THEN p.source
  ELSE 'vendor'
END
FROM public.products p
WHERE oi.product_id = p.id;

UPDATE public.order_items
SET product_source = 'vendor'
WHERE product_source IS NULL OR product_source NOT IN ('vendor', 'shopify', 'cj');

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_source_chk;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_source_chk
  CHECK (product_source IN ('vendor', 'shopify', 'cj'));

COMMENT ON COLUMN public.order_items.product_source IS 'Snapshot of products.source at checkout — drives fulfillment routing';
COMMENT ON COLUMN public.order_items.source_metadata IS 'Per-line external refs (e.g. CJ line id)';

CREATE INDEX IF NOT EXISTS idx_order_items_product_source ON public.order_items (product_source);
CREATE INDEX IF NOT EXISTS idx_products_source ON public.products (source);

INSERT INTO public.platform_settings (key, value)
VALUES (
  'supplier_sources',
  jsonb_build_object(
    'vendor', jsonb_build_object('enabled', true, 'platform_commission_percent', 5),
    'shopify', jsonb_build_object('enabled', true, 'platform_commission_percent', 8),
    'cj', jsonb_build_object('enabled', true, 'platform_commission_percent', 8)
  )
)
ON CONFLICT (key) DO NOTHING;

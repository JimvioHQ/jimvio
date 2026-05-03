-- Track whether a category came from seeded Jimvio data or from Shopify product types.
ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'jimvio';

ALTER TABLE public.product_categories
  DROP CONSTRAINT IF EXISTS product_categories_source_chk;

ALTER TABLE public.product_categories
  ADD CONSTRAINT product_categories_source_chk
  CHECK (source IN ('jimvio', 'shopify'));

COMMENT ON COLUMN public.product_categories.source IS 'jimvio = platform seed/manual; shopify = created from Shopify product_type on sync';

-- Product discount fields (safe to re-run)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_flash_deal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_label TEXT;

CREATE INDEX IF NOT EXISTS idx_products_flash_deal
  ON public.products (is_flash_deal, status)
  WHERE is_flash_deal = true;

-- ============================================================
-- MIGRATION 053: Add product_type to order_items
-- Purpose: Denormalize product_type onto order_items so ORDER
-- history is accurate even if the product is later deleted.
-- Also: add `access_granted_at` for digital fulfillment audit.
-- SAFE: additive only, no existing columns touched.
-- ============================================================

-- Add product_type to order_items (nullable, populated on insert)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'physical';

-- Add digital access columns
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS digital_download_url TEXT;

-- Note: digital_download_url already existed in the initial schema
-- This is a no-op if it already exists (ADD COLUMN IF NOT EXISTS)

-- Add access_granted_at for audit trail
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS access_granted_at TIMESTAMPTZ;

-- ── Backfill: populate product_type from products table for existing rows
UPDATE public.order_items oi
SET product_type = p.product_type
FROM public.products p
WHERE oi.product_id = p.id
  AND oi.product_type IS NULL;

-- ── Backfill: copy digital_file_url → digital_download_url for
-- digital items on completed/delivered orders (so existing buyers get access)
UPDATE public.order_items oi
SET
  digital_download_url = p.digital_file_url,
  access_granted_at    = NOW()
FROM public.products p, public.orders o
WHERE oi.product_id = p.id
  AND oi.order_id = o.id
  AND p.product_type = 'digital'
  AND p.digital_file_url IS NOT NULL
  AND oi.digital_download_url IS NULL
  AND o.payment_status = 'completed';

-- ── Index for Library page queries (buyer's digital library)
CREATE INDEX IF NOT EXISTS idx_order_items_product_type
  ON public.order_items(product_type);

DO $$
DECLARE digital_items INT;
BEGIN
  SELECT COUNT(*) INTO digital_items
  FROM public.order_items WHERE product_type = 'digital';
  RAISE NOTICE '[053] Migration complete. Digital order items: %', digital_items;
END $$;

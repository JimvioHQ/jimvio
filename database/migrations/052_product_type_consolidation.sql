-- ============================================================
-- MIGRATION 052: Product Type Consolidation
-- Goal: Enforce exactly 'digital' | 'physical' product types.
-- Strategy: SAFE — no existing rows broken, no columns dropped.
-- ============================================================

-- ── STEP 1: Remap legacy digital sub-types → 'digital'
-- Any product with product_type IN (course, software, template, ebook, subscription)
-- is treated as a digital product.
UPDATE public.products
SET product_type = 'digital'
WHERE product_type IN ('course', 'software', 'template', 'ebook', 'subscription');

-- ── STEP 2: Sync is_digital to match product_type (full table sync)
-- This makes is_digital a derived/computed field from product_type.
UPDATE public.products
SET is_digital = (product_type = 'digital');

-- ── STEP 3: Create trigger to auto-sync is_digital on every INSERT / UPDATE
-- This ensures is_digital stays consistent with product_type going forward.
CREATE OR REPLACE FUNCTION sync_is_digital_from_product_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-derive is_digital from product_type
  NEW.is_digital := (NEW.product_type = 'digital');

  -- For digital products: zero out shipping fields
  IF NEW.product_type = 'digital' THEN
    NEW.requires_shipping := FALSE;
  END IF;

  -- For physical products: ensure requires_shipping is set
  IF NEW.product_type = 'physical' THEN
    NEW.requires_shipping := COALESCE(NEW.requires_shipping, TRUE);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS trg_sync_is_digital ON public.products;

CREATE TRIGGER trg_sync_is_digital
  BEFORE INSERT OR UPDATE OF product_type ON public.products
  FOR EACH ROW EXECUTE FUNCTION sync_is_digital_from_product_type();

-- ── STEP 4: Add helpful index on product_type (if not exists)
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);

-- ── STEP 5: Log summary (informational only)
DO $$
DECLARE
  digital_count  INT;
  physical_count INT;
BEGIN
  SELECT COUNT(*) INTO digital_count  FROM public.products WHERE product_type = 'digital';
  SELECT COUNT(*) INTO physical_count FROM public.products WHERE product_type = 'physical';
  RAISE NOTICE '[052] Migration complete. Digital: %, Physical: %', digital_count, physical_count;
END $$;

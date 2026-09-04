-- Idempotent affiliate product picks: one active link per affiliate + product.
-- Deactivate older duplicates first so the unique index can be created safely.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY affiliate_id, product_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.affiliate_links
  WHERE is_active IS TRUE
    AND product_id IS NOT NULL
)
UPDATE public.affiliate_links al
SET is_active = false
FROM ranked r
WHERE al.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliate_links_active_affiliate_product
  ON public.affiliate_links (affiliate_id, product_id)
  WHERE is_active IS TRUE AND product_id IS NOT NULL;

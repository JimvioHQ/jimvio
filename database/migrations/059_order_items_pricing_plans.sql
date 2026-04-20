-- ============================================================
-- Migration 059: Add pricing plan details to order_items
-- Purpose: Support subscription/recurring billing transparency 
-- in checkout UI and order history.
-- ============================================================

-- Add pricing columns to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS billing_period TEXT;

-- Index for analytics if needed
CREATE INDEX IF NOT EXISTS idx_order_items_pricing_type ON public.order_items(pricing_type);

-- Backfill from products (where possible, for consistency)
UPDATE public.order_items oi
SET 
  pricing_type = p.pricing_type,
  billing_period = p.billing_period
FROM public.products p
WHERE oi.product_id = p.id
  AND (oi.pricing_type = 'one_time' OR oi.pricing_type IS NULL);

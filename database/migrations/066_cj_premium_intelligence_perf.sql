-- JIMVIO — MIGRATION 066
-- CJ Premium Intelligence performance indexes

CREATE INDEX IF NOT EXISTS idx_tier_health
  ON public.cj_product_intelligence(catalog_tier, health_score DESC);

CREATE INDEX IF NOT EXISTS idx_enrichment_status
  ON public.cj_product_intelligence(enrichment_status);

CREATE INDEX IF NOT EXISTS idx_orders
  ON public.cj_raw_products(orders DESC);

CREATE INDEX IF NOT EXISTS idx_stock
  ON public.cj_raw_products(stock DESC);

CREATE INDEX IF NOT EXISTS idx_raw_orders_pid
  ON public.cj_raw_products(orders DESC, pid DESC);

CREATE INDEX IF NOT EXISTS idx_intel_health_pid
  ON public.cj_product_intelligence(health_score DESC, pid DESC);

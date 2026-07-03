-- JIMVIO — MIGRATION 065
-- CJ Premium Intelligence Layer: raw catalog cache, enrichment queue, intelligence scores
-- BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Raw CJ list catalog (never query CJ list API from UI) ───────────────────

CREATE TABLE IF NOT EXISTS public.cj_raw_products (
  pid           TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  image         TEXT,
  supplier      TEXT,
  cost          NUMERIC(12, 4),
  sell_price    NUMERIC(12, 4),
  stock         INTEGER NOT NULL DEFAULT 0,
  orders        INTEGER NOT NULL DEFAULT 0,
  warehouse     TEXT,
  country_code  TEXT,
  sku           TEXT,
  raw_payload   JSONB NOT NULL DEFAULT '{}',
  list_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cj_raw_products_stock ON public.cj_raw_products(stock DESC);
CREATE INDEX IF NOT EXISTS idx_cj_raw_products_orders ON public.cj_raw_products(orders DESC);
CREATE INDEX IF NOT EXISTS idx_cj_raw_products_synced ON public.cj_raw_products(list_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_cj_raw_products_title_trgm ON public.cj_raw_products USING gin (title gin_trgm_ops);

-- ─── Intelligence scores & tier assignment ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cj_product_intelligence (
  pid                  TEXT PRIMARY KEY REFERENCES public.cj_raw_products(pid) ON DELETE CASCADE,
  enrichment_status    TEXT NOT NULL DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending', 'processing', 'complete', 'failed', 'dead_letter')),
  enrichment_attempts  INTEGER NOT NULL DEFAULT 0,
  enriched_at          TIMESTAMPTZ,
  last_error           TEXT,
  has_video            BOOLEAN NOT NULL DEFAULT false,
  video_count          INTEGER NOT NULL DEFAULT 0,
  image_count          INTEGER NOT NULL DEFAULT 0,
  description_length   INTEGER NOT NULL DEFAULT 0,
  delivery_days        INTEGER,
  rating               NUMERIC(3, 1),
  review_count         INTEGER NOT NULL DEFAULT 0,
  supplier_verified    BOOLEAN NOT NULL DEFAULT false,
  verified_warehouse   INTEGER,
  margin_percent       NUMERIC(6, 2),
  health_score         SMALLINT NOT NULL DEFAULT 0,
  confidence_score     SMALLINT NOT NULL DEFAULT 50,
  quality_scores       JSONB NOT NULL DEFAULT '{}',
  opportunity_score    SMALLINT NOT NULL DEFAULT 0,
  catalog_tier         TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (catalog_tier IN ('ELITE', 'PREMIUM', 'STANDARD', 'PENDING', 'HIDDEN')),
  trending             BOOLEAN NOT NULL DEFAULT false,
  badges               JSONB NOT NULL DEFAULT '[]',
  scored_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cj_intel_tier ON public.cj_product_intelligence(catalog_tier);
CREATE INDEX IF NOT EXISTS idx_cj_intel_health ON public.cj_product_intelligence(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_cj_intel_enrichment ON public.cj_product_intelligence(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_cj_intel_scored ON public.cj_product_intelligence(scored_at DESC NULLS LAST);

-- ─── Background enrichment queue ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cj_enrichment_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid             TEXT NOT NULL REFERENCES public.cj_raw_products(pid) ON DELETE CASCADE,
  priority        INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'complete', 'failed', 'dead_letter')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pid)
);

CREATE INDEX IF NOT EXISTS idx_cj_enrich_queue_poll
  ON public.cj_enrichment_queue(status, next_attempt_at)
  WHERE status IN ('pending', 'processing');

-- ─── Sync / job run logs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cj_catalog_sync_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type       TEXT NOT NULL
    CHECK (job_type IN ('list_sync', 'enrichment', 'stock_refresh', 'price_refresh', 'shipping_refresh', 'score_recalc')),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  total_fetched  INTEGER NOT NULL DEFAULT 0,
  total_saved    INTEGER NOT NULL DEFAULT 0,
  total_errors   INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  error_message  TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_cj_catalog_sync_runs_started
  ON public.cj_catalog_sync_runs(started_at DESC);

-- ─── updated_at triggers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cj_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cj_raw_products_updated_at ON public.cj_raw_products;
CREATE TRIGGER cj_raw_products_updated_at
  BEFORE UPDATE ON public.cj_raw_products
  FOR EACH ROW EXECUTE FUNCTION public.cj_touch_updated_at();

DROP TRIGGER IF EXISTS cj_product_intelligence_updated_at ON public.cj_product_intelligence;
CREATE TRIGGER cj_product_intelligence_updated_at
  BEFORE UPDATE ON public.cj_product_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.cj_touch_updated_at();

DROP TRIGGER IF EXISTS cj_enrichment_queue_updated_at ON public.cj_enrichment_queue;
CREATE TRIGGER cj_enrichment_queue_updated_at
  BEFORE UPDATE ON public.cj_enrichment_queue
  FOR EACH ROW EXECUTE FUNCTION public.cj_touch_updated_at();

-- ─── RLS (service role / admin only) ─────────────────────────────────────────

ALTER TABLE public.cj_raw_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cj_product_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cj_enrichment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cj_catalog_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access cj_raw_products" ON public.cj_raw_products;
CREATE POLICY "Service role full access cj_raw_products"
  ON public.cj_raw_products FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access cj_product_intelligence" ON public.cj_product_intelligence;
CREATE POLICY "Service role full access cj_product_intelligence"
  ON public.cj_product_intelligence FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access cj_enrichment_queue" ON public.cj_enrichment_queue;
CREATE POLICY "Service role full access cj_enrichment_queue"
  ON public.cj_enrichment_queue FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access cj_catalog_sync_runs" ON public.cj_catalog_sync_runs;
CREATE POLICY "Service role full access cj_catalog_sync_runs"
  ON public.cj_catalog_sync_runs FOR ALL
  USING (auth.role() = 'service_role');

-- COMMIT;

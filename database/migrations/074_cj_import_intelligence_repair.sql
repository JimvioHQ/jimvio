-- JIMVIO — MIGRATION 074
-- CJ Import Intelligence repairs: scan failures, publish tier, filter indexes
-- BEGIN;

ALTER TABLE public.cj_product_intelligence
  ADD COLUMN IF NOT EXISTS publish_tier TEXT
    CHECK (publish_tier IS NULL OR publish_tier IN ('premium', 'standard', 'draft'));

CREATE TABLE IF NOT EXISTS public.cj_scan_failures (
  pid             TEXT PRIMARY KEY,
  attempts        INTEGER NOT NULL DEFAULT 1,
  last_error      TEXT,
  next_retry_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cj_scan_failures_retry
  ON public.cj_scan_failures(next_retry_at)
  WHERE next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cj_intel_publish_tier
  ON public.cj_product_intelligence(publish_tier);

CREATE INDEX IF NOT EXISTS idx_cj_intel_auto_publish_ready_status
  ON public.cj_product_intelligence(auto_publish_ready, auto_publish_status);

CREATE INDEX IF NOT EXISTS idx_cj_intel_failures_gin
  ON public.cj_product_intelligence USING gin (auto_publish_failures);

CREATE INDEX IF NOT EXISTS idx_cj_intel_enrichment_status
  ON public.cj_product_intelligence(enrichment_status);

CREATE INDEX IF NOT EXISTS idx_cj_intel_last_scanned
  ON public.cj_product_intelligence(last_scanned_at)
  WHERE last_scanned_at IS NOT NULL;

-- COMMIT;

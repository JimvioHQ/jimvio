-- JIMVIO — MIGRATION 067
-- CJ Auto Publish Engine: readiness scoring & failure tracking
-- BEGIN;

ALTER TABLE public.cj_product_intelligence
  ADD COLUMN IF NOT EXISTS auto_publish_ready BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_publish_score SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_publish_failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_auto_publish_check TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cj_intel_auto_publish_ready
  ON public.cj_product_intelligence(auto_publish_ready)
  WHERE auto_publish_ready = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_auto_publish_score
  ON public.cj_product_intelligence(auto_publish_score DESC);

-- COMMIT;

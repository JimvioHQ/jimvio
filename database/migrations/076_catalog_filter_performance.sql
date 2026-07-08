-- 076: Catalog filter performance — SMALL partial indexes only
--
-- RUN INSTRUCTIONS (Supabase SQL Editor):
--   1. Pause crons/workers first (Disk IO recovery).
--   2. Run this entire file as ONE batch (should finish in seconds on ~25k rows).
--   3. If any statement times out, run statements ONE AT A TIME below.
--   4. Safe to re-run: every statement uses IF NOT EXISTS.
--   5. Do NOT run 079 until this file completes successfully.
--
-- HEAVY full-table indexes moved to 079 (CREATE INDEX CONCURRENTLY).

-- Ready filter (partial — ~10 rows)
CREATE INDEX IF NOT EXISTS idx_cj_intel_ready_status
  ON cj_product_intelligence (auto_publish_status, auto_publish_ready)
  WHERE auto_publish_ready = true AND auto_publish_status = 'READY';

-- Has video filter (partial — small subset)
CREATE INDEX IF NOT EXISTS idx_cj_intel_has_video
  ON cj_product_intelligence (has_video)
  WHERE has_video = true;

-- Trending filter (partial — usually tiny)
CREATE INDEX IF NOT EXISTS idx_cj_intel_trending_true
  ON cj_product_intelligence (trending)
  WHERE trending = true;

-- Published filter (partial — matches is_published_active = true)
CREATE INDEX IF NOT EXISTS idx_cj_intel_published_active
  ON cj_product_intelligence (is_published_active)
  WHERE is_published_active = true;

-- Pending enrichment filter (partial — large but single column equality uses index well)
CREATE INDEX IF NOT EXISTS idx_cj_intel_pending_enrichment
  ON cj_product_intelligence (auto_publish_status)
  WHERE auto_publish_status = 'PENDING_ENRICHMENT';

-- Requirements missing filter (partial)
CREATE INDEX IF NOT EXISTS idx_cj_intel_requirements_missing
  ON cj_product_intelligence (auto_publish_status)
  WHERE auto_publish_status = 'REQUIREMENTS_MISSING';

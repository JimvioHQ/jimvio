-- 078: Disk IO reduction — small indexes on queue/products (no duplicates)
--
-- RUN INSTRUCTIONS:
--   1. Run AFTER 076 and 077 complete successfully.
--   2. Run one statement at a time if needed.
--   3. Safe to re-run: IF NOT EXISTS on every index.
--
-- SKIPPED (already exist):
--   idx_cj_raw_products_pid        → 072 (pid is also PK)
--   idx_cj_raw_country_code        → 075
--   idx_cj_scan_failures_retry     → 074
--   idx_cj_enrichment_queue_*      → 075
--   idx_cj_auto_publish_queue_*    → 073, 075

-- Enrichment-complete scans (visibility sets, analytics samples)
CREATE INDEX IF NOT EXISTS idx_cj_intel_enrichment_complete_pid
  ON cj_product_intelligence (pid)
  WHERE enrichment_status = 'complete';

-- Analytics avg enrichment time (sample by enriched_at DESC)
CREATE INDEX IF NOT EXISTS idx_cj_intel_enrichment_enriched_at
  ON cj_product_intelligence (enriched_at DESC)
  WHERE enrichment_status = 'complete' AND enriched_at IS NOT NULL;

-- Status filters not covered by 076 partials
CREATE INDEX IF NOT EXISTS idx_cj_intel_auto_publish_status
  ON cj_product_intelligence (auto_publish_status);

-- CJ live marketplace products (products table — typically small)
CREATE INDEX IF NOT EXISTS idx_products_cj_active
  ON products (source, status, is_active)
  WHERE source = 'cj' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_cj_admin_override
  ON products (published_by_admin_override, status)
  WHERE source = 'cj' AND deleted_at IS NULL AND published_by_admin_override = true;

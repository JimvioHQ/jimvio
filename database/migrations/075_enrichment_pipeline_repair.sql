-- 075: Enrichment pipeline performance indexes and status repair

-- Default new products to pending enrichment (not requirements missing)
ALTER TABLE cj_product_intelligence
  ALTER COLUMN auto_publish_status SET DEFAULT 'PENDING_ENRICHMENT';

-- Repair existing rows evaluated before enrichment completed
UPDATE cj_product_intelligence
SET
  auto_publish_status = 'PENDING_ENRICHMENT',
  auto_publish_ready = false,
  updated_at = NOW()
WHERE enrichment_status IN ('pending', 'processing', 'failed')
  AND auto_publish_status = 'REQUIREMENTS_MISSING';

-- Enrichment queue throughput
CREATE INDEX IF NOT EXISTS idx_cj_enrichment_queue_pending
  ON cj_enrichment_queue (priority DESC, next_attempt_at ASC)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_cj_intel_enrichment_pending
  ON cj_product_intelligence (pid)
  WHERE enrichment_status IN ('pending', 'failed', 'processing');

CREATE INDEX IF NOT EXISTS idx_cj_intel_linked_product
  ON cj_product_intelligence (linked_product_id)
  WHERE linked_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cj_raw_country_code
  ON cj_raw_products (country_code)
  WHERE country_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cj_intel_description_length
  ON cj_product_intelligence (description_length)
  WHERE description_length > 0;

-- Auto publish queue status lookups for admin filters
CREATE INDEX IF NOT EXISTS idx_cj_auto_publish_queue_status
  ON cj_auto_publish_queue (status, priority DESC, next_attempt_at ASC);

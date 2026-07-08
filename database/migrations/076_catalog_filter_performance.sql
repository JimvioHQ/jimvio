-- 076: Catalog filter query performance indexes

CREATE INDEX IF NOT EXISTS idx_cj_intel_ready_status
  ON cj_product_intelligence (auto_publish_status, auto_publish_ready)
  WHERE auto_publish_ready = true AND auto_publish_status = 'READY';

CREATE INDEX IF NOT EXISTS idx_cj_intel_has_video
  ON cj_product_intelligence (has_video)
  WHERE has_video = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_trending_true
  ON cj_product_intelligence (trending)
  WHERE trending = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_published_active
  ON cj_product_intelligence (is_published_active)
  WHERE is_published_active = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_status_tier
  ON cj_product_intelligence (auto_publish_status, catalog_tier);

CREATE INDEX IF NOT EXISTS idx_cj_intel_health_pid
  ON cj_product_intelligence (health_score DESC, pid DESC);

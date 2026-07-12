-- 077: Catalog filter indexes — partial indexes for missing*, draft, hidden
--
-- RUN INSTRUCTIONS:
--   1. Run AFTER 076 completes successfully.
--   2. Run one statement at a time if Disk IO is still constrained.
--   3. Safe to re-run: IF NOT EXISTS on every index.
--
-- SKIPPED (already exist in 072–075 or redundant):
--   idx_cj_intel_description_length  → 075
--   idx_cj_intel_published_active    → 076
--   idx_cj_intel_tier_health         → 079 (heavy, CONCURRENTLY)
--   idx_cj_intel_image_count (full)  → use partial tier_image_count below

-- Missing supplier / verified filters
CREATE INDEX IF NOT EXISTS idx_cj_intel_supplier_verified_false
  ON cj_product_intelligence (supplier_verified)
  WHERE supplier_verified = false;

-- Fast shipping / missing shipping
CREATE INDEX IF NOT EXISTS idx_cj_intel_delivery_days
  ON cj_product_intelligence (delivery_days)
  WHERE delivery_days IS NOT NULL;

-- Draft filter (imported but not published)
CREATE INDEX IF NOT EXISTS idx_cj_intel_draft
  ON cj_product_intelligence (linked_product_id, is_published_active)
  WHERE linked_product_id IS NOT NULL AND is_published_active = false;

-- Hidden tier sort (073 has tier-only index; this adds health sort for hidden list)
CREATE INDEX IF NOT EXISTS idx_cj_intel_hidden_tier
  ON cj_product_intelligence (health_score DESC, pid DESC)
  WHERE catalog_tier = 'HIDDEN';

-- Missing images filter (partial — matches image_count < 5)
CREATE INDEX IF NOT EXISTS idx_cj_intel_tier_image_count
  ON cj_product_intelligence (catalog_tier, image_count)
  WHERE image_count < 5;

-- Missing description filter (partial — matches description_length < 80)
CREATE INDEX IF NOT EXISTS idx_cj_intel_tier_desc_len
  ON cj_product_intelligence (catalog_tier, description_length)
  WHERE description_length < 80;

-- Missing video filter (partial — matches has_video = false)
CREATE INDEX IF NOT EXISTS idx_cj_intel_missing_video
  ON cj_product_intelligence (catalog_tier, has_video)
  WHERE has_video = false;

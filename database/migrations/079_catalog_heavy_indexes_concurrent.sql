-- 079: HEAVY catalog indexes — run separately with CREATE INDEX CONCURRENTLY
--
-- ⚠️  DO NOT run inside a transaction block.
-- ⚠️  DO NOT run while crons/workers/scanner are active.
-- ⚠️  Run ONE statement at a time in Supabase SQL Editor.
-- ⚠️  Wait for each to finish before starting the next.
--
-- Supabase: SQL Editor → New query → paste ONE statement → Run
-- Set statement timeout: Dashboard may default to 60s; heavy indexes need longer.
--   Optional first line per session: SET statement_timeout = '0';
--
-- Safe to re-run: IF NOT EXISTS skips already-built indexes.
-- If a CONCURRENTLY build fails, drop invalid index then retry:
--   SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--
-- WHY CONCURRENTLY: These scan the full cj_product_intelligence table (~25k+ rows)
-- and write large B-tree pages. Standard CREATE INDEX locks writes and saturates
-- Disk IO — the likely cause of "Connection terminated due to connection timeout".

-- 1/3 — Catalog list sort (curated/health) across visible tiers
-- Replaces removed idx_cj_intel_health_pid and idx_cj_intel_status_tier from 076
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cj_intel_tier_health
  ON cj_product_intelligence (catalog_tier, health_score DESC, pid DESC);

-- 2/3 — Status + tier compound filter counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cj_intel_status_tier
  ON cj_product_intelligence (auto_publish_status, catalog_tier);

-- 3/3 — Global health sort fallback (only if queries sort without tier filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cj_intel_health_pid
  ON cj_product_intelligence (health_score DESC, pid DESC);

-- JIMVIO — MIGRATION 069
-- CJ Auto Publish Engine v3 (World-Class Enterprise Edition)
-- BEGIN;

-- v3 intelligence columns
ALTER TABLE public.cj_product_intelligence
  ADD COLUMN IF NOT EXISTS quality_confidence TEXT
    CHECK (quality_confidence IS NULL OR quality_confidence IN ('very_high', 'high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS quality_explanation TEXT,
  ADD COLUMN IF NOT EXISTS supplier_reputation_score SMALLINT,
  ADD COLUMN IF NOT EXISTS duplicate_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_ref_pid TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_similarity NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS publish_priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_unpublish_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_quality_check TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cj_intel_publish_priority
  ON public.cj_product_intelligence(publish_priority DESC)
  WHERE auto_publish_ready = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_duplicate_blocked
  ON public.cj_product_intelligence(duplicate_blocked)
  WHERE duplicate_blocked = true;

-- Product auto-unpublish tracking
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS auto_unpublished BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_unpublish_reason TEXT,
  ADD COLUMN IF NOT EXISTS auto_unpublished_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_auto_unpublished
  ON public.products(auto_unpublished)
  WHERE auto_unpublished = true;

-- Supplier reputation
CREATE TABLE IF NOT EXISTS public.cj_supplier_reputation (
  supplier_id       TEXT PRIMARY KEY,
  supplier_name     TEXT NOT NULL DEFAULT '',
  reputation_score  SMALLINT NOT NULL DEFAULT 50,
  reputation_label  TEXT NOT NULL DEFAULT 'Average'
    CHECK (reputation_label IN ('Excellent', 'Good', 'Average', 'Poor')),
  blacklisted       BOOLEAN NOT NULL DEFAULT false,
  stock_stability   SMALLINT NOT NULL DEFAULT 50,
  shipping_score    SMALLINT NOT NULL DEFAULT 50,
  reliability_score SMALLINT NOT NULL DEFAULT 50,
  product_count     INTEGER NOT NULL DEFAULT 0,
  metrics           JSONB NOT NULL DEFAULT '{}',
  last_calculated   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cj_supplier_rep_score
  ON public.cj_supplier_reputation(reputation_score DESC);

CREATE INDEX IF NOT EXISTS idx_cj_supplier_rep_blacklisted
  ON public.cj_supplier_reputation(blacklisted)
  WHERE blacklisted = true;

-- Duplicate detection cache
CREATE TABLE IF NOT EXISTS public.cj_product_duplicates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid             TEXT NOT NULL,
  duplicate_pid   TEXT NOT NULL,
  similarity      NUMERIC(5, 2) NOT NULL,
  blocked         BOOLEAN NOT NULL DEFAULT false,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pid, duplicate_pid)
);

CREATE INDEX IF NOT EXISTS idx_cj_product_duplicates_pid
  ON public.cj_product_duplicates(pid);

CREATE INDEX IF NOT EXISTS idx_cj_product_duplicates_blocked
  ON public.cj_product_duplicates(blocked)
  WHERE blocked = true;

-- Catalog health snapshots
CREATE TABLE IF NOT EXISTS public.cj_catalog_health (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  health_percent        NUMERIC(5, 2) NOT NULL DEFAULT 0,
  health_label          TEXT NOT NULL DEFAULT 'Average',
  ready_count           INTEGER NOT NULL DEFAULT 0,
  published_count       INTEGER NOT NULL DEFAULT 0,
  pending_count         INTEGER NOT NULL DEFAULT 0,
  draft_count           INTEGER NOT NULL DEFAULT 0,
  hidden_count          INTEGER NOT NULL DEFAULT 0,
  unpublished_count     INTEGER NOT NULL DEFAULT 0,
  supplier_issues       INTEGER NOT NULL DEFAULT 0,
  shipping_issues       INTEGER NOT NULL DEFAULT 0,
  video_missing         INTEGER NOT NULL DEFAULT 0,
  duplicate_count       INTEGER NOT NULL DEFAULT 0,
  ready_percent         NUMERIC(5, 2) NOT NULL DEFAULT 0,
  publish_percent       NUMERIC(5, 2) NOT NULL DEFAULT 0,
  duplicate_rate        NUMERIC(5, 2) NOT NULL DEFAULT 0,
  avg_supplier_quality  NUMERIC(5, 2) NOT NULL DEFAULT 0,
  marketplace_health    NUMERIC(5, 2) NOT NULL DEFAULT 0,
  avg_publish_time_ms   NUMERIC(12, 2),
  avg_queue_time_ms     NUMERIC(12, 2)
);

CREATE INDEX IF NOT EXISTS idx_cj_catalog_health_snapshot
  ON public.cj_catalog_health(snapshot_at DESC);

-- AI recommendations cache
CREATE TABLE IF NOT EXISTS public.cj_ai_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,
  issue           TEXT NOT NULL,
  product_count   INTEGER NOT NULL DEFAULT 0,
  recommendation  TEXT NOT NULL,
  action          TEXT NOT NULL,
  priority        INTEGER NOT NULL DEFAULT 0,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cj_ai_recommendations_generated
  ON public.cj_ai_recommendations(generated_at DESC);

-- Smart queue priority
ALTER TABLE public.cj_auto_publish_queue
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cj_auto_publish_queue_priority
  ON public.cj_auto_publish_queue(priority DESC, next_attempt_at ASC)
  WHERE status IN ('pending', 'failed');

-- Extend event types (drop/recreate CHECK)
ALTER TABLE public.cj_auto_publish_events
  DROP CONSTRAINT IF EXISTS cj_auto_publish_events_event_type_check;

ALTER TABLE public.cj_auto_publish_events
  ADD CONSTRAINT cj_auto_publish_events_event_type_check
  CHECK (event_type IN (
    'evaluation', 'auto_publish', 'bulk_publish', 'force_publish',
    'retry_publish', 'queue_publish', 'queue_failed',
    'unpublished', 'duplicate_blocked', 'supplier_change',
    'stock_change', 'shipping_change', 'supplier_blacklist',
    'quality_recalc', 'catalog_cleanup'
  ));

-- Extend analytics
ALTER TABLE public.cj_auto_publish_analytics
  ADD COLUMN IF NOT EXISTS ready_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publish_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicate_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_supplier_quality NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalog_health_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketplace_health_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_publish_time_ms NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS avg_queue_time_ms NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS unpublished_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicate_blocked_count INTEGER NOT NULL DEFAULT 0;

-- COMMIT;

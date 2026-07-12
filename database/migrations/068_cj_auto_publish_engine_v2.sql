-- JIMVIO — MIGRATION 068
-- CJ Auto Publish Engine v2 (Enterprise Edition)
-- BEGIN;

-- Intelligence status & pending enrichment tracking
ALTER TABLE public.cj_product_intelligence
  ADD COLUMN IF NOT EXISTS auto_publish_status TEXT NOT NULL DEFAULT 'REQUIREMENTS_MISSING'
    CHECK (auto_publish_status IN (
      'READY',
      'PENDING_ENRICHMENT',
      'REQUIREMENTS_MISSING',
      'PUBLISHED_BY_ADMIN'
    )),
  ADD COLUMN IF NOT EXISTS pending_enrichment_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cj_intel_auto_publish_status
  ON public.cj_product_intelligence(auto_publish_status);

CREATE INDEX IF NOT EXISTS idx_cj_intel_pending_enrichment
  ON public.cj_product_intelligence(auto_publish_status)
  WHERE auto_publish_status = 'PENDING_ENRICHMENT';

-- Admin override on published marketplace products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS published_by_admin_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS override_user UUID,
  ADD COLUMN IF NOT EXISTS override_time TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_admin_override
  ON public.products(published_by_admin_override)
  WHERE published_by_admin_override = true;

-- Event log — every publish decision / action
CREATE TABLE IF NOT EXISTS public.cj_auto_publish_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid               TEXT,
  product_id        UUID,
  supplier          TEXT,
  score             SMALLINT NOT NULL DEFAULT 0,
  ready             BOOLEAN NOT NULL DEFAULT false,
  published         BOOLEAN NOT NULL DEFAULT false,
  admin_override    BOOLEAN NOT NULL DEFAULT false,
  failure_reasons   JSONB NOT NULL DEFAULT '[]'::jsonb,
  pending_reasons   JSONB NOT NULL DEFAULT '[]'::jsonb,
  status            TEXT,
  user_id           UUID,
  processing_time_ms INTEGER,
  event_type        TEXT NOT NULL DEFAULT 'evaluation'
    CHECK (event_type IN (
      'evaluation',
      'auto_publish',
      'bulk_publish',
      'force_publish',
      'retry_publish',
      'queue_publish',
      'queue_failed'
    )),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cj_auto_publish_events_pid
  ON public.cj_auto_publish_events(pid);

CREATE INDEX IF NOT EXISTS idx_cj_auto_publish_events_created
  ON public.cj_auto_publish_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cj_auto_publish_events_type
  ON public.cj_auto_publish_events(event_type, created_at DESC);

-- Publish queue — batched 50-at-a-time processing
CREATE TABLE IF NOT EXISTS public.cj_auto_publish_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid             TEXT NOT NULL,
  product_id      UUID,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'complete', 'failed', 'dead_letter')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error      TEXT,
  batch_id        UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cj_auto_publish_queue_poll
  ON public.cj_auto_publish_queue(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

CREATE UNIQUE INDEX IF NOT EXISTS idx_cj_auto_publish_queue_pid_pending
  ON public.cj_auto_publish_queue(pid)
  WHERE status IN ('pending', 'processing');

-- Analytics materialized counters (refreshed by cron)
CREATE TABLE IF NOT EXISTS public.cj_auto_publish_analytics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_products          INTEGER NOT NULL DEFAULT 0,
  ready_count             INTEGER NOT NULL DEFAULT 0,
  published_count         INTEGER NOT NULL DEFAULT 0,
  pending_enrichment      INTEGER NOT NULL DEFAULT 0,
  requirements_missing    INTEGER NOT NULL DEFAULT 0,
  admin_override_count    INTEGER NOT NULL DEFAULT 0,
  missing_video           INTEGER NOT NULL DEFAULT 0,
  missing_supplier        INTEGER NOT NULL DEFAULT 0,
  missing_shipping        INTEGER NOT NULL DEFAULT 0,
  missing_images          INTEGER NOT NULL DEFAULT 0,
  missing_description     INTEGER NOT NULL DEFAULT 0,
  missing_variants        INTEGER NOT NULL DEFAULT 0,
  missing_stock           INTEGER NOT NULL DEFAULT 0,
  trending_missing        INTEGER NOT NULL DEFAULT 0,
  avg_publish_score       NUMERIC(5, 2) NOT NULL DEFAULT 0,
  avg_enrichment_time_ms  NUMERIC(12, 2)
);

CREATE INDEX IF NOT EXISTS idx_cj_auto_publish_analytics_snapshot
  ON public.cj_auto_publish_analytics(snapshot_at DESC);

-- COMMIT;

-- JIMVIO — MIGRATION 071
-- Auto Publish Worker — autonomous publish event types
-- BEGIN;

ALTER TABLE public.cj_auto_publish_events
  DROP CONSTRAINT IF EXISTS cj_auto_publish_events_event_type_check;

ALTER TABLE public.cj_auto_publish_events
  ADD CONSTRAINT cj_auto_publish_events_event_type_check
  CHECK (event_type IN (
    'evaluation',
    'auto_publish',
    'bulk_publish',
    'force_publish',
    'retry_publish',
    'queue_publish',
    'queue_failed',
    'unpublished',
    'duplicate_blocked',
    'supplier_change',
    'stock_change',
    'shipping_change',
    'supplier_blacklist',
    'quality_recalc',
    'catalog_cleanup',
    'queued',
    'publishing',
    'auto_published',
    'retry',
    'verified'
  ));

-- Track when product first became auto-publish ready (for debounce)
ALTER TABLE public.cj_product_intelligence
  ADD COLUMN IF NOT EXISTS auto_publish_ready_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cj_intel_ready_at
  ON public.cj_product_intelligence(auto_publish_ready_at DESC)
  WHERE auto_publish_ready = true;

-- COMMIT;

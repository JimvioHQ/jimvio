-- JIMVIO — MIGRATION 073
-- Autonomous Marketplace Engine v5 — watcher, signal queue, search index
-- BEGIN;

-- Signal watch queue: immediate re-evaluation when CJ signals change
CREATE TABLE IF NOT EXISTS public.cj_signal_watch_queue (
  pid               TEXT PRIMARY KEY,
  signals           JSONB NOT NULL DEFAULT '[]',
  priority          INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  next_attempt_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts          INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cj_signal_watch_pending
  ON public.cj_signal_watch_queue(next_attempt_at, priority DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_cj_signal_watch_failed
  ON public.cj_signal_watch_queue(status)
  WHERE status = 'failed';

-- Global search index (denormalized for 500k+ catalog)
CREATE TABLE IF NOT EXISTS public.cj_product_search_index (
  pid                 TEXT PRIMARY KEY,
  search_text         TEXT NOT NULL DEFAULT '',
  title               TEXT,
  sku                 TEXT,
  supplier            TEXT,
  warehouse           TEXT,
  category            TEXT,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  description_snippet TEXT,
  linked_product_id   UUID,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cj_search_text_trgm
  ON public.cj_product_search_index USING gin (search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cj_search_sku
  ON public.cj_product_search_index(sku)
  WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cj_search_supplier
  ON public.cj_product_search_index(supplier)
  WHERE supplier IS NOT NULL;

-- Watcher cursor for incremental CJ catalog polling
CREATE TABLE IF NOT EXISTS public.cj_watcher_state (
  id                    TEXT PRIMARY KEY DEFAULT 'default',
  last_raw_pid          TEXT NOT NULL DEFAULT '',
  last_list_sync_page   INTEGER NOT NULL DEFAULT 1,
  products_watched      BIGINT NOT NULL DEFAULT 0,
  signals_detected      BIGINT NOT NULL DEFAULT 0,
  last_run_at           TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.cj_watcher_state (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Scale indexes for worker queue ordering
CREATE INDEX IF NOT EXISTS idx_cj_auto_publish_queue_processing
  ON public.cj_auto_publish_queue(status, updated_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_cj_auto_publish_queue_pending
  ON public.cj_auto_publish_queue(priority DESC, next_attempt_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_cj_intel_catalog_tier_hidden
  ON public.cj_product_intelligence(catalog_tier)
  WHERE catalog_tier = 'HIDDEN';

CREATE INDEX IF NOT EXISTS idx_cj_products_cj_draft
  ON public.products(status, source)
  WHERE source = 'cj' AND status = 'draft';

-- COMMIT;

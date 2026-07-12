-- JIMVIO — MIGRATION 072
-- Full catalog scanner state + filter performance indexes
-- BEGIN;

-- Resumable background scanner cursor (evaluates entire imported catalog)
CREATE TABLE IF NOT EXISTS public.cj_catalog_scan_state (
  id                  TEXT PRIMARY KEY DEFAULT 'default',
  last_pid            TEXT NOT NULL DEFAULT '',
  cycle_number        INTEGER NOT NULL DEFAULT 1,
  total_scanned       BIGINT NOT NULL DEFAULT 0,
  last_batch_size     INTEGER NOT NULL DEFAULT 0,
  last_batch_at       TIMESTAMPTZ,
  cycle_started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status              TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'running', 'paused')),
  metadata            JSONB NOT NULL DEFAULT '{}',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.cj_catalog_scan_state (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Denormalized publish link for fast server-side filters
ALTER TABLE public.cj_product_intelligence
  ADD COLUMN IF NOT EXISTS linked_product_id UUID,
  ADD COLUMN IF NOT EXISTS is_published_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cj_intel_has_video
  ON public.cj_product_intelligence(has_video)
  WHERE has_video = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_supplier_verified
  ON public.cj_product_intelligence(supplier_verified)
  WHERE supplier_verified = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_trending
  ON public.cj_product_intelligence(trending)
  WHERE trending = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_auto_publish_status
  ON public.cj_product_intelligence(auto_publish_status);

CREATE INDEX IF NOT EXISTS idx_cj_intel_auto_publish_ready
  ON public.cj_product_intelligence(auto_publish_ready, auto_publish_status)
  WHERE auto_publish_ready = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_is_published_active
  ON public.cj_product_intelligence(is_published_active)
  WHERE is_published_active = true;

CREATE INDEX IF NOT EXISTS idx_cj_intel_delivery_days
  ON public.cj_product_intelligence(delivery_days)
  WHERE delivery_days IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cj_intel_image_count
  ON public.cj_product_intelligence(image_count);

CREATE INDEX IF NOT EXISTS idx_cj_intel_last_scanned
  ON public.cj_product_intelligence(last_scanned_at);

CREATE INDEX IF NOT EXISTS idx_cj_raw_products_title_trgm
  ON public.cj_raw_products USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cj_raw_products_pid
  ON public.cj_raw_products(pid);

CREATE INDEX IF NOT EXISTS idx_cj_raw_products_sku
  ON public.cj_raw_products(sku)
  WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cj_raw_products_supplier
  ON public.cj_raw_products(supplier)
  WHERE supplier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cj_raw_products_warehouse
  ON public.cj_raw_products(warehouse)
  WHERE warehouse IS NOT NULL;

-- COMMIT;

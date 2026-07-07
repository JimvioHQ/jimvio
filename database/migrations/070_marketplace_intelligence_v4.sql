-- JIMVIO — MIGRATION 070
-- Marketplace Intelligence Engine v4
-- Read-only intelligence layer — does NOT modify products publish/import
-- BEGIN;

-- Per-product marketplace intelligence (computed, read-only recommendations)
CREATE TABLE IF NOT EXISTS public.marketplace_product_intelligence (
  product_id              UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  marketplace_rank        INTEGER,
  rank_score              SMALLINT NOT NULL DEFAULT 0,
  jimvio_trending_score   SMALLINT NOT NULL DEFAULT 0,
  jimvio_quality_score    SMALLINT NOT NULL DEFAULT 0,
  quality_label           TEXT NOT NULL DEFAULT 'Average'
    CHECK (quality_label IN ('Excellent', 'Very Good', 'Good', 'Average', 'Poor')),
  quality_confidence      TEXT
    CHECK (quality_confidence IS NULL OR quality_confidence IN ('very_high', 'high', 'medium', 'low')),
  recommended_price       NUMERIC(14, 2),
  recommended_warehouse   TEXT,
  conversion_rate         NUMERIC(8, 4) NOT NULL DEFAULT 0,
  ctr                     NUMERIC(8, 4) NOT NULL DEFAULT 0,
  refund_rate             NUMERIC(8, 4) NOT NULL DEFAULT 0,
  affiliate_score         SMALLINT NOT NULL DEFAULT 0,
  community_score         SMALLINT NOT NULL DEFAULT 0,
  duplicate_hidden        BOOLEAN NOT NULL DEFAULT false,
  duplicate_of_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  duplicate_similarity    NUMERIC(5, 2),
  season_tags             JSONB NOT NULL DEFAULT '[]'::jsonb,
  rank_factors            JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_recommendation    JSONB NOT NULL DEFAULT '{}'::jsonb,
  shipping_recommendation JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_recommendations      JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mpi_rank_score ON public.marketplace_product_intelligence(rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_mpi_trending ON public.marketplace_product_intelligence(jimvio_trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_mpi_quality ON public.marketplace_product_intelligence(jimvio_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_mpi_rank ON public.marketplace_product_intelligence(marketplace_rank ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_mpi_duplicate_hidden ON public.marketplace_product_intelligence(duplicate_hidden) WHERE duplicate_hidden = true;
CREATE INDEX IF NOT EXISTS idx_mpi_computed ON public.marketplace_product_intelligence(computed_at DESC);

-- Hourly trending snapshots
CREATE TABLE IF NOT EXISTS public.marketplace_trending_hourly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  trending_score  SMALLINT NOT NULL DEFAULT 0,
  signals         JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mth_product ON public.marketplace_trending_hourly(product_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mth_score ON public.marketplace_trending_hourly(trending_score DESC, computed_at DESC);

-- Customer match profiles (aggregated, privacy-safe)
CREATE TABLE IF NOT EXISTS public.marketplace_customer_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID,
  session_id          TEXT,
  country_code        TEXT,
  language            TEXT DEFAULT 'en',
  currency            TEXT DEFAULT 'USD',
  category_prefs      JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_history      JSONB NOT NULL DEFAULT '[]'::jsonb,
  interest_tags       JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_active_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_user ON public.marketplace_customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_session ON public.marketplace_customer_profiles(session_id);

-- Category intelligence
CREATE TABLE IF NOT EXISTS public.marketplace_category_intelligence (
  category_id       UUID PRIMARY KEY,
  category_name     TEXT NOT NULL DEFAULT '',
  conversion_rate   NUMERIC(8, 4) NOT NULL DEFAULT 0,
  revenue_total     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  growth_rate       NUMERIC(8, 4) NOT NULL DEFAULT 0,
  refund_rate       NUMERIC(8, 4) NOT NULL DEFAULT 0,
  product_count     INTEGER NOT NULL DEFAULT 0,
  rank              INTEGER,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mci_conversion ON public.marketplace_category_intelligence(conversion_rate DESC);
CREATE INDEX IF NOT EXISTS idx_mci_revenue ON public.marketplace_category_intelligence(revenue_total DESC);

-- Search intelligence
CREATE TABLE IF NOT EXISTS public.marketplace_search_intelligence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term     TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  synonyms        JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_count    INTEGER NOT NULL DEFAULT 0,
  trending        BOOLEAN NOT NULL DEFAULT false,
  related_terms   JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_searched   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(normalized_term)
);

CREATE INDEX IF NOT EXISTS idx_msi_trending ON public.marketplace_search_intelligence(trending) WHERE trending = true;
CREATE INDEX IF NOT EXISTS idx_msi_count ON public.marketplace_search_intelligence(search_count DESC);

-- Marketplace health snapshots
CREATE TABLE IF NOT EXISTS public.marketplace_intelligence_analytics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  health_percent          NUMERIC(5, 2) NOT NULL DEFAULT 0,
  health_label            TEXT NOT NULL DEFAULT 'Average',
  avg_quality             NUMERIC(5, 2) NOT NULL DEFAULT 0,
  avg_shipping_days       NUMERIC(5, 2),
  conversion_rate         NUMERIC(8, 4) NOT NULL DEFAULT 0,
  refund_prediction       NUMERIC(8, 4) NOT NULL DEFAULT 0,
  supplier_health         NUMERIC(5, 2) NOT NULL DEFAULT 0,
  video_percent           NUMERIC(5, 2) NOT NULL DEFAULT 0,
  duplicate_percent       NUMERIC(5, 2) NOT NULL DEFAULT 0,
  trending_percent        NUMERIC(5, 2) NOT NULL DEFAULT 0,
  fast_shipping_percent   NUMERIC(5, 2) NOT NULL DEFAULT 0,
  total_products          INTEGER NOT NULL DEFAULT 0,
  active_products         INTEGER NOT NULL DEFAULT 0,
  revenue_7d              NUMERIC(14, 2) NOT NULL DEFAULT 0,
  orders_7d               INTEGER NOT NULL DEFAULT 0,
  ctr_avg                 NUMERIC(8, 4) NOT NULL DEFAULT 0,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mia_snapshot ON public.marketplace_intelligence_analytics(snapshot_at DESC);

-- Intelligence events (read-only audit)
CREATE TABLE IF NOT EXISTS public.marketplace_intelligence_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID,
  event_type  TEXT NOT NULL
    CHECK (event_type IN (
      'rank_update', 'trending_update', 'duplicate_hidden', 'quality_recalc',
      'price_recommendation', 'shipping_recommendation', 'season_match',
      'learning_update', 'health_snapshot', 'category_update', 'search_update'
    )),
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mie_product ON public.marketplace_intelligence_events(product_id);
CREATE INDEX IF NOT EXISTS idx_mie_type ON public.marketplace_intelligence_events(event_type, created_at DESC);

-- Active seasons
CREATE TABLE IF NOT EXISTS public.marketplace_seasons (
  season_key  TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT false,
  starts_at   DATE,
  ends_at     DATE,
  keywords    JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COMMIT;

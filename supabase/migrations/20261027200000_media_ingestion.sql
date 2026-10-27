-- Jimvio Media external ingestion.
-- Additive. Depends on public.media_articles from 20261027180000.
-- Source rows, discovered items, jobs, and image-rights notes are service-role only.
-- Public readers cannot select drafts or ingestion records.
-- Reverse, once nothing reads these tables: drop them in a later reviewed migration.

CREATE TABLE IF NOT EXISTS public.media_ingest_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  mode text NOT NULL DEFAULT 'draft',
  emergency_stop boolean NOT NULL DEFAULT false,
  owner_autopublish_authorized boolean NOT NULL DEFAULT false,
  daily_publish_cap integer NOT NULL DEFAULT 3,
  max_items_per_run integer NOT NULL DEFAULT 20,
  retry_limit integer NOT NULL DEFAULT 3,
  stale_days integer NOT NULL DEFAULT 21,
  blocked_categories text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_ingest_settings_singleton CHECK (id = 1),
  CONSTRAINT media_ingest_settings_mode_check CHECK (mode IN ('disabled', 'discovery', 'draft', 'review', 'auto')),
  CONSTRAINT media_ingest_settings_cap_check CHECK (daily_publish_cap BETWEEN 0 AND 50),
  CONSTRAINT media_ingest_settings_items_check CHECK (max_items_per_run BETWEEN 1 AND 40),
  CONSTRAINT media_ingest_settings_retry_check CHECK (retry_limit BETWEEN 1 AND 8),
  CONSTRAINT media_ingest_settings_stale_check CHECK (stale_days BETWEEN 1 AND 90)
);

INSERT INTO public.media_ingest_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.media_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL,
  locator text NOT NULL,
  categories text[] NOT NULL DEFAULT '{news}',
  language text NOT NULL DEFAULT 'en',
  region text NOT NULL DEFAULT 'global',
  permitted_usage text NOT NULL,
  image_rights text NOT NULL DEFAULT 'none',
  poll_minutes integer NOT NULL DEFAULT 360,
  enabled boolean NOT NULL DEFAULT false,
  always_review boolean NOT NULL DEFAULT false,
  health text NOT NULL DEFAULT 'unknown',
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  terms_note text NOT NULL DEFAULT '',
  rate_note text NOT NULL DEFAULT '',
  access_method text NOT NULL DEFAULT '',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_sources_locator_key UNIQUE (locator),
  CONSTRAINT media_sources_name_len CHECK (char_length(name) BETWEEN 2 AND 120),
  CONSTRAINT media_sources_locator_len CHECK (char_length(locator) BETWEEN 4 AND 500),
  CONSTRAINT media_sources_kind_check CHECK (kind IN ('rss', 'atom', 'api', 'announcement', 'licensed', 'educational', 'image', 'owned')),
  CONSTRAINT media_sources_usage_check CHECK (permitted_usage IN ('none', 'link', 'facts', 'full')),
  CONSTRAINT media_sources_rights_check CHECK (image_rights IN ('none', 'attributed', 'owned', 'licensed')),
  CONSTRAINT media_sources_poll_check CHECK (poll_minutes BETWEEN 60 AND 10080),
  CONSTRAINT media_sources_health_check CHECK (health IN ('unknown', 'ok', 'degraded', 'failed')),
  CONSTRAINT media_sources_language_len CHECK (char_length(language) BETWEEN 2 AND 12),
  CONSTRAINT media_sources_region_len CHECK (char_length(region) <= 40),
  CONSTRAINT media_sources_error_len CHECK (last_error IS NULL OR char_length(last_error) <= 300),
  CONSTRAINT media_sources_terms_len CHECK (char_length(terms_note) <= 500),
  CONSTRAINT media_sources_rate_len CHECK (char_length(rate_note) <= 300),
  CONSTRAINT media_sources_access_len CHECK (char_length(access_method) <= 40)
);

CREATE TABLE IF NOT EXISTS public.media_external_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.media_sources(id) ON DELETE CASCADE,
  external_key text NOT NULL,
  guid text,
  title text NOT NULL,
  url text NOT NULL,
  summary text NOT NULL DEFAULT '',
  language text,
  published_at timestamptz,
  fingerprint text NOT NULL,
  cluster_key text,
  status text NOT NULL,
  filter_reason text,
  article_id uuid REFERENCES public.media_articles(id) ON DELETE SET NULL,
  duplicate_of uuid,
  sensitive boolean NOT NULL DEFAULT false,
  evidence text NOT NULL DEFAULT '',
  image_status text NOT NULL DEFAULT 'unchecked',
  image_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_external_items_key UNIQUE (external_key),
  CONSTRAINT media_external_items_key_len CHECK (char_length(external_key) = 64),
  CONSTRAINT media_external_items_title_len CHECK (char_length(title) BETWEEN 1 AND 300),
  CONSTRAINT media_external_items_url_len CHECK (char_length(url) BETWEEN 8 AND 500),
  CONSTRAINT media_external_items_summary_len CHECK (char_length(summary) <= 700),
  CONSTRAINT media_external_items_evidence_len CHECK (char_length(evidence) <= 2000),
  CONSTRAINT media_external_items_status_check CHECK (status IN (
    'discovered', 'duplicate', 'filtered', 'grouped', 'drafted', 'review', 'published', 'failed'
  )),
  CONSTRAINT media_external_items_image_check CHECK (image_status IN ('unchecked', 'rejected', 'verified', 'fallback'))
);

CREATE TABLE IF NOT EXISTS public.media_ingest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.media_sources(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  item_count integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT media_ingest_jobs_key UNIQUE (idempotency_key),
  CONSTRAINT media_ingest_jobs_kind_check CHECK (kind IN ('sync', 'retry')),
  CONSTRAINT media_ingest_jobs_status_check CHECK (status IN ('running', 'succeeded', 'failed', 'retried')),
  CONSTRAINT media_ingest_jobs_attempt_check CHECK (attempt BETWEEN 1 AND 8),
  CONSTRAINT media_ingest_jobs_error_len CHECK (error IS NULL OR char_length(error) <= 300)
);

CREATE TABLE IF NOT EXISTS public.media_image_rights (
  article_id uuid PRIMARY KEY REFERENCES public.media_articles(id) ON DELETE CASCADE,
  item_id uuid,
  provider text NOT NULL DEFAULT '',
  source_url text,
  license text NOT NULL DEFAULT '',
  attribution text NOT NULL DEFAULT '',
  rights text NOT NULL,
  mime text,
  width integer,
  height integer,
  alt_text text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_image_rights_rights_check CHECK (rights IN ('verified', 'fallback', 'rejected')),
  CONSTRAINT media_image_rights_provider_len CHECK (char_length(provider) <= 120),
  CONSTRAINT media_image_rights_license_len CHECK (char_length(license) <= 160),
  CONSTRAINT media_image_rights_alt_len CHECK (char_length(alt_text) <= 180),
  CONSTRAINT media_image_rights_caption_len CHECK (char_length(caption) <= 300)
);

CREATE INDEX IF NOT EXISTS media_sources_enabled_idx
  ON public.media_sources (enabled, last_attempt_at);

CREATE INDEX IF NOT EXISTS media_external_items_source_idx
  ON public.media_external_items (source_id, created_at DESC);

CREATE INDEX IF NOT EXISTS media_external_items_status_idx
  ON public.media_external_items (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS media_ingest_jobs_status_idx
  ON public.media_ingest_jobs (status, started_at DESC);

ALTER TABLE public.media_ingest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_external_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_ingest_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_image_rights ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.media_ingest_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.media_sources FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.media_external_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.media_ingest_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.media_image_rights FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.media_ingest_settings TO service_role;
GRANT ALL ON TABLE public.media_sources TO service_role;
GRANT ALL ON TABLE public.media_external_items TO service_role;
GRANT ALL ON TABLE public.media_ingest_jobs TO service_role;
GRANT ALL ON TABLE public.media_image_rights TO service_role;

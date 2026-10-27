-- Jimvio Media articles.
-- Additive only. Does not change blog_posts or any other product table.
-- Public readers can select live rows. Drafts, reviews, and archives stay invisible.
-- Writes are service-role only, after the app checks platform admin.
-- Reverse, once nothing reads this table: drop public.media_articles.

CREATE TABLE IF NOT EXISTS public.media_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  idempotency_key text,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  category text NOT NULL,
  kicker text,
  image_url text,
  image_alt text,
  status text NOT NULL DEFAULT 'draft',
  section text NOT NULL DEFAULT 'standard',
  tags text[] NOT NULL DEFAULT '{}',
  seo_title text,
  seo_description text,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name text,
  source_name text,
  source_url text,
  correction_note text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_articles_slug_key UNIQUE (slug),
  CONSTRAINT media_articles_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT media_articles_status_check CHECK (status IN ('draft', 'review', 'scheduled', 'published', 'archived')),
  CONSTRAINT media_articles_section_check CHECK (section IN ('hero', 'featured', 'news', 'magazine', 'guide', 'standard')),
  CONSTRAINT media_articles_category_check CHECK (category IN (
    'news', 'blog', 'magazine', 'guides', 'reviews', 'analysis', 'opinion', 'business', 'technology', 'lifestyle'
  )),
  CONSTRAINT media_articles_title_len CHECK (char_length(title) BETWEEN 1 AND 180),
  CONSTRAINT media_articles_excerpt_len CHECK (char_length(excerpt) <= 500),
  CONSTRAINT media_articles_seo_title_len CHECK (seo_title IS NULL OR char_length(seo_title) <= 70),
  CONSTRAINT media_articles_seo_description_len CHECK (seo_description IS NULL OR char_length(seo_description) <= 160),
  CONSTRAINT media_articles_schedule_check CHECK (status <> 'scheduled' OR scheduled_at IS NOT NULL),
  CONSTRAINT media_articles_source_name_len CHECK (source_name IS NULL OR char_length(source_name) <= 120),
  CONSTRAINT media_articles_source_url_len CHECK (source_url IS NULL OR char_length(source_url) <= 500),
  CONSTRAINT media_articles_correction_len CHECK (correction_note IS NULL OR char_length(correction_note) <= 500)
);

CREATE INDEX IF NOT EXISTS media_articles_public_idx
  ON public.media_articles (published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS media_articles_status_idx
  ON public.media_articles (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS media_articles_category_idx
  ON public.media_articles (category, published_at DESC);

CREATE INDEX IF NOT EXISTS media_articles_tags_idx
  ON public.media_articles USING gin (tags);

ALTER TABLE public.media_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_articles_public_read ON public.media_articles;
CREATE POLICY media_articles_public_read ON public.media_articles
  FOR SELECT TO anon, authenticated
  USING (
    (
      status = 'published'
      AND (published_at IS NULL OR published_at <= now())
    )
    OR (
      status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
    )
  );

REVOKE ALL ON TABLE public.media_articles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.media_articles TO anon, authenticated;
GRANT ALL ON TABLE public.media_articles TO service_role;

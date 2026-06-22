-- ============================================================
-- JIMVIO — MIGRATION 063
-- Structured video support for products
--
-- Upgrades migration 061 (simple product_videos) to full metadata.
-- Adds:
--   1. product_videos   — expanded columns (url, platform, vendor_id, …)
--   2. product_media    — unified ordered gallery (images + videos)
--   3. Deprecation note on products.videos JSONB column
--   4. Backfill from products.videos → product_videos
--   5. RLS, indexes, get_product_gallery(), realtime
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Upgrade product_videos (061 → 063)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_videos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  video_url     TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rename legacy column when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_videos'
      AND column_name = 'video_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_videos'
      AND column_name = 'url'
  ) THEN
    ALTER TABLE public.product_videos RENAME COLUMN video_url TO url;
  END IF;
END $$;

-- Ensure url column exists on fresh installs that skipped 061
ALTER TABLE public.product_videos
  ADD COLUMN IF NOT EXISTS url TEXT;

UPDATE public.product_videos
SET url = COALESCE(url, '')
WHERE url IS NULL;

ALTER TABLE public.product_videos
  ALTER COLUMN url SET NOT NULL;

-- New structured columns
ALTER TABLE public.product_videos
  ADD COLUMN IF NOT EXISTS vendor_id          UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title              TEXT,
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url      TEXT,
  ADD COLUMN IF NOT EXISTS platform           TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS platform_video_id  TEXT,
  ADD COLUMN IF NOT EXISTS duration_sec       INT,
  ADD COLUMN IF NOT EXISTS file_size          BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type          TEXT,
  ADD COLUMN IF NOT EXISTS width_px           INT,
  ADD COLUMN IF NOT EXISTS height_px          INT,
  ADD COLUMN IF NOT EXISTS aspect_ratio       TEXT,
  ADD COLUMN IF NOT EXISTS is_primary         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS captions_url       TEXT,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill vendor_id from products
UPDATE public.product_videos pv
SET vendor_id = p.vendor_id
FROM public.products p
WHERE pv.product_id = p.id
  AND pv.vendor_id IS NULL
  AND p.vendor_id IS NOT NULL;

-- First video per product becomes primary when none set
UPDATE public.product_videos pv
SET is_primary = TRUE
FROM (
  SELECT DISTINCT ON (product_id) id
  FROM public.product_videos
  WHERE is_active = TRUE
  ORDER BY product_id, sort_order ASC, created_at ASC
) first_row
WHERE pv.id = first_row.id
  AND NOT EXISTS (
    SELECT 1 FROM public.product_videos x
    WHERE x.product_id = pv.product_id AND x.is_primary = TRUE AND x.is_active = TRUE
  );

-- Platform check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_videos_platform_check'
  ) THEN
    ALTER TABLE public.product_videos
      ADD CONSTRAINT product_videos_platform_check
      CHECK (platform IN ('upload', 'youtube', 'vimeo', 'hls', 'other'));
  END IF;
END $$;

-- Only one primary video per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_videos_primary
  ON public.product_videos(product_id)
  WHERE is_primary = TRUE AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_product_videos_product_id
  ON public.product_videos(product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_product_videos_vendor_id
  ON public.product_videos(vendor_id);

CREATE INDEX IF NOT EXISTS idx_product_videos_platform
  ON public.product_videos(platform);

DROP TRIGGER IF EXISTS update_product_videos_updated_at ON public.product_videos;
CREATE TRIGGER update_product_videos_updated_at
  BEFORE UPDATE ON public.product_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. product_media — unified ordered gallery
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id     UUID NOT NULL REFERENCES public.vendors(id)  ON DELETE CASCADE,

  media_type    TEXT NOT NULL CHECK (media_type IN ('image', 'video')),

  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text      TEXT,

  video_id      UUID REFERENCES public.product_videos(id) ON DELETE CASCADE,

  sort_order    INT NOT NULL DEFAULT 0,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_media_primary
  ON public.product_media(product_id)
  WHERE is_primary = TRUE AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_product_media_product_id
  ON public.product_media(product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_product_media_type
  ON public.product_media(product_id, media_type);

-- ============================================================
-- 3. Backfill: products.videos JSONB → product_videos
--    Skips products that already have product_videos rows.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  v JSONB;
  i INT;
  v_url TEXT;
  v_thumb TEXT;
  v_title TEXT;
BEGIN
  FOR r IN
    SELECT p.id AS pid, p.vendor_id AS vid, p.videos AS vids
    FROM public.products p
    WHERE p.videos IS NOT NULL
      AND jsonb_typeof(p.videos) = 'array'
      AND jsonb_array_length(p.videos) > 0
      AND p.vendor_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.product_videos pv WHERE pv.product_id = p.id
      )
  LOOP
    FOR i IN 0 .. jsonb_array_length(r.vids) - 1 LOOP
      v := r.vids -> i;

      IF jsonb_typeof(v) = 'string' THEN
        v_url   := v #>> '{}';
        v_thumb := NULL;
        v_title := NULL;
      ELSE
        v_url   := v->>'url';
        v_thumb := v->>'thumbnail_url';
        v_title := v->>'title';
      END IF;

      CONTINUE WHEN v_url IS NULL OR trim(v_url) = '';

      INSERT INTO public.product_videos (
        product_id, vendor_id, url, thumbnail_url, title,
        sort_order, is_primary
      ) VALUES (
        r.pid, r.vid, v_url, v_thumb, v_title,
        i, (i = 0)
      );
    END LOOP;
  END LOOP;
END $$;

COMMENT ON COLUMN public.products.videos IS
  'DEPRECATED as of migration 063. Use product_videos table instead. '
  'This column is kept for backward compatibility only.';

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Product videos are publicly viewable" ON public.product_videos;
DROP POLICY IF EXISTS "Vendors can manage own product videos" ON public.product_videos;
DROP POLICY IF EXISTS "product_videos_public_read" ON public.product_videos;
DROP POLICY IF EXISTS "product_videos_vendor_manage" ON public.product_videos;

CREATE POLICY "product_videos_public_read"
  ON public.product_videos FOR SELECT
  USING (
    is_active = TRUE
    AND product_id IN (
      SELECT id FROM public.products
      WHERE status = 'active' AND is_active = TRUE
    )
  );

CREATE POLICY "product_videos_vendor_manage"
  ON public.product_videos FOR ALL
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "product_media_public_read" ON public.product_media;
DROP POLICY IF EXISTS "product_media_vendor_manage" ON public.product_media;

CREATE POLICY "product_media_public_read"
  ON public.product_media FOR SELECT
  USING (
    is_active = TRUE
    AND product_id IN (
      SELECT id FROM public.products
      WHERE status = 'active' AND is_active = TRUE
    )
  );

CREATE POLICY "product_media_vendor_manage"
  ON public.product_media FOR ALL
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- ============================================================
-- 5. get_product_gallery — unified storefront gallery
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_product_gallery(p_product_id UUID)
RETURNS TABLE (
  id            UUID,
  media_type    TEXT,
  url           TEXT,
  thumbnail_url TEXT,
  alt_text      TEXT,
  sort_order    INT,
  is_primary    BOOLEAN,
  platform      TEXT,
  duration_sec  INT,
  aspect_ratio  TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    pm.id,
    'image'::TEXT,
    pm.url,
    pm.thumbnail_url,
    pm.alt_text,
    pm.sort_order,
    pm.is_primary,
    NULL::TEXT,
    NULL::INT,
    NULL::TEXT
  FROM public.product_media pm
  WHERE pm.product_id = p_product_id
    AND pm.media_type = 'image'
    AND pm.is_active = TRUE

  UNION ALL

  SELECT
    pv.id,
    'video'::TEXT,
    pv.url,
    pv.thumbnail_url,
    pv.title,
    pv.sort_order + 1000,
    pv.is_primary,
    pv.platform,
    pv.duration_sec,
    pv.aspect_ratio
  FROM public.product_videos pv
  WHERE pv.product_id = p_product_id
    AND pv.is_active = TRUE

  ORDER BY is_primary DESC, sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_gallery(UUID) TO anon, authenticated;

-- ============================================================
-- 6. Realtime
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.product_videos;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.product_media;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMIT;

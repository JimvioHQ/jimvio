-- ============================================================
-- MIGRATION 043: UGC CAMPAIGN MEDIA (THUMBNAILS & EXAMPLES)
-- ============================================================
-- Enables brands to upload banners, thumbnails, and reference 
-- content for their UGC & Clipping missions.
-- ============================================================

-- 1. Create Media Types
DO $$ BEGIN
    CREATE TYPE ugc_media_type   AS ENUM ('image', 'video', 'file');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ugc_media_usage  AS ENUM ('banner', 'example', 'ad_creative');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ugc_platform_format AS ENUM ('reels', 'tiktok_video', 'youtube_short', 'post', 'story');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Table
CREATE TABLE IF NOT EXISTS public.ugc_campaign_media (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  type              ugc_media_type NOT NULL DEFAULT 'image',
  url               text NOT NULL,
  thumbnail_url     text,
  usage             ugc_media_usage NOT NULL DEFAULT 'example',
  platform_format   ugc_platform_format,
  order_index       integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_ugc_campaign_media_campaign_id ON public.ugc_campaign_media(campaign_id);

-- 4. RLS
ALTER TABLE public.ugc_campaign_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_select_all" 
  ON public.ugc_campaign_media FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "media_insert_own_vendor" 
  ON public.ugc_campaign_media FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ugc_campaigns c
      WHERE c.id = campaign_id AND c.brand_id = (SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- 5. Permissions
GRANT ALL ON public.ugc_campaign_media TO service_role;
GRANT ALL ON public.ugc_campaign_media TO authenticated;

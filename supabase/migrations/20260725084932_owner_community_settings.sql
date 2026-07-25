-- Owner Console Community Settings (additive, production-safe)
-- Extends communities with branding/locale columns + settings JSONB.
-- Authorization resolves through workspace capabilities.

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS accent_color TEXT;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS region TEXT;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS visibility_mode TEXT NOT NULL DEFAULT 'public';

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'communities_visibility_mode_check'
  ) THEN
    ALTER TABLE public.communities
      ADD CONSTRAINT communities_visibility_mode_check
      CHECK (visibility_mode IN (
        'public', 'private', 'invite_only', 'hidden'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_communities_visibility_mode
  ON public.communities(visibility_mode)
  WHERE is_active = true;

-- Soft-delete / archive metadata
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

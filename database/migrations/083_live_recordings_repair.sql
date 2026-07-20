-- Live Studio recordings repair (production-compatible, idempotent)
-- Audited: public.live_recordings already exists with RC4 columns.
-- Do NOT CREATE TABLE. Safe to run twice.

-- Defensive column adds (no-op when already present)
ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS egress_id TEXT;
ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS cloudinary_url TEXT;
ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS byte_size BIGINT;
ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.live_recordings
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.live_recordings
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_live_recordings_session
  ON public.live_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_live_recordings_community
  ON public.live_recordings(community_id, status);
CREATE INDEX IF NOT EXISTS idx_live_recordings_egress
  ON public.live_recordings(egress_id);

ALTER TABLE public.live_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_recordings_select_members ON public.live_recordings;
CREATE POLICY live_recordings_select_members ON public.live_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = live_recordings.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR started_by = auth.uid()
  );

DROP POLICY IF EXISTS live_recordings_insert_host ON public.live_recordings;
CREATE POLICY live_recordings_insert_host ON public.live_recordings
  FOR INSERT WITH CHECK (started_by = auth.uid());

DROP POLICY IF EXISTS live_recordings_update_host ON public.live_recordings;
CREATE POLICY live_recordings_update_host ON public.live_recordings
  FOR UPDATE USING (started_by = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE '083: supabase_realtime publication missing — skipping';
    RETURN;
  END IF;

  IF to_regclass('public.live_recordings') IS NULL THEN
    RAISE NOTICE '083: live_recordings missing — skipping publication';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_recordings'
  ) THEN
    RETURN;
  END IF;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_recordings;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

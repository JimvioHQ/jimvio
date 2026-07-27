-- Creator / independent Live sessions (no community required)
-- Allows authenticated creators to go live without community membership.
-- Does not modify existing rows. Does not drop tables/columns.

-- 1) community_id optional for creator/independent lives
ALTER TABLE public.live_sessions
  ALTER COLUMN community_id DROP NOT NULL;

COMMENT ON COLUMN public.live_sessions.community_id IS
  'Owning community when live is community-scoped. NULL = creator/independent live.';

-- 2) Recordings may belong to creator lives without a community
ALTER TABLE public.live_recordings
  ALTER COLUMN community_id DROP NOT NULL;

COMMENT ON COLUMN public.live_recordings.community_id IS
  'Owning community when applicable. NULL for creator/independent live recordings.';

-- 3) One active creator live per host (community_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_live_sessions_host_one_creator_live
  ON public.live_sessions (host_id)
  WHERE status = 'live' AND community_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_live_sessions_creator_live
  ON public.live_sessions (host_id, status, started_at DESC)
  WHERE community_id IS NULL;

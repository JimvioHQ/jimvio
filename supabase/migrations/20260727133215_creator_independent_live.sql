-- Creator / independent Live sessions (no community required)
ALTER TABLE public.live_sessions
  ALTER COLUMN community_id DROP NOT NULL;

COMMENT ON COLUMN public.live_sessions.community_id IS
  'Owning community when live is community-scoped. NULL = creator/independent live.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_live_sessions_host_one_creator_live
  ON public.live_sessions (host_id)
  WHERE status = 'live' AND community_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_live_sessions_creator_live
  ON public.live_sessions (host_id, status, started_at DESC)
  WHERE community_id IS NULL;

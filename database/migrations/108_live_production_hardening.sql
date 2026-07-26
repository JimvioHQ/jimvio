-- Mirror of supabase/migrations/20260726110000_live_production_hardening.sql

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS total_watch_seconds bigint NOT NULL DEFAULT 0;

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS viewer_sample_sum bigint NOT NULL DEFAULT 0;

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS viewer_sample_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS engagement_events integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_live_sessions_space_one_live
  ON public.live_sessions (space_id)
  WHERE status = 'live' AND space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_live_sessions_space_status
  ON public.live_sessions (space_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_participants_left_at
  ON public.live_session_participants (session_id, left_at)
  WHERE left_at IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_session_signals'
      AND policyname = 'live_signals_select_member'
  ) THEN
    CREATE POLICY live_signals_select_member
      ON public.live_session_signals
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.live_sessions s
          JOIN public.community_memberships m
            ON m.community_id = s.community_id
           AND m.user_id = auth.uid()
           AND m.status = 'active'
          WHERE s.id = live_session_signals.session_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.live_sessions s
          JOIN public.communities c ON c.id = s.community_id
          WHERE s.id = live_session_signals.session_id
            AND c.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_session_signals'
      AND policyname = 'live_signals_insert_self'
  ) THEN
    CREATE POLICY live_signals_insert_self
      ON public.live_session_signals
      FOR INSERT
      TO authenticated
      WITH CHECK (
        from_user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.live_session_participants p
          WHERE p.session_id = live_session_signals.session_id
            AND p.user_id = auth.uid()
            AND p.status = 'joined'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_session_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_signals;
  END IF;
END $$;

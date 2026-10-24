-- Live participant SELECT: session peers must see each other for Realtime
DROP POLICY IF EXISTS live_session_participants_select_session_peers
  ON public.live_session_participants;

CREATE POLICY live_session_participants_select_session_peers
  ON public.live_session_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.live_sessions s
      WHERE s.id = live_session_participants.session_id
        AND (
          s.host_id = auth.uid()
          OR (
            s.community_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.community_memberships m
              WHERE m.community_id = s.community_id
                AND m.user_id = auth.uid()
                AND m.status = 'active'
            )
          )
          OR (
            s.community_id IS NULL
            AND (
              s.privacy = 'public'
              OR EXISTS (
                SELECT 1
                FROM public.live_session_participants me
                WHERE me.session_id = s.id
                  AND me.user_id = auth.uid()
                  AND me.status IN ('joined', 'invited', 'requested')
              )
            )
          )
        )
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime publication missing — skip';
    RETURN;
  END IF;

  IF to_regclass('public.live_session_participants') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'live_session_participants'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
  END IF;

  IF to_regclass('public.community_memberships') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'community_memberships'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_memberships;
  END IF;
END $$;
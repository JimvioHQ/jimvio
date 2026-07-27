-- Creator Live RLS: public / host visibility when community_id IS NULL
-- Ensures session metadata is readable for Creator Live without membership joins.

DROP POLICY IF EXISTS live_sessions_select_creator_public ON public.live_sessions;
CREATE POLICY live_sessions_select_creator_public
  ON public.live_sessions
  FOR SELECT
  TO authenticated
  USING (
    community_id IS NULL
    AND (
      host_id = auth.uid()
      OR privacy = 'public'
      OR EXISTS (
        SELECT 1
        FROM public.live_session_participants p
        WHERE p.session_id = live_sessions.id
          AND p.user_id = auth.uid()
          AND p.status IN ('joined', 'invited', 'requested')
      )
    )
  );

DROP POLICY IF EXISTS live_sessions_insert_creator_host ON public.live_sessions;
CREATE POLICY live_sessions_insert_creator_host
  ON public.live_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id = auth.uid()
    AND community_id IS NULL
  );

COMMENT ON POLICY live_sessions_select_creator_public ON public.live_sessions IS
  'Creator / independent lives (null community_id) visible to host, public audience, or participants.';

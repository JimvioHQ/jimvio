-- Fix recursive RLS evaluation on the two tables published to Supabase Realtime.
-- Private SECURITY DEFINER helpers avoid recursive policy evaluation.
CREATE OR REPLACE FUNCTION private.can_read_live_session(
  p_session_id uuid,
  p_host_id uuid,
  p_community_id uuid,
  p_privacy text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    p_privacy = 'public'
    OR (
      auth.uid() IS NOT NULL
      AND (
        p_host_id = auth.uid()
        OR (
          p_community_id IS NOT NULL
          AND private.is_active_community_member(p_community_id, auth.uid())
        )
        OR (
          p_community_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.live_session_participants AS participant
            WHERE participant.session_id = p_session_id
              AND participant.user_id = auth.uid()
              AND participant.status = ANY (ARRAY['joined', 'invited', 'requested']::text[])
          )
        )
      )
    );
$function$;

CREATE OR REPLACE FUNCTION private.can_read_live_session_participant(
  p_session_id uuid,
  p_participant_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    (auth.uid() IS NOT NULL AND p_participant_user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.live_sessions AS session
      WHERE session.id = p_session_id
        AND private.can_read_live_session(
          session.id,
          session.host_id,
          session.community_id,
          session.privacy
        )
    );
$function$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;
REVOKE ALL ON FUNCTION private.can_read_live_session(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_read_live_session_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_read_live_session(uuid, uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_live_session_participant(uuid, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS live_sessions_select_creator_public ON public.live_sessions;
DROP POLICY IF EXISTS live_sessions_select_members ON public.live_sessions;
DROP POLICY IF EXISTS live_sessions_visible_to_space_members ON public.live_sessions;
CREATE POLICY live_sessions_select_visible
  ON public.live_sessions
  FOR SELECT
  TO public
  USING (private.can_read_live_session(id, host_id, community_id, privacy));

DROP POLICY IF EXISTS live_session_participants_select_members ON public.live_session_participants;
DROP POLICY IF EXISTS live_session_participants_select_session_peers ON public.live_session_participants;
DROP POLICY IF EXISTS participants_visible_to_session_members ON public.live_session_participants;
CREATE POLICY live_session_participants_select_visible
  ON public.live_session_participants
  FOR SELECT
  TO public
  USING (private.can_read_live_session_participant(session_id, user_id));

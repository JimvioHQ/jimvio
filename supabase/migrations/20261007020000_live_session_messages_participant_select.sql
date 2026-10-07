-- Live chat realtime: joined participants must SELECT live_session_messages
-- so postgres_changes delivers to every connected Live member (not only
-- public-session viewers / community members / host).

DROP POLICY IF EXISTS messages_visible_to_session_members ON public.live_session_messages;

CREATE POLICY messages_visible_to_session_members
  ON public.live_session_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.live_sessions ls
      WHERE ls.id = live_session_messages.session_id
        AND (
          ls.privacy = 'public'
          OR ls.host_id = auth.uid()
          OR (
            ls.privacy = ANY (ARRAY['private'::text, 'members_only'::text, 'invite_only'::text])
            AND ls.community_id IN (
              SELECT community_memberships.community_id
              FROM public.community_memberships
              WHERE community_memberships.user_id = auth.uid()
                AND community_memberships.status = 'active'
            )
          )
          OR EXISTS (
            SELECT 1
            FROM public.live_session_participants p
            WHERE p.session_id = ls.id
              AND p.user_id = auth.uid()
              AND p.status IN ('joined', 'invited')
          )
        )
    )
  );

-- Ensure INSERT policy also allows joined participants (idempotent recreate).
DROP POLICY IF EXISTS participants_send_messages ON public.live_session_messages;

CREATE POLICY participants_send_messages
  ON public.live_session_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.live_session_participants p
      WHERE p.session_id = live_session_messages.session_id
        AND p.user_id = auth.uid()
        AND p.status IN ('joined', 'invited')
    )
  );

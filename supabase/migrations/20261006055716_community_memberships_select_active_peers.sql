-- Active community members can SELECT peer memberships (roster + realtime join/leave).
DROP POLICY IF EXISTS memberships_select_active_peers ON public.community_memberships;

CREATE POLICY memberships_select_active_peers
  ON public.community_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_memberships me
      WHERE me.community_id = community_memberships.community_id
        AND me.user_id = auth.uid()
        AND me.status = 'active'
    )
  );
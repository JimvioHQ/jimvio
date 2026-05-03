-- community_memberships policies used EXISTS (SELECT ... FROM community_memberships m ...),
-- which re-evaluates the same table's policies → "infinite recursion detected in policy".
-- Fix: never reference community_memberships inside its own policy. Use:
--   - own row: user_id = auth.uid()
--   - community owner: EXISTS (communities WHERE owner_id = auth.uid())
-- (Non-owner admins/moderators rely on service role / API for bulk member tools.)

DROP POLICY IF EXISTS "memberships_select_own_or_staff" ON public.community_memberships;
DROP POLICY IF EXISTS "memberships_update_own_or_staff" ON public.community_memberships;

CREATE POLICY "memberships_select_own_or_staff"
  ON public.community_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_memberships.community_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "memberships_update_own_or_staff"
  ON public.community_memberships FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_memberships.community_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_memberships.community_id
        AND c.owner_id = auth.uid()
    )
  );

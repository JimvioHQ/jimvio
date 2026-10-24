-- Fix infinite recursion: memberships_select_active_peers queried
-- community_memberships from inside a community_memberships SELECT policy.
-- Replace with SECURITY DEFINER helper that bypasses RLS for a boolean check only.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.is_active_community_member(
  p_community_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_memberships m
    WHERE m.community_id = p_community_id
      AND m.user_id = p_user_id
      AND m.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_community_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_active_community_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_community_member(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS memberships_select_active_peers ON public.community_memberships;

CREATE POLICY memberships_select_active_peers
  ON public.community_memberships
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND private.is_active_community_member(
      community_memberships.community_id,
      auth.uid()
    )
  );

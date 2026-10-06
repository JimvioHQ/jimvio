-- Fix infinite recursion in community_memberships SELECT.
-- memberships_select_active_peers previously did:
--   EXISTS (SELECT 1 FROM community_memberships me WHERE ...)
-- which re-entered the same RLS policy.
--
-- SECURITY DEFINER helper in schema private bypasses RLS for a boolean
-- membership check only. search_path is empty. EXECUTE is granted to
-- authenticated (needed for policy evaluation) but not anon.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, authenticated;

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
REVOKE ALL ON FUNCTION private.is_active_community_member(uuid, uuid) FROM anon;
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

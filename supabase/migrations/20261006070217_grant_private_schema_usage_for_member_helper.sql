GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE ALL ON FUNCTION private.is_active_community_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_active_community_member(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION private.is_active_community_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_community_member(uuid, uuid) TO service_role;
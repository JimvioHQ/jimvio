-- Lock the 2026-10-05 community-feed curation backup.
--
-- public.jimvio_ops_post_cleanup_20261005 was created outside migrations
-- (scripts/ops/curate-community-feed-cleanup.mjs) in the exposed public schema
-- with RLS off. Default privileges then granted ALL to anon and authenticated,
-- so PostgREST could read and mutate every archived-post snapshot.
--
-- The only legitimate caller is that ops script, which uses the service role.
-- service_role bypasses RLS and keeps its grants. anon and authenticated get
-- no policies and no table privileges (TRUNCATE is not covered by RLS).

ALTER TABLE public.jimvio_ops_post_cleanup_20261005 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_ops_post_cleanup_20261005 FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.jimvio_ops_post_cleanup_20261005 FROM PUBLIC;
REVOKE ALL ON TABLE public.jimvio_ops_post_cleanup_20261005 FROM anon;
REVOKE ALL ON TABLE public.jimvio_ops_post_cleanup_20261005 FROM authenticated;

GRANT ALL ON TABLE public.jimvio_ops_post_cleanup_20261005 TO service_role;

COMMENT ON TABLE public.jimvio_ops_post_cleanup_20261005 IS
  'Service-role-only backup of community posts archived by the 2026-10-05 feed curation. RLS is forced. No anon or authenticated policies or grants.';

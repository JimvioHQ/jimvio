-- Keep social verification challenges private.
-- Direct table access is unnecessary: public creator/profile reads use trusted
-- server-side service-role routes and map rows to an explicit safe response.
-- Account owners retain their existing jip_social_own RLS policy.
REVOKE SELECT ON TABLE public.jip_social_accounts FROM anon, authenticated;
DROP POLICY IF EXISTS jip_social_select ON public.jip_social_accounts;

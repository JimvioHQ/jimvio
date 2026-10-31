-- Keep social verification challenges private.
-- The owner policy remains available to authenticated account owners.
-- Public creator/profile reads use trusted server-side service-role routes and
-- explicit response mappers, not direct table SELECT access.

REVOKE SELECT ON TABLE public.jip_social_accounts FROM anon, authenticated;
DROP POLICY IF EXISTS jip_social_select ON public.jip_social_accounts;

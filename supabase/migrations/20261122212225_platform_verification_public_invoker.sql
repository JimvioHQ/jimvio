-- Remove the SECURITY DEFINER public view without exposing private review data.
-- Public and signed-in users may see only the seven status-projection columns.
-- The grants table remains RLS protected; evidence and audit tables stay server-only.

SET lock_timeout = '5s';

ALTER TABLE public.platform_verification_grants ENABLE ROW LEVEL SECURITY;

-- The caller needs only the columns projected by the public view. Remove the
-- prior table-level grant, then grant the safe projection columns explicitly.
REVOKE ALL PRIVILEGES ON TABLE public.platform_verification_grants FROM PUBLIC, anon, authenticated;
REVOKE SELECT (
  id, entity_type, entity_id, category, status, decided_at, expires_at
) ON TABLE public.platform_verification_grants FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, entity_type, entity_id, category, status, decided_at, expires_at
) ON TABLE public.platform_verification_grants TO anon, authenticated;

-- Keep public visibility restricted to current verified grants. The existing
-- owner policy still lets an applicant read their own status row.
DROP POLICY IF EXISTS platform_verification_grants_public_verified_read
  ON public.platform_verification_grants;
CREATE POLICY platform_verification_grants_public_verified_read
  ON public.platform_verification_grants
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'verified'
    AND (expires_at IS NULL OR expires_at > now())
  );

-- SECURITY INVOKER causes the view to obey the caller's column grants and RLS.
CREATE OR REPLACE VIEW public.platform_verification_public
WITH (security_invoker = true)
AS
SELECT
  id,
  entity_type,
  entity_id,
  category,
  status,
  decided_at,
  expires_at
FROM public.platform_verification_grants
WHERE status = 'verified'
  AND (expires_at IS NULL OR expires_at > now());

REVOKE ALL PRIVILEGES ON public.platform_verification_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_verification_public TO anon, authenticated;

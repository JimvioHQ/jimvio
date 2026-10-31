-- Keep social verification challenges private.
-- Public creator profiles are served through server-side identity resolution,
-- which maps social rows to an explicit safe response shape. Direct Data API
-- reads must remain limited to the account owner because this table also
-- stores one-time verification codes and verification notes.
DROP POLICY IF EXISTS jip_social_select ON public.jip_social_accounts;

-- jip_social_own (FOR ALL USING/WITH CHECK user_id = auth.uid()) remains the
-- sole client-facing policy. Service-role server reads used by public profile
-- rendering and the social API are unaffected by RLS.

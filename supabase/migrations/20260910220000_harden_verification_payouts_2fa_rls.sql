-- Production security harden: stop client self-verify / self-complete payouts / 2FA secret theft.
-- Idempotent. Non-destructive. Preserves existing rows.
--
-- Live evidence (vsfhwfimudpdipdkxbww):
--   payouts_update USING (auth.uid() = user_id) — clients can set status=paid
--   jip_identity_own FOR ALL — clients can set identity_verified=true
--   vendors_update unrestricted — clients can set verification_status
--   profiles_update unrestricted — clients can set is_verified / two_factor_enabled
--   users_manage_own_2fa FOR ALL — clients can SELECT secret + backup_codes

-- ── payouts: users may SELECT/INSERT pending only; never UPDATE status ──────

DROP POLICY IF EXISTS payouts_update ON public.payouts;
DROP POLICY IF EXISTS payouts_insert ON public.payouts;
DROP POLICY IF EXISTS payouts_select ON public.payouts;

CREATE POLICY payouts_select_own ON public.payouts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY payouts_insert_own_pending ON public.payouts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status::text IN ('pending', 'processing')
  );

REVOKE ALL ON TABLE public.payouts FROM PUBLIC;
REVOKE ALL ON TABLE public.payouts FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.payouts FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.payouts TO authenticated;
GRANT ALL ON TABLE public.payouts TO service_role;

CREATE OR REPLACE FUNCTION public.reject_client_payout_status_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role IN ('anon', 'authenticated') THEN
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION
        'Refusing payouts UPDATE by JWT role %. Payout status is server-side only.',
        jwt_role
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.status::text NOT IN ('pending', 'processing') THEN
      RAISE EXCEPTION
        'Refusing payout insert with status %. Clients may only create pending/processing payouts.',
        NEW.status
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.reject_client_payout_status_write() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reject_client_payout_status_write() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_client_payout_status_write() TO postgres;
GRANT EXECUTE ON FUNCTION public.reject_client_payout_status_write() TO service_role;

DROP TRIGGER IF EXISTS trg_reject_client_payout_status_write ON public.payouts;
CREATE TRIGGER trg_reject_client_payout_status_write
  BEFORE INSERT OR UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_client_payout_status_write();

-- ── user_2fa_secrets: no client access (service_role / DEFINER only) ───────

DROP POLICY IF EXISTS users_manage_own_2fa ON public.user_2fa_secrets;
DROP POLICY IF EXISTS user_2fa_secrets_select_own ON public.user_2fa_secrets;
DROP POLICY IF EXISTS user_2fa_secrets_insert_own ON public.user_2fa_secrets;
DROP POLICY IF EXISTS user_2fa_secrets_update_own ON public.user_2fa_secrets;
DROP POLICY IF EXISTS user_2fa_secrets_delete_own ON public.user_2fa_secrets;

ALTER TABLE public.user_2fa_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_2fa_secrets FROM PUBLIC;
REVOKE ALL ON TABLE public.user_2fa_secrets FROM anon;
REVOKE ALL ON TABLE public.user_2fa_secrets FROM authenticated;
GRANT ALL ON TABLE public.user_2fa_secrets TO service_role;

CREATE OR REPLACE FUNCTION public.reject_client_2fa_secrets_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION
      'Refusing user_2fa_secrets % by JWT role %. 2FA secrets are server-side only.',
      TG_OP, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.reject_client_2fa_secrets_write() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reject_client_2fa_secrets_write() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_client_2fa_secrets_write() TO postgres;
GRANT EXECUTE ON FUNCTION public.reject_client_2fa_secrets_write() TO service_role;

DROP TRIGGER IF EXISTS trg_reject_client_2fa_secrets_write ON public.user_2fa_secrets;
CREATE TRIGGER trg_reject_client_2fa_secrets_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_2fa_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_client_2fa_secrets_write();

-- ── Protect privileged profile / vendor / identity columns ─────────────────

CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role IN ('anon', 'authenticated') THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
      RAISE EXCEPTION 'Refusing client update of profiles.is_verified'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.two_factor_enabled IS DISTINCT FROM OLD.two_factor_enabled THEN
      RAISE EXCEPTION 'Refusing client update of profiles.two_factor_enabled'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Refusing client update of profiles.is_active'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.protect_privileged_profile_columns() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.protect_privileged_profile_columns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_privileged_profile_columns() TO postgres;
GRANT EXECUTE ON FUNCTION public.protect_privileged_profile_columns() TO service_role;

DROP TRIGGER IF EXISTS trg_protect_privileged_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_privileged_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_privileged_profile_columns();

CREATE OR REPLACE FUNCTION public.protect_privileged_vendor_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role IN ('anon', 'authenticated') THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      RAISE EXCEPTION 'Refusing client update of vendors.verification_status'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
      RAISE EXCEPTION 'Refusing client update of vendors.verified_at'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.verification_notes IS DISTINCT FROM OLD.verification_notes THEN
      RAISE EXCEPTION 'Refusing client update of vendors.verification_notes'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.protect_privileged_vendor_columns() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.protect_privileged_vendor_columns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_privileged_vendor_columns() TO postgres;
GRANT EXECUTE ON FUNCTION public.protect_privileged_vendor_columns() TO service_role;

DROP TRIGGER IF EXISTS trg_protect_privileged_vendor_columns ON public.vendors;
CREATE TRIGGER trg_protect_privileged_vendor_columns
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_privileged_vendor_columns();

CREATE OR REPLACE FUNCTION public.protect_privileged_jip_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role IN ('anon', 'authenticated') THEN
    IF NEW.identity_verified IS DISTINCT FROM OLD.identity_verified THEN
      RAISE EXCEPTION 'Refusing client update of jip_identity.identity_verified'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.documents_verified IS DISTINCT FROM OLD.documents_verified THEN
      RAISE EXCEPTION 'Refusing client update of jip_identity.documents_verified'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.social_verified IS DISTINCT FROM OLD.social_verified THEN
      RAISE EXCEPTION 'Refusing client update of jip_identity.social_verified'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Refusing client update of jip_identity.status'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.protect_privileged_jip_identity_columns() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.protect_privileged_jip_identity_columns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_privileged_jip_identity_columns() TO postgres;
GRANT EXECUTE ON FUNCTION public.protect_privileged_jip_identity_columns() TO service_role;

DROP TRIGGER IF EXISTS trg_protect_privileged_jip_identity_columns ON public.jip_identity;
CREATE TRIGGER trg_protect_privileged_jip_identity_columns
  BEFORE UPDATE ON public.jip_identity
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_privileged_jip_identity_columns();

-- Tighten jip_identity: own SELECT/INSERT only; no unrestricted FOR ALL updates of verified flags.
DROP POLICY IF EXISTS jip_identity_own ON public.jip_identity;

CREATE POLICY jip_identity_select_own ON public.jip_identity
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY jip_identity_insert_own ON public.jip_identity
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND COALESCE(identity_verified, false) = false
    AND COALESCE(documents_verified, false) = false
    AND COALESCE(social_verified, false) = false
  );

CREATE POLICY jip_identity_update_own_nonprivileged ON public.jip_identity
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- anon SELECT grant on wallet_deposits is unnecessary surface
REVOKE ALL ON TABLE public.wallet_deposits FROM anon;

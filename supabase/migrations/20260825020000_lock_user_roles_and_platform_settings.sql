-- Phase 6: fail-closed user_roles writes + platform_settings public allowlist.
-- Applied name: lock_user_roles_and_platform_settings
-- Canonical application copy: database/migrations/129_lock_user_roles_and_platform_settings.sql
--
-- Evidence:
--   user_roles_insert WITH CHECK (auth.uid() = user_id) — no role restriction
--   user_roles_update / user_roles_delete USING (auth.uid() = user_id)
--   GRANT ALL on user_roles TO anon, authenticated
--   platform_settings_select USING (true) OR'd with a weaker filter policy
--   GRANT ALL on platform_settings TO anon, authenticated
--
-- Does not restore data. Does not insert users. Does not grant admin.
-- Signup still provisions role='buyer' via handle_new_user / recover_profile_for_auth_user
-- (SECURITY DEFINER / service_role). There is no user_role enum value 'user'.

-- ── user_roles: no client writes ───────────────────────────────────────────

DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
DROP POLICY IF EXISTS "users_manage_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS users_manage_own_roles ON public.user_roles;

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;

CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.user_roles FROM anon;
REVOKE ALL ON TABLE public.user_roles FROM authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.reject_client_user_roles_write()
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
      'Refusing user_roles % by JWT role %. Role assignment is server-side only.',
      TG_OP, jwt_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.reject_client_user_roles_write() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reject_client_user_roles_write() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_client_user_roles_write() TO postgres;
GRANT EXECUTE ON FUNCTION public.reject_client_user_roles_write() TO service_role;

DROP TRIGGER IF EXISTS trg_reject_client_user_roles_write ON public.user_roles;
CREATE TRIGGER trg_reject_client_user_roles_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_client_user_roles_write();

-- ── platform_settings: explicit public allowlist only ──────────────────────

DROP POLICY IF EXISTS platform_settings_select ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_select_public ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_insert ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_update ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_delete ON public.platform_settings;

CREATE POLICY platform_settings_select_public_allowlist ON public.platform_settings
  FOR SELECT TO anon, authenticated
  USING (
    key = ANY (
      ARRAY[
        'fees',
        'social_proof',
        'marketing',
        'contact',
        'payment_providers'
      ]::text[]
    )
  );

REVOKE ALL ON TABLE public.platform_settings FROM anon;
REVOKE ALL ON TABLE public.platform_settings FROM authenticated;
GRANT SELECT ON TABLE public.platform_settings TO anon;
GRANT SELECT ON TABLE public.platform_settings TO authenticated;
GRANT ALL ON TABLE public.platform_settings TO service_role;

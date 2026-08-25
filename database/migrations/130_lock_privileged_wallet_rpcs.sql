-- Phase 8: lock privileged wallet/role RPCs and sensitive table grants.
-- Canonical copy: supabase/migrations/20260825080000_lock_privileged_wallet_rpcs.sql
-- Twin: database/migrations/130_lock_privileged_wallet_rpcs.sql
--
-- Does NOT:
--   modify wallet balances, orders, products, communities, payments
--   mutate auth.users
--   DELETE / UPDATE / TRUNCATE application rows
--   restore or reset data
--   rotate secrets
--
-- Evidence (production vsfhwfimudpdipdkxbww):
--   increment_wallet_balance SECURITY DEFINER, no search_path, EXECUTE PUBLIC (acl null)
--   add_video_earnings SECURITY DEFINER, no search_path, EXECUTE PUBLIC (acl null)
--   get_user_roles SECURITY DEFINER, EXECUTE PUBLIC + anon + authenticated
--   platform_secrets GRANT ALL to anon/authenticated
--   wallets / wallet_deposits GRANT ALL to anon/authenticated

-- ── increment_wallet_balance: service_role only ────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_wallet_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'increment_wallet_balance is restricted to service_role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_wallet_id IS NULL OR p_amount IS NULL THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;

  UPDATE public.wallets
  SET available_balance = available_balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;
END;
$$;

ALTER FUNCTION public.increment_wallet_balance(uuid, numeric) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.increment_wallet_balance(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_wallet_balance(uuid, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.increment_wallet_balance(uuid, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, numeric) TO postgres;
GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, numeric) TO service_role;

-- ── add_video_earnings: service_role only ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_video_earnings(vid uuid, amt numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'add_video_earnings is restricted to service_role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF vid IS NULL OR amt IS NULL THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;

  UPDATE public.short_videos SET total_earnings = total_earnings + amt WHERE id = vid;
END;
$$;

ALTER FUNCTION public.add_video_earnings(uuid, numeric) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.add_video_earnings(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_video_earnings(uuid, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.add_video_earnings(uuid, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.add_video_earnings(uuid, numeric) TO postgres;
GRANT EXECUTE ON FUNCTION public.add_video_earnings(uuid, numeric) TO service_role;

-- ── get_user_roles: caller may only look up self (or service_role) ─────────

CREATE OR REPLACE FUNCTION public.get_user_roles(lookup_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  roles_out TEXT[] := ARRAY['buyer'::TEXT];
  rec RECORD;
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role = 'service_role' THEN
    NULL;
  ELSIF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM lookup_user_id THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  FOR rec IN (SELECT role::TEXT AS r FROM public.user_roles WHERE user_id = lookup_user_id AND is_active = TRUE) LOOP
    IF NOT (rec.r = ANY(roles_out)) THEN roles_out := array_append(roles_out, rec.r); END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.vendors WHERE user_id = lookup_user_id) THEN
    IF NOT ('vendor' = ANY(roles_out)) THEN roles_out := array_append(roles_out, 'vendor'::TEXT); END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = lookup_user_id) THEN
    IF NOT ('affiliate' = ANY(roles_out)) THEN roles_out := array_append(roles_out, 'affiliate'::TEXT); END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.influencers WHERE user_id = lookup_user_id) THEN
    IF NOT ('influencer' = ANY(roles_out)) THEN roles_out := array_append(roles_out, 'influencer'::TEXT); END IF;
  END IF;
  RETURN roles_out;
END;
$$;

ALTER FUNCTION public.get_user_roles(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_roles(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO postgres;

-- ── encrypt/decrypt token: fixed search_path (EXECUTE already service_role) ─

ALTER FUNCTION public.encrypt_token(text) SET search_path TO 'public';
ALTER FUNCTION public.decrypt_token(text) SET search_path TO 'public';

-- ── trigger helpers: fixed search_path, no PUBLIC RPC ───────────────────────

ALTER FUNCTION public.protect_financial_fields() SET search_path TO 'public';
REVOKE ALL ON FUNCTION public.protect_financial_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_financial_fields() TO postgres;

ALTER FUNCTION public.guard_wallet_mutations() SET search_path TO 'public';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- ── sensitive table grants ─────────────────────────────────────────────────

REVOKE ALL ON TABLE public.platform_secrets FROM anon;
REVOKE ALL ON TABLE public.platform_secrets FROM authenticated;
GRANT ALL ON TABLE public.platform_secrets TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.wallets FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.wallets FROM authenticated;
GRANT SELECT ON TABLE public.wallets TO authenticated;
GRANT ALL ON TABLE public.wallets TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.wallet_deposits FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.wallet_deposits FROM authenticated;
GRANT SELECT ON TABLE public.wallet_deposits TO authenticated;
GRANT ALL ON TABLE public.wallet_deposits TO service_role;

-- Twin of supabase/migrations/20260905060000_fix_guard_wallet_mutations_secret_keys.sql

-- Align wallet mutation guard with increment_wallet_balance auth checks.
-- New Supabase secret keys (sb_secret_*) set auth.role() = service_role
-- but do not populate legacy request.jwt.claim.role, which blocked all
-- wallets UPDATEs (deposits, withdrawals, currency normalize).
-- Applied to production vsfhwfimudpdipdkxbww as
-- fix_guard_wallet_mutations_for_secret_keys.

CREATE OR REPLACE FUNCTION public.guard_wallet_mutations()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    auth.jwt() ->> 'role',
    auth.role(),
    ''
  );
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- SECURITY DEFINER RPCs owned by postgres (e.g. increment_wallet_balance)
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Wallets can only be modified by service_role (via increment_wallet_balance or admin tools)';
END;
$function$;

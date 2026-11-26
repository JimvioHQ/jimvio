-- Owner-scoped access to private profile and vendor fields.
CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p.*
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_my_private_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_vendors()
RETURNS SETOF public.vendors
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT v.*
  FROM public.vendors AS v
  WHERE v.user_id = auth.uid()
  ORDER BY v.is_active DESC, v.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_my_vendors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_vendors() TO authenticated;

COMMENT ON FUNCTION public.get_my_private_profile() IS
  'Returns the authenticated caller own profile row, including private fields; no user id argument is accepted.';
COMMENT ON FUNCTION public.get_my_vendors() IS
  'Returns only vendor rows owned by the authenticated caller, including private payout and verification fields.';

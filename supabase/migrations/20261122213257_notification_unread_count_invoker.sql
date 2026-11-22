CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
  SELECT count(*)::bigint
  FROM public.notifications
  WHERE user_id = p_user_id
    AND (
      p_user_id = auth.uid()
      OR coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    )
    AND coalesce(is_read, false) = false
    AND archived_at IS NULL;
$function$;

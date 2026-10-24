-- Honor Space/Room postingMode on discussion rooms (admin-only messaging).
-- Twin: database/migrations/138_space_discussion_posting_rls.sql

CREATE OR REPLACE FUNCTION public.community_room_effective_posting_mode(p_room_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(r.permission_config->>'postingMode', ''),
    nullif(s.permission_config->>'postingMode', ''),
    'everyone'
  )
  FROM public.rooms r
  LEFT JOIN public.spaces s ON s.id = r.space_id
  WHERE r.id = p_room_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.community_room_is_open_discussion(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms r
    WHERE r.id = p_room_id
      AND (
        r.channel_kind = 'discussion'
        OR (
          lower(coalesce(r.room_type, '')) = 'chat'
          AND lower(coalesce(r.slug, '')) IN ('discussion', 'general', 'chat', 'lounge')
        )
      )
      AND public.community_room_effective_posting_mode(p_room_id) NOT IN (
        'admins_only',
        'admins_moderators'
      )
  );
$$;

REVOKE ALL ON FUNCTION public.community_room_effective_posting_mode(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_room_effective_posting_mode(uuid) TO authenticated;

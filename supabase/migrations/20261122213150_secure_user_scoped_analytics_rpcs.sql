SET lock_timeout = '5s';

-- Notification counts are scoped to the authenticated subject. Trusted service-role
-- callers may still request a count for an explicit user ID.
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
  SELECT count(*)::bigint
  FROM public.notifications
  WHERE user_id = p_user_id
    AND (
      coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      OR user_id = auth.uid()
    )
    AND (
      coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      OR p_user_id = auth.uid()
    )
    AND coalesce(is_read, false) = false
    AND archived_at IS NULL;
$function$;

-- Community post view writes are performed only by the authenticated server route
-- after it validates the post's public/member visibility and session.
REVOKE ALL ON FUNCTION public.record_community_post_view(uuid, uuid, text, integer, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_community_post_view(uuid, uuid, text, integer, numeric)
  TO service_role;

-- Affiliate click writes are performed by server routes/server actions through
-- createServiceRoleClient; callers must not be able to forge affiliate IDs or counters.
REVOKE ALL ON FUNCTION public.record_affiliate_click(uuid, uuid, uuid, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(uuid, uuid, uuid, text, text, text, text, text)
  TO service_role;

-- Story views may be submitted by the signed-in viewer, but the user ID must come
-- from auth.uid(). The same privacy gates used by the visible-story RLS policy
-- are enforced again inside this SECURITY DEFINER write function.
CREATE OR REPLACE FUNCTION public.record_community_story_view(
  p_story_id uuid,
  p_user_id uuid,
  p_watch_ms integer DEFAULT 0,
  p_completion_pct numeric DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  existing_id uuid;
  is_new boolean := false;
  story_author uuid;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_story_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT s.author_id
    INTO story_author
  FROM public.community_stories s
  WHERE s.id = p_story_id
    AND s.expires_at > now()
    AND (
      s.privacy IN ('public', 'followers')
      OR (
        s.privacy = 'community'
        AND s.community_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.community_memberships m
          WHERE m.community_id = s.community_id
            AND m.user_id = p_user_id
            AND m.status = 'active'
        )
      )
    )
  LIMIT 1;

  IF story_author IS NULL OR story_author = p_user_id THEN
    RETURN false;
  END IF;

  SELECT id INTO existing_id
  FROM public.community_story_views
  WHERE story_id = p_story_id
    AND user_id = p_user_id
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO public.community_story_views (story_id, user_id, watch_ms, completion_pct)
    VALUES (
      p_story_id,
      p_user_id,
      greatest(p_watch_ms, 0),
      least(greatest(p_completion_pct, 0), 100)
    );
    is_new := true;
  ELSE
    UPDATE public.community_story_views
    SET
      watch_ms = greatest(watch_ms, greatest(p_watch_ms, 0)),
      completion_pct = greatest(completion_pct, least(greatest(p_completion_pct, 0), 100))
    WHERE id = existing_id;
  END IF;

  IF is_new THEN
    UPDATE public.community_stories
    SET
      view_count = coalesce(view_count, 0) + 1,
      unique_view_count = coalesce(unique_view_count, 0) + 1,
      updated_at = now()
    WHERE id = p_story_id;
  END IF;

  INSERT INTO public.community_story_analytics AS a (
    story_id, author_id, views, unique_viewers, replies, avg_watch_ms, avg_completion_pct
  )
  SELECT
    p_story_id,
    story_author,
    coalesce(s.view_count, 0),
    coalesce(s.unique_view_count, 0),
    coalesce(s.reply_count, 0),
    coalesce(
      (SELECT avg(watch_ms)::int FROM public.community_story_views WHERE story_id = p_story_id),
      0
    ),
    coalesce(
      (SELECT avg(completion_pct) FROM public.community_story_views WHERE story_id = p_story_id),
      0
    )
  FROM public.community_stories s
  WHERE s.id = p_story_id
  ON CONFLICT (story_id) DO UPDATE
  SET
    views = excluded.views,
    unique_viewers = excluded.unique_viewers,
    replies = excluded.replies,
    avg_watch_ms = excluded.avg_watch_ms,
    avg_completion_pct = excluded.avg_completion_pct,
    updated_at = now();

  RETURN is_new;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_community_story_view(uuid, uuid, integer, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_community_story_view(uuid, uuid, integer, numeric)
  TO authenticated, service_role;

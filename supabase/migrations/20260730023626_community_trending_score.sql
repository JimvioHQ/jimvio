-- Community trending score for Creator OS discover rail.
-- Ranks active communities by members, posts, recent activity, presence, and featured boost.

CREATE OR REPLACE FUNCTION public.community_trending_score(
  p_member_count integer,
  p_post_count integer,
  p_is_featured boolean,
  p_recent_posts integer DEFAULT 0,
  p_recent_joins integer DEFAULT 0,
  p_online_members integer DEFAULT 0
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    ln(1 + greatest(coalesce(p_member_count, 0), 0)) * 3.0
    + ln(1 + greatest(coalesce(p_post_count, 0), 0)) * 2.0
    + ln(1 + greatest(coalesce(p_recent_posts, 0), 0)) * 4.0
    + ln(1 + greatest(coalesce(p_recent_joins, 0), 0)) * 3.5
    + ln(1 + greatest(coalesce(p_online_members, 0), 0)) * 2.5
    + CASE WHEN coalesce(p_is_featured, false) THEN 8.0 ELSE 0.0 END;
$$;

CREATE OR REPLACE FUNCTION public.get_trending_communities(p_limit integer DEFAULT 8)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  category text,
  cover_image text,
  avatar_url text,
  member_count integer,
  post_count integer,
  is_featured boolean,
  online_members integer,
  trending_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bound AS (
    SELECT greatest(1, least(coalesce(p_limit, 8), 24)) AS lim
  ),
  recent_posts AS (
    SELECT
      cp.community_id,
      count(*)::integer AS cnt
    FROM public.community_posts cp
    WHERE coalesce(cp.is_published, true) = true
      AND coalesce(cp.created_at, cp.published_at, now()) >= now() - interval '14 days'
    GROUP BY cp.community_id
  ),
  recent_joins AS (
    SELECT
      cm.community_id,
      count(*)::integer AS cnt
    FROM public.community_memberships cm
    WHERE cm.status = 'active'
      AND coalesce(cm.subscribed_at, cm.created_at, now()) >= now() - interval '14 days'
    GROUP BY cm.community_id
  ),
  online AS (
    SELECT
      mp.community_id,
      count(*)::integer AS cnt
    FROM public.member_points mp
    WHERE mp.last_active_at >= now() - interval '15 minutes'
    GROUP BY mp.community_id
  )
  SELECT
    c.id,
    c.name,
    c.slug,
    c.category,
    c.cover_image,
    c.avatar_url,
    coalesce(c.member_count, 0)::integer AS member_count,
    coalesce(c.post_count, 0)::integer AS post_count,
    coalesce(c.is_featured, false) AS is_featured,
    coalesce(o.cnt, 0)::integer AS online_members,
    public.community_trending_score(
      coalesce(c.member_count, 0),
      coalesce(c.post_count, 0),
      coalesce(c.is_featured, false),
      coalesce(rp.cnt, 0),
      coalesce(rj.cnt, 0),
      coalesce(o.cnt, 0)
    ) AS trending_score
  FROM public.communities c
  CROSS JOIN bound b
  LEFT JOIN recent_posts rp ON rp.community_id = c.id
  LEFT JOIN recent_joins rj ON rj.community_id = c.id
  LEFT JOIN online o ON o.community_id = c.id
  WHERE coalesce(c.is_active, true) = true
  ORDER BY trending_score DESC, coalesce(c.member_count, 0) DESC, c.name ASC
  LIMIT (SELECT lim FROM bound);
$$;

REVOKE ALL ON FUNCTION public.community_trending_score(integer, integer, boolean, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_trending_score(integer, integer, boolean, integer, integer, integer)
  TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_trending_communities(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_communities(integer)
  TO anon, authenticated, service_role;

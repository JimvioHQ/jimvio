-- Feed + discovery performance: indexes matching the hot WHERE/ORDER BY paths
-- and a tighter get_trending_communities that avoids full-table activity scans.

-- Published feed keyset (created_at, id)
CREATE INDEX IF NOT EXISTS idx_community_posts_published_created_id
  ON public.community_posts (created_at DESC, id DESC)
  WHERE is_published = true AND archived_at IS NULL;

-- Per-community published feed
CREATE INDEX IF NOT EXISTS idx_community_posts_community_published_created
  ON public.community_posts (community_id, created_at DESC, id DESC)
  WHERE is_published = true AND archived_at IS NULL;

-- Recent-activity helper for trending RPC (14-day window)
CREATE INDEX IF NOT EXISTS idx_community_posts_published_created_community
  ON public.community_posts (created_at DESC, community_id)
  WHERE coalesce(is_published, true) = true;

-- Active membership joins by subscribed_at
CREATE INDEX IF NOT EXISTS idx_community_memberships_active_subscribed
  ON public.community_memberships (subscribed_at DESC, community_id)
  WHERE status = 'active';

-- Public discovery community listing
CREATE INDEX IF NOT EXISTS idx_communities_public_member_count
  ON public.communities (member_count DESC NULLS LAST, id)
  WHERE coalesce(is_active, true) = true
    AND coalesce(is_private, false) = false
    AND archived_at IS NULL;

-- Presence for online_members in trending RPC
CREATE INDEX IF NOT EXISTS idx_member_points_last_active_community
  ON public.member_points (last_active_at DESC, community_id);

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
  -- Bound the candidate set before aggregating activity.
  candidates AS (
    SELECT
      c.id,
      c.name,
      c.slug,
      c.category,
      c.cover_image,
      c.avatar_url,
      coalesce(c.member_count, 0)::integer AS member_count,
      coalesce(c.post_count, 0)::integer AS post_count,
      coalesce(c.is_featured, false) AS is_featured
    FROM public.communities c
    WHERE coalesce(c.is_active, true) = true
      AND coalesce(c.is_private, false) = false
      AND c.archived_at IS NULL
    ORDER BY coalesce(c.is_featured, false) DESC,
             coalesce(c.member_count, 0) DESC,
             c.name ASC
    LIMIT 120
  ),
  recent_posts AS (
    SELECT
      cp.community_id,
      count(*)::integer AS cnt
    FROM public.community_posts cp
    INNER JOIN candidates cand ON cand.id = cp.community_id
    WHERE coalesce(cp.is_published, true) = true
      AND cp.archived_at IS NULL
      AND coalesce(cp.created_at, cp.published_at, now()) >= now() - interval '14 days'
    GROUP BY cp.community_id
  ),
  recent_joins AS (
    SELECT
      cm.community_id,
      count(*)::integer AS cnt
    FROM public.community_memberships cm
    INNER JOIN candidates cand ON cand.id = cm.community_id
    WHERE cm.status = 'active'
      AND coalesce(cm.subscribed_at, cm.created_at, now()) >= now() - interval '14 days'
    GROUP BY cm.community_id
  ),
  online AS (
    SELECT
      mp.community_id,
      count(*)::integer AS cnt
    FROM public.member_points mp
    INNER JOIN candidates cand ON cand.id = mp.community_id
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
    c.member_count,
    c.post_count,
    c.is_featured,
    coalesce(o.cnt, 0)::integer AS online_members,
    public.community_trending_score(
      c.member_count,
      c.post_count,
      c.is_featured,
      coalesce(rp.cnt, 0),
      coalesce(rj.cnt, 0),
      coalesce(o.cnt, 0)
    ) AS trending_score
  FROM candidates c
  CROSS JOIN bound b
  LEFT JOIN recent_posts rp ON rp.community_id = c.id
  LEFT JOIN recent_joins rj ON rj.community_id = c.id
  LEFT JOIN online o ON o.community_id = c.id
  ORDER BY trending_score DESC, c.member_count DESC, c.name ASC
  LIMIT (SELECT lim FROM bound);
$$;

REVOKE ALL ON FUNCTION public.get_trending_communities(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_communities(integer)
  TO anon, authenticated, service_role;

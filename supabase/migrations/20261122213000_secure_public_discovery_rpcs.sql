-- Public discovery RPC hardening.
-- Gallery and hashtag discovery honor the caller's RLS rather than bypassing it.
-- Community trending remains SECURITY DEFINER only to aggregate activity counts;
-- it is strictly limited to active, non-private, explicitly public communities
-- and public-eligible posts. Returned values are aggregate counts only.

SET lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.get_product_gallery(p_product_id uuid)
RETURNS TABLE(
  id uuid,
  media_type text,
  url text,
  thumbnail_url text,
  alt_text text,
  sort_order integer,
  is_primary boolean,
  platform text,
  duration_sec integer,
  aspect_ratio text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    pm.id,
    'image'::text,
    pm.url,
    pm.thumbnail_url,
    pm.alt_text,
    pm.sort_order,
    pm.is_primary,
    NULL::text,
    NULL::integer,
    NULL::text
  FROM public.product_media pm
  WHERE pm.product_id = p_product_id
    AND pm.media_type = 'image'
    AND pm.is_active IS TRUE

  UNION ALL

  SELECT
    pv.id,
    'video'::text,
    pv.url,
    pv.thumbnail_url,
    pv.title,
    pv.sort_order + 1000,
    pv.is_primary,
    pv.platform,
    pv.duration_sec,
    pv.aspect_ratio
  FROM public.product_videos pv
  WHERE pv.product_id = p_product_id
    AND pv.is_active IS TRUE

  ORDER BY is_primary DESC, sort_order ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_trending_community_topics(p_limit integer DEFAULT 12)
RETURNS TABLE(
  topic text,
  post_count integer,
  community_count integer,
  growth_pct numeric,
  active_users integer,
  live_discussions integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH bound AS (
    SELECT greatest(1, least(coalesce(p_limit, 12), 50)) AS lim
  ),
  recent AS (
    SELECT
      cp.id,
      cp.community_id,
      cp.author_id,
      cp.body,
      cp.attachments,
      coalesce(cp.comment_count, 0) AS comment_count,
      coalesce(cp.created_at, cp.published_at, now()) AS ts
    FROM public.community_posts cp
    WHERE coalesce(cp.is_published, false) = true
      AND cp.archived_at IS NULL
      AND cp.hidden_at IS NULL
      AND cp.deleted_at IS NULL
      AND coalesce(cp.is_exclusive, false) = false
      AND (cp.audience IS NULL OR cp.audience IN ('public', 'community'))
      AND coalesce(cp.created_at, cp.published_at, now()) >= now() - interval '14 days'
  ),
  post_tags AS (
    SELECT
      r.id AS post_id,
      r.community_id,
      r.author_id,
      r.comment_count,
      r.ts,
      lower(trim(both '#' from tag)) AS topic
    FROM recent r
    CROSS JOIN LATERAL (
      SELECT jsonb_array_elements_text(r.attachments -> 'hashtags') AS tag
      WHERE jsonb_typeof(r.attachments) = 'object'
        AND r.attachments ? 'hashtags'
        AND jsonb_typeof(r.attachments -> 'hashtags') = 'array'
        AND jsonb_array_length(r.attachments -> 'hashtags') > 0
      UNION ALL
      SELECT (m)[1]
      FROM regexp_matches(coalesce(r.body, ''), '(?:^|[[:space:]])#([a-zA-Z0-9_]{2,48})\\b', 'gi') AS m
      WHERE NOT (
        jsonb_typeof(r.attachments) = 'object'
        AND r.attachments ? 'hashtags'
        AND jsonb_typeof(r.attachments -> 'hashtags') = 'array'
        AND jsonb_array_length(r.attachments -> 'hashtags') > 0
      )
    ) tags
    WHERE tag IS NOT NULL AND length(trim(tag)) >= 2
  ),
  topic_stats AS (
    SELECT
      pt.topic,
      count(DISTINCT pt.post_id)::integer AS post_count,
      count(DISTINCT pt.community_id)::integer AS community_count,
      count(DISTINCT pt.author_id)::integer AS active_users,
      count(DISTINCT pt.post_id) FILTER (WHERE pt.comment_count > 0)::integer AS live_discussions,
      count(DISTINCT pt.post_id) FILTER (WHERE pt.ts >= now() - interval '7 days')::integer AS recent_count,
      count(DISTINCT pt.post_id) FILTER (
        WHERE pt.ts >= now() - interval '14 days'
          AND pt.ts < now() - interval '7 days'
      )::integer AS prior_count
    FROM post_tags pt
    GROUP BY pt.topic
    HAVING count(DISTINCT pt.post_id) >= 2
  )
  SELECT
    ts.topic,
    ts.post_count,
    ts.community_count,
    CASE
      WHEN ts.prior_count = 0 AND ts.recent_count > 0 THEN 100.0
      WHEN ts.prior_count = 0 THEN 0.0
      ELSE round(
        ((ts.recent_count - ts.prior_count)::numeric / ts.prior_count::numeric) * 100.0,
        1
      )
    END AS growth_pct,
    ts.active_users,
    ts.live_discussions
  FROM topic_stats ts
  ORDER BY ts.recent_count DESC, ts.post_count DESC, ts.topic ASC
  LIMIT (SELECT lim FROM bound);
$function$;

CREATE OR REPLACE FUNCTION public.get_trending_communities(p_limit integer DEFAULT 8)
RETURNS TABLE(
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
SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH bound AS (
    SELECT greatest(1, least(coalesce(p_limit, 8), 24)) AS lim
  ),
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
    WHERE c.is_active IS TRUE
      AND coalesce(c.is_private, false) = false
      AND c.archived_at IS NULL
      AND lower(coalesce(
        nullif(trim(both from c.visibility_mode), ''),
        nullif(trim(both from c.visibility), ''),
        'public'
      )) = 'public'
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
    WHERE coalesce(cp.is_published, false) = true
      AND cp.archived_at IS NULL
      AND cp.hidden_at IS NULL
      AND cp.deleted_at IS NULL
      AND coalesce(cp.is_exclusive, false) = false
      AND (cp.audience IS NULL OR cp.audience IN ('public', 'community'))
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
$function$;

REVOKE ALL ON FUNCTION public.get_product_gallery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_gallery(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_trending_community_topics(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_community_topics(integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_trending_communities(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_communities(integer) TO anon, authenticated, service_role;

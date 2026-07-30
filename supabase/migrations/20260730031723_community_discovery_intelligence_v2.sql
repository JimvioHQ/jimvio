-- Community discovery intelligence v2: pins, hashtag indexes, trending topics RPC.

-- ---------------------------------------------------------------------------
-- user_community_pins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_community_pins (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_user_community_pins_user_position
  ON public.user_community_pins (user_id, position ASC);

ALTER TABLE public.user_community_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_community_pins_select_own ON public.user_community_pins;
CREATE POLICY user_community_pins_select_own ON public.user_community_pins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_community_pins_insert_own ON public.user_community_pins;
CREATE POLICY user_community_pins_insert_own ON public.user_community_pins
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_community_pins_update_own ON public.user_community_pins;
CREATE POLICY user_community_pins_update_own ON public.user_community_pins
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_community_pins_delete_own ON public.user_community_pins;
CREATE POLICY user_community_pins_delete_own ON public.user_community_pins
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Realtime publication (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'user_community_pins'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_community_pins;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Hashtag discovery helper index (object attachments with hashtags array only)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_community_posts_attachments_hashtags_gin
  ON public.community_posts USING gin ((attachments -> 'hashtags'))
  WHERE jsonb_typeof(attachments) = 'object'
    AND attachments ? 'hashtags';

-- ---------------------------------------------------------------------------
-- Trending community topics (14d window, 7d growth compare)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trending_community_topics(p_limit integer DEFAULT 12)
RETURNS TABLE (
  topic text,
  post_count integer,
  community_count integer,
  growth_pct numeric,
  active_users integer,
  live_discussions integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHERE coalesce(cp.is_published, true) = true
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
      FROM regexp_matches(
        coalesce(r.body, ''),
        '(?:^|[[:space:]])#([a-zA-Z0-9_]{2,48})\b',
        'gi'
      ) AS m
      WHERE NOT (
        jsonb_typeof(r.attachments) = 'object'
        AND r.attachments ? 'hashtags'
        AND jsonb_typeof(r.attachments -> 'hashtags') = 'array'
        AND jsonb_array_length(r.attachments -> 'hashtags') > 0
      )
    ) tags
    WHERE tag IS NOT NULL
      AND length(trim(tag)) >= 2
  ),
  topic_stats AS (
    SELECT
      pt.topic,
      count(DISTINCT pt.post_id)::integer AS post_count,
      count(DISTINCT pt.community_id)::integer AS community_count,
      count(DISTINCT pt.author_id)::integer AS active_users,
      count(DISTINCT pt.post_id) FILTER (WHERE pt.comment_count > 0)::integer AS live_discussions,
      count(DISTINCT pt.post_id) FILTER (
        WHERE pt.ts >= now() - interval '7 days'
      )::integer AS recent_count,
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
$$;

REVOKE ALL ON FUNCTION public.get_trending_community_topics(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_community_topics(integer)
  TO anon, authenticated, service_role;

-- Sprint: Community posts & stories production hardening (additive).

-- ---------------------------------------------------------------------------
-- Post owner controls
-- ---------------------------------------------------------------------------
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS comments_disabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_community_posts_community_published
  ON public.community_posts (community_id, is_published, archived_at, created_at DESC)
  WHERE is_published = true AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_posts_author_active
  ON public.community_posts (author_id, archived_at, created_at DESC)
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- Stories (48h ephemeral, analytics retained after expiry)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'photo'
    CHECK (media_type IN ('photo', 'video')),
  caption text,
  thumbnail_url text,
  privacy text NOT NULL DEFAULT 'followers'
    CHECK (privacy IN ('public', 'followers', 'community', 'close_friends')),
  mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  view_count integer NOT NULL DEFAULT 0,
  unique_view_count integer NOT NULL DEFAULT 0,
  reply_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stories_active_feed
  ON public.community_stories (expires_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_author_created
  ON public.community_stories (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_community_active
  ON public.community_stories (community_id, expires_at DESC)
  WHERE community_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.community_story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.community_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  watch_ms integer NOT NULL DEFAULT 0 CHECK (watch_ms >= 0),
  completion_pct numeric(5,2) NOT NULL DEFAULT 0
    CHECK (completion_pct >= 0 AND completion_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story
  ON public.community_story_views (story_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.community_stories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_replies_story
  ON public.community_story_replies (story_id, created_at ASC);

-- Analytics snapshot retained after story soft-expiry (row kept, hidden from feeds)
CREATE TABLE IF NOT EXISTS public.community_story_analytics (
  story_id uuid PRIMARY KEY REFERENCES public.community_stories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  views integer NOT NULL DEFAULT 0,
  unique_viewers integer NOT NULL DEFAULT 0,
  replies integer NOT NULL DEFAULT 0,
  avg_watch_ms integer NOT NULL DEFAULT 0,
  avg_completion_pct numeric(5,2) NOT NULL DEFAULT 0,
  retained_until timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_story_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_story_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stories_select_visible ON public.community_stories;
CREATE POLICY stories_select_visible ON public.community_stories
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR (
      expires_at > now()
      AND (
        privacy = 'public'
        OR (privacy = 'followers')
        OR (
          privacy = 'community'
          AND community_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.community_memberships m
            WHERE m.community_id = community_stories.community_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
          )
        )
        OR (
          privacy = 'close_friends'
          AND author_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS stories_insert_own ON public.community_stories;
CREATE POLICY stories_insert_own ON public.community_stories
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS stories_update_own ON public.community_stories;
CREATE POLICY stories_update_own ON public.community_stories
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS stories_delete_own ON public.community_stories;
CREATE POLICY stories_delete_own ON public.community_stories
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS story_views_select ON public.community_story_views;
CREATE POLICY story_views_select ON public.community_story_views
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_stories s
      WHERE s.id = story_id AND s.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS story_views_insert_own ON public.community_story_views;
CREATE POLICY story_views_insert_own ON public.community_story_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS story_replies_select ON public.community_story_replies;
CREATE POLICY story_replies_select ON public.community_story_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_stories s
      WHERE s.id = story_id
        AND (s.author_id = auth.uid() OR s.expires_at > now())
    )
  );

DROP POLICY IF EXISTS story_replies_insert_own ON public.community_story_replies;
CREATE POLICY story_replies_insert_own ON public.community_story_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_stories s
      WHERE s.id = story_id AND s.expires_at > now()
    )
  );

DROP POLICY IF EXISTS story_analytics_author ON public.community_story_analytics;
CREATE POLICY story_analytics_author ON public.community_story_analytics
  FOR ALL TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Record story view (deduped), keep counters authentic
CREATE OR REPLACE FUNCTION public.record_community_story_view(
  p_story_id uuid,
  p_user_id uuid,
  p_watch_ms integer DEFAULT 0,
  p_completion_pct numeric DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  is_new boolean := false;
  story_author uuid;
BEGIN
  IF p_user_id IS NULL OR p_story_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT author_id INTO story_author
  FROM public.community_stories
  WHERE id = p_story_id
  LIMIT 1;

  IF story_author IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO existing_id
  FROM public.community_story_views
  WHERE story_id = p_story_id AND user_id = p_user_id
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
    coalesce((SELECT avg(watch_ms)::int FROM public.community_story_views WHERE story_id = p_story_id), 0),
    coalesce((SELECT avg(completion_pct) FROM public.community_story_views WHERE story_id = p_story_id), 0)
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
$$;

REVOKE ALL ON FUNCTION public.record_community_story_view(uuid, uuid, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_community_story_view(uuid, uuid, integer, numeric) TO authenticated, service_role;

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_stories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_story_replies;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

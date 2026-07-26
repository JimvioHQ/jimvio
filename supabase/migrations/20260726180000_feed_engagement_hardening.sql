-- Sprint: Feed & post engagement hardening (additive).

-- ---------------------------------------------------------------------------
-- Reactions (multi-emoji) — keeps community_post_likes as legacy "👍"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL
    CHECK (reaction IN ('like','love','fire','clap','laugh','wow','sad','angry')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post
  ON public.community_post_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user
  ON public.community_post_reactions (user_id, created_at DESC);

ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_reactions_select ON public.community_post_reactions;
CREATE POLICY post_reactions_select ON public.community_post_reactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS post_reactions_insert_own ON public.community_post_reactions;
CREATE POLICY post_reactions_insert_own ON public.community_post_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS post_reactions_update_own ON public.community_post_reactions;
CREATE POLICY post_reactions_update_own ON public.community_post_reactions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS post_reactions_delete_own ON public.community_post_reactions;
CREATE POLICY post_reactions_delete_own ON public.community_post_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Authentic views (deduped per user/session per day)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id text,
  watch_ms integer NOT NULL DEFAULT 0 CHECK (watch_ms >= 0),
  completion_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
  viewed_on date NOT NULL DEFAULT (timezone('utc', now()))::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_post_views_user_day
  ON public.community_post_views (post_id, user_id, viewed_on)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_post_views_session_day
  ON public.community_post_views (post_id, session_id, viewed_on)
  WHERE user_id IS NULL AND session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_views_post
  ON public.community_post_views (post_id, created_at DESC);

ALTER TABLE public.community_post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_views_select_author ON public.community_post_views;
CREATE POLICY post_views_select_author ON public.community_post_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS post_views_insert_own ON public.community_post_views;
CREATE POLICY post_views_insert_own ON public.community_post_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Share ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_type text NOT NULL DEFAULT 'link'
    CHECK (share_type IN ('link','repost','quote','community','external','copy')),
  target_community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_shares_post
  ON public.community_post_shares (post_id, created_at DESC);

ALTER TABLE public.community_post_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_shares_select ON public.community_post_shares;
CREATE POLICY post_shares_select ON public.community_post_shares
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS post_shares_insert_own ON public.community_post_shares;
CREATE POLICY post_shares_insert_own ON public.community_post_shares
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Bookmark collections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookmark_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.bookmark_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookmark_collections_own ON public.bookmark_collections;
CREATE POLICY bookmark_collections_own ON public.bookmark_collections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.community_saved_posts
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.bookmark_collections(id) ON DELETE SET NULL;

ALTER TABLE public.community_saved_posts
  ADD COLUMN IF NOT EXISTS offline_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Post composer metadata
-- ---------------------------------------------------------------------------
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'community'
    CHECK (audience IN ('public','followers','community','private'));

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS reaction_counts jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS unique_view_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.community_post_comments
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.community_post_comments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Comment likes (for nested engagement)
CREATE TABLE IF NOT EXISTS public.community_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment
  ON public.community_comment_likes (comment_id);

ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comment_likes_select ON public.community_comment_likes;
CREATE POLICY comment_likes_select ON public.community_comment_likes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS comment_likes_own ON public.community_comment_likes;
CREATE POLICY comment_likes_own ON public.community_comment_likes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow post authors / community staff to pin comments
DROP POLICY IF EXISTS comments_pin_by_staff ON public.community_post_comments;
CREATE POLICY comments_pin_by_staff ON public.community_post_comments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id
        AND (
          p.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.community_memberships m
            WHERE m.community_id = p.community_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin', 'moderator')
          )
        )
    )
  )
  WITH CHECK (true);

-- Feed pagination / ranking indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_feed_keyset
  ON public.community_posts (community_id, is_published, is_pinned DESC, created_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_community_posts_author_published
  ON public.community_posts (author_id, is_published, created_at DESC);

-- ---------------------------------------------------------------------------
-- View recording RPC (deduped, authentic)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_community_post_view(
  p_post_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
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
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO existing_id
    FROM public.community_post_views
    WHERE post_id = p_post_id
      AND user_id = p_user_id
      AND viewed_on = (timezone('utc', now()))::date
    LIMIT 1;

    IF existing_id IS NULL THEN
      INSERT INTO public.community_post_views (post_id, user_id, watch_ms, completion_pct)
      VALUES (p_post_id, p_user_id, greatest(p_watch_ms, 0), least(greatest(p_completion_pct, 0), 100));
      is_new := true;
    ELSE
      UPDATE public.community_post_views
      SET
        watch_ms = greatest(watch_ms, greatest(p_watch_ms, 0)),
        completion_pct = greatest(completion_pct, least(greatest(p_completion_pct, 0), 100))
      WHERE id = existing_id;
    END IF;
  ELSIF p_session_id IS NOT NULL AND length(trim(p_session_id)) > 0 THEN
    SELECT id INTO existing_id
    FROM public.community_post_views
    WHERE post_id = p_post_id
      AND session_id = p_session_id
      AND user_id IS NULL
      AND viewed_on = (timezone('utc', now()))::date
    LIMIT 1;

    IF existing_id IS NULL THEN
      INSERT INTO public.community_post_views (post_id, session_id, watch_ms, completion_pct)
      VALUES (p_post_id, p_session_id, greatest(p_watch_ms, 0), least(greatest(p_completion_pct, 0), 100));
      is_new := true;
    ELSE
      UPDATE public.community_post_views
      SET
        watch_ms = greatest(watch_ms, greatest(p_watch_ms, 0)),
        completion_pct = greatest(completion_pct, least(greatest(p_completion_pct, 0), 100))
      WHERE id = existing_id;
    END IF;
  ELSE
    RETURN false;
  END IF;

  IF is_new THEN
    UPDATE public.community_posts
    SET
      view_count = coalesce(view_count, 0) + 1,
      unique_view_count = coalesce(unique_view_count, 0) + 1,
      updated_at = now()
    WHERE id = p_post_id;
  END IF;

  RETURN is_new;
END;
$$;

REVOKE ALL ON FUNCTION public.record_community_post_view(uuid, uuid, text, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_community_post_view(uuid, uuid, text, integer, numeric) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_shares;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

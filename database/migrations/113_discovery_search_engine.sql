-- Sprint 9: Search / discovery indexes + recently-viewed / search history.
-- Additive only. Uses existing pg_trgm when available.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Trigram / text indexes for cross-entity search
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_communities_name_trgm
  ON public.communities USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_spaces_name_trgm
  ON public.spaces USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_community_posts_title_trgm
  ON public.community_posts USING gin (title gin_trgm_ops)
  WHERE title IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_courses_title_trgm
  ON public.community_courses USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_course_lessons_title_trgm
  ON public.course_lessons USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_live_sessions_title_trgm
  ON public.live_sessions USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING gin (username gin_trgm_ops)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON public.profiles USING gin (full_name gin_trgm_ops)
  WHERE full_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_name_trgm
  ON public.affiliate_campaigns USING gin (name gin_trgm_ops);

-- Products FTS expression index (ensure present for name+description ranking)
CREATE INDEX IF NOT EXISTS idx_products_search_fts
  ON public.products
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- ---------------------------------------------------------------------------
-- Recently viewed / discovery views (server-side personalization)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discovery_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL
    CHECK (entity_type IN (
      'community', 'space', 'post', 'message', 'course', 'lesson',
      'product', 'creator', 'live', 'campaign', 'digital', 'organization'
    )),
  entity_id text NOT NULL,
  title text,
  href text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_discovery_views_user_viewed
  ON public.discovery_views (user_id, viewed_at DESC);

ALTER TABLE public.discovery_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discovery_views_select_own ON public.discovery_views;
CREATE POLICY discovery_views_select_own ON public.discovery_views
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS discovery_views_insert_own ON public.discovery_views;
CREATE POLICY discovery_views_insert_own ON public.discovery_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS discovery_views_update_own ON public.discovery_views;
CREATE POLICY discovery_views_update_own ON public.discovery_views
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS discovery_views_delete_own ON public.discovery_views;
CREATE POLICY discovery_views_delete_own ON public.discovery_views
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Search history (recent queries)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query text NOT NULL,
  result_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_created
  ON public.search_history (user_id, created_at DESC);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS search_history_select_own ON public.search_history;
CREATE POLICY search_history_select_own ON public.search_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS search_history_insert_own ON public.search_history;
CREATE POLICY search_history_insert_own ON public.search_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS search_history_delete_own ON public.search_history;
CREATE POLICY search_history_delete_own ON public.search_history
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

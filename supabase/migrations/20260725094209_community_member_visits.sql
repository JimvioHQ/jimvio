-- Community member visits — cross-device "continue where you left off"
-- Powers hub home + community overview resume CTAs.

CREATE TABLE IF NOT EXISTS public.community_member_visits (
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_visited_at timestamptz NOT NULL DEFAULT now(),
  last_path text,
  last_channel_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_member_visits_user_visited_idx
  ON public.community_member_visits (user_id, last_visited_at DESC);

CREATE INDEX IF NOT EXISTS community_member_visits_community_visited_idx
  ON public.community_member_visits (community_id, last_visited_at DESC);

ALTER TABLE public.community_member_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_member_visits_select ON public.community_member_visits;
CREATE POLICY community_member_visits_select ON public.community_member_visits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS community_member_visits_insert ON public.community_member_visits;
CREATE POLICY community_member_visits_insert ON public.community_member_visits
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.community_memberships m
        WHERE m.community_id = community_member_visits.community_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
      OR auth.uid() = (
        SELECT c.owner_id
        FROM public.communities c
        WHERE c.id = community_member_visits.community_id
      )
    )
  );

DROP POLICY IF EXISTS community_member_visits_update ON public.community_member_visits;
CREATE POLICY community_member_visits_update ON public.community_member_visits
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_member_visits_delete ON public.community_member_visits;
CREATE POLICY community_member_visits_delete ON public.community_member_visits
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS community_memberships_user_active_subscribed_idx
  ON public.community_memberships (user_id, status, subscribed_at DESC NULLS LAST)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS community_posts_community_published_created_idx
  ON public.community_posts (community_id, created_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS live_sessions_community_live_idx
  ON public.live_sessions (community_id, started_at DESC)
  WHERE status = 'live';

COMMENT ON TABLE public.community_member_visits IS
  'Per-member resume state for world-class community hub home and overview CTAs.';

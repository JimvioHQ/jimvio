-- Community Feed completion (additive, production-safe)
-- Polls, quote posts, share counts, content reports.
-- Does NOT touch Live Studio tables.

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS share_count INT DEFAULT 0;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS quote_of_post_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_quote_of_post_id_fkey'
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_quote_of_post_id_fkey
      FOREIGN KEY (quote_of_post_id)
      REFERENCES public.community_posts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_quote
  ON public.community_posts(quote_of_post_id)
  WHERE quote_of_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_posts_drafts
  ON public.community_posts(author_id, is_published, updated_at DESC)
  WHERE is_published = false;

-- Poll options live in attachments JSON for the post; votes are relational
CREATE TABLE IF NOT EXISTS public.community_post_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INT NOT NULL CHECK (option_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_poll_votes_post
  ON public.community_post_poll_votes(post_id);

ALTER TABLE public.community_post_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_post_poll_votes_select ON public.community_post_poll_votes;
CREATE POLICY community_post_poll_votes_select ON public.community_post_poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      JOIN public.community_memberships m ON m.community_id = p.community_id
      WHERE p.id = community_post_poll_votes.post_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS community_post_poll_votes_insert ON public.community_post_poll_votes;
CREATE POLICY community_post_poll_votes_insert ON public.community_post_poll_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Content reports (feed + reusable)
CREATE TABLE IF NOT EXISTS public.community_content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'message')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'other',
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_content_reports_community
  ON public.community_content_reports(community_id, status, created_at DESC);

ALTER TABLE public.community_content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_content_reports_insert ON public.community_content_reports;
CREATE POLICY community_content_reports_insert ON public.community_content_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS community_content_reports_select_own ON public.community_content_reports;
CREATE POLICY community_content_reports_select_own ON public.community_content_reports
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_content_reports.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

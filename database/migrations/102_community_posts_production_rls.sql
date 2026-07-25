-- Community posts production RLS + poll vote UPDATE
-- Aligns staff pin/delete with API; scopes SELECT to members; allows poll re-votes.

-- ── community_posts SELECT: active members (or author for own drafts) ──────────
DROP POLICY IF EXISTS community_posts_select ON public.community_posts;
CREATE POLICY community_posts_select ON public.community_posts
  FOR SELECT USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1
      FROM public.community_memberships m
      WHERE m.community_id = community_posts.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR auth.uid() = (
      SELECT c.owner_id FROM public.communities c WHERE c.id = community_posts.community_id
    )
  );

-- ── community_posts UPDATE: author OR owner/admin/moderator ───────────────────
DROP POLICY IF EXISTS community_posts_update ON public.community_posts;
CREATE POLICY community_posts_update ON public.community_posts
  FOR UPDATE USING (
    auth.uid() = author_id
    OR auth.uid() = (
      SELECT c.owner_id FROM public.communities c WHERE c.id = community_posts.community_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.community_memberships m
      WHERE m.community_id = community_posts.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

-- ── community_posts DELETE: author OR owner/admin/moderator ───────────────────
DROP POLICY IF EXISTS community_posts_delete ON public.community_posts;
CREATE POLICY community_posts_delete ON public.community_posts
  FOR DELETE USING (
    auth.uid() = author_id
    OR auth.uid() = (
      SELECT c.owner_id FROM public.communities c WHERE c.id = community_posts.community_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.community_memberships m
      WHERE m.community_id = community_posts.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

-- ── INSERT: still author = auth.uid(), plus must be an active member ──────────
DROP POLICY IF EXISTS community_posts_insert ON public.community_posts;
CREATE POLICY community_posts_insert ON public.community_posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND (
      auth.uid() = (
        SELECT c.owner_id FROM public.communities c WHERE c.id = community_posts.community_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.community_memberships m
        WHERE m.community_id = community_posts.community_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
    )
  );

-- ── Poll vote UPDATE (re-vote / upsert) ───────────────────────────────────────
DROP POLICY IF EXISTS community_post_poll_votes_update ON public.community_post_poll_votes;
CREATE POLICY community_post_poll_votes_update ON public.community_post_poll_votes
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

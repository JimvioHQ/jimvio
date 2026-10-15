-- Distinguish hide and recoverable delete from archive.
-- Does not remove members, posts, comments, escrow, or payouts.

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.community_post_comments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.community_posts.hidden_at IS 'Platform admin hide. Public feeds exclude the post. The row stays.';
COMMENT ON COLUMN public.community_posts.deleted_at IS 'Platform admin soft-delete. The row, comments, and community stay.';
COMMENT ON COLUMN public.community_post_comments.deleted_at IS 'Platform admin soft-delete. The comment row stays for moderation history.';

DROP POLICY IF EXISTS community_posts_select_public ON public.community_posts;
CREATE POLICY community_posts_select_public ON public.community_posts
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_published, false) = true
    AND archived_at IS NULL
    AND hidden_at IS NULL
    AND deleted_at IS NULL
    AND COALESCE(is_exclusive, false) = false
    AND (audience IS NULL OR audience IN ('public', 'community'))
    AND EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id = community_posts.community_id
        AND c.is_active IS TRUE
        AND COALESCE(c.is_private, false) = false
        AND c.archived_at IS NULL
        AND LOWER(COALESCE(NULLIF(TRIM(c.visibility_mode), ''), NULLIF(TRIM(c.visibility), ''), 'public')) = 'public'
    )
  );

DROP POLICY IF EXISTS community_post_comments_select_public ON public.community_post_comments;
CREATE POLICY community_post_comments_select_public
  ON public.community_post_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_published, true) = true
    AND deleted_at IS NULL
    AND post_id IN (
      SELECT p.id
      FROM public.community_posts p
      JOIN public.communities c ON c.id = p.community_id
      WHERE COALESCE(p.is_published, false) = true
        AND p.archived_at IS NULL
        AND p.hidden_at IS NULL
        AND p.deleted_at IS NULL
        AND COALESCE(p.is_exclusive, false) = false
        AND (p.audience IS NULL OR p.audience IN ('public', 'community'))
        AND c.is_active IS TRUE
        AND COALESCE(c.is_private, false) = false
        AND c.archived_at IS NULL
        AND LOWER(COALESCE(NULLIF(TRIM(c.visibility_mode), ''), NULLIF(TRIM(c.visibility), ''), 'public')) = 'public'
    )
  );

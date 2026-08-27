-- Guest SELECT: published posts in public communities with audience public OR community.
-- Composer/table default is 'community', which previously hid every real public post from anon.
-- Additive SELECT only. Does not grant INSERT/UPDATE/DELETE. Does not disable RLS.
-- Does not expose followers/private audience, exclusive posts, or non-public communities.

-- Canonical copy: supabase/migrations/20260827140000_public_community_audience_read.sql

DROP POLICY IF EXISTS community_posts_select_public ON public.community_posts;
CREATE POLICY community_posts_select_public ON public.community_posts
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_published, false) = true
    AND archived_at IS NULL
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
    post_id IN (
      SELECT p.id
      FROM public.community_posts p
      JOIN public.communities c ON c.id = p.community_id
      WHERE COALESCE(p.is_published, false) = true
        AND p.archived_at IS NULL
        AND COALESCE(p.is_exclusive, false) = false
        AND (p.audience IS NULL OR p.audience IN ('public', 'community'))
        AND c.is_active IS TRUE
        AND COALESCE(c.is_private, false) = false
        AND c.archived_at IS NULL
        AND LOWER(COALESCE(NULLIF(TRIM(c.visibility_mode), ''), NULLIF(TRIM(c.visibility), ''), 'public')) = 'public'
    )
  );

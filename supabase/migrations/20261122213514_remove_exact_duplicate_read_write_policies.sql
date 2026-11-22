SET lock_timeout = '5s';

-- Each dropped policy is an exact duplicate: same role, command, permissive mode,
-- USING expression and WITH CHECK expression as the retained policy.
-- Removing one copy leaves the effective RLS predicate unchanged.

DROP POLICY IF EXISTS post_likes_public_read ON public.community_post_likes;
DROP POLICY IF EXISTS product_views_insert ON public.product_views;
DROP POLICY IF EXISTS short_video_clicks_insert ON public.short_video_clicks;
DROP POLICY IF EXISTS short_video_comments_select ON public.short_video_comments;
DROP POLICY IF EXISTS short_video_likes_select ON public.short_video_likes;
DROP POLICY IF EXISTS short_video_views_insert ON public.short_video_views;

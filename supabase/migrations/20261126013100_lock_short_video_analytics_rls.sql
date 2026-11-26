-- Remove broad SELECT policies that bypass the intended creator/viewer scopes.
-- The specific replacement policies already exist and remain unchanged.

DROP POLICY IF EXISTS short_videos_select ON public.short_videos;
DROP POLICY IF EXISTS short_video_clicks_select ON public.short_video_clicks;
DROP POLICY IF EXISTS short_video_views_select ON public.short_video_views;

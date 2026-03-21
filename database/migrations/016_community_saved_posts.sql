-- Saved/bookmarked posts for dashboard "Saved Threads"
CREATE TABLE IF NOT EXISTS public.community_saved_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_community_saved_posts_user_id ON public.community_saved_posts(user_id);

ALTER TABLE public.community_saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own saved posts" ON public.community_saved_posts;
CREATE POLICY "Users can manage own saved posts" ON public.community_saved_posts
  FOR ALL USING (auth.uid() = user_id);

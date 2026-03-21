-- Allow post author to view, update and delete their own posts
CREATE POLICY "Authors can view own posts" ON public.community_posts
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own posts" ON public.community_posts
  FOR DELETE USING (auth.uid() = author_id);

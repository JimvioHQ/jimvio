-- Creator/Creator clips: status (draft/published), total_likes, influencer guidelines
-- viral_clips: allow creator-owned clips (vendor_id null), add status and total_likes
ALTER TABLE public.viral_clips
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  ADD COLUMN IF NOT EXISTS total_likes BIGINT DEFAULT 0;

-- influencers: track creator guidelines acceptance
ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS guidelines_accepted_at TIMESTAMPTZ;

-- clip_comments for My Clips comments count (optional)
CREATE TABLE IF NOT EXISTS public.clip_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES public.viral_clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clip_comments_clip_id ON public.clip_comments(clip_id);

ALTER TABLE public.clip_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clip comments" ON public.clip_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert clip comments" ON public.clip_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own clip comments" ON public.clip_comments FOR DELETE USING (auth.uid() = user_id);

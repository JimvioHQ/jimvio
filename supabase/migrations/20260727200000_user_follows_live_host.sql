-- User-to-user follows for Live host Follow / Unfollow.
-- Non-destructive. Idempotent. No drops.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS follower_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS following_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> following_id),
  CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower
  ON public.user_follows (follower_id);

CREATE INDEX IF NOT EXISTS idx_user_follows_following
  ON public.user_follows (following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_follows_select_public" ON public.user_follows;
CREATE POLICY "user_follows_select_public"
  ON public.user_follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "user_follows_insert_own" ON public.user_follows;
CREATE POLICY "user_follows_insert_own"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "user_follows_delete_own" ON public.user_follows;
CREATE POLICY "user_follows_delete_own"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

CREATE OR REPLACE FUNCTION public.update_user_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
      SET follower_count = GREATEST(0, COALESCE(follower_count, 0) + 1)
      WHERE id = NEW.following_id;
    UPDATE public.profiles
      SET following_count = GREATEST(0, COALESCE(following_count, 0) + 1)
      WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
      SET follower_count = GREATEST(0, COALESCE(follower_count, 0) - 1)
      WHERE id = OLD.following_id;
    UPDATE public.profiles
      SET following_count = GREATEST(0, COALESCE(following_count, 0) - 1)
      WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_user_follow_change ON public.user_follows;
CREATE TRIGGER on_user_follow_change
  AFTER INSERT OR DELETE ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.update_user_follow_counts();

-- Realtime for optimistic Live Follow UI sync across clients
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'user_follows'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_follows;
    END IF;
  END IF;
END $$;

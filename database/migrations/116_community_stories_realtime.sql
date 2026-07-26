-- Ensure community_stories is in supabase_realtime (replies already published).

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_stories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

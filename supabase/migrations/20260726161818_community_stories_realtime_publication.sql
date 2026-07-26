-- Ensure community_stories is in supabase_realtime (replies already published).
-- Applied remotely via Supabase MCP as community_stories_realtime_publication.

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_stories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.community_stories REPLICA IDENTITY DEFAULT;

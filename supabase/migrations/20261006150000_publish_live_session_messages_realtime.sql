-- Publish live_session_messages so Creator Live chat receives postgres_changes
-- without page refresh. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime publication missing — skip';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'live_session_messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_session_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_messages;
  END IF;
END $$;

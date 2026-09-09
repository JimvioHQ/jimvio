-- Ensure messaging tables are in supabase_realtime and add inbox
-- conversation updates for Hub thread-list live refresh.
-- Idempotent: safe to re-run.

DO $$
DECLARE
  t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime publication missing — skip';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'community_messages',
    'community_inbox_messages',
    'community_inbox_conversations',
    'messaging_conversation_reads'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

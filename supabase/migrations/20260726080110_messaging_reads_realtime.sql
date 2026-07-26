-- Enable realtime for peer read-receipt cursors (seen ticks).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messaging_conversation_reads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messaging_conversation_reads;
  END IF;
END $$;

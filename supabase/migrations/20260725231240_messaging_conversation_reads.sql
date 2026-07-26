-- Messaging conversation read receipts / unread counters for hub Messages.
-- Safe additive migration — does not alter existing message rows.

CREATE TABLE IF NOT EXISTS public.messaging_conversation_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_key text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  last_read_message_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_key)
);

CREATE INDEX IF NOT EXISTS idx_messaging_conversation_reads_user
  ON public.messaging_conversation_reads (user_id, last_read_at DESC);

ALTER TABLE public.messaging_conversation_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messaging_reads_select_own" ON public.messaging_conversation_reads;
CREATE POLICY "messaging_reads_select_own"
  ON public.messaging_conversation_reads
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "messaging_reads_insert_own" ON public.messaging_conversation_reads;
CREATE POLICY "messaging_reads_insert_own"
  ON public.messaging_conversation_reads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messaging_reads_update_own" ON public.messaging_conversation_reads;
CREATE POLICY "messaging_reads_update_own"
  ON public.messaging_conversation_reads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messaging_reads_delete_own" ON public.messaging_conversation_reads;
CREATE POLICY "messaging_reads_delete_own"
  ON public.messaging_conversation_reads
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.messaging_conversation_reads IS
  'Per-user last-read cursor for hub Messages threads (inbox + room keys).';

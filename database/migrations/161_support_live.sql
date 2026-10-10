-- Mirror of supabase/migrations/20261010143000_support_live.sql
-- Live support conversations. Additive. Customers read only their own
-- customer-visible messages. Staff writes go through the service role after
-- requirePlatformAdmin. Apply this migration before the live inbox is used.
-- Reverse: drop the three tables below (they do not reference ticket rows
-- except an optional ticket id with ON DELETE SET NULL).

CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_name TEXT,
  requester_email TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'ai' CHECK (status IN ('ai', 'queued', 'active', 'resolved')),
  mode TEXT NOT NULL DEFAULT 'ai' CHECK (mode IN ('ai', 'human')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  handoff_requested_at TIMESTAMPTZ,
  last_preview TEXT,
  customer_unread INTEGER NOT NULL DEFAULT 0 CHECK (customer_unread >= 0),
  staff_unread INTEGER NOT NULL DEFAULT 0 CHECK (staff_unread >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_conversations_user_updated_idx
  ON public.support_conversations (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS support_conversations_queue_idx
  ON public.support_conversations (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS support_conversations_assignee_idx
  ON public.support_conversations (assignee_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.support_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('customer', 'ai', 'staff', 'system')),
  visibility TEXT NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer', 'internal')),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  client_message_id UUID,
  articles JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer_mode TEXT CHECK (answer_mode IN ('knowledge', 'live', 'refused')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS support_conversation_messages_client_uidx
  ON public.support_conversation_messages (client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_conversation_messages_thread_idx
  ON public.support_conversation_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.support_agent_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_conversation_typing (
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  actor TEXT NOT NULL CHECK (actor IN ('customer', 'staff')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, actor)
);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_agent_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversation_typing ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.support_conversations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.support_conversation_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.support_agent_presence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.support_conversation_typing FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.support_conversations TO authenticated;
GRANT SELECT ON TABLE public.support_conversation_messages TO authenticated;
GRANT SELECT ON TABLE public.support_conversation_typing TO authenticated;

DROP POLICY IF EXISTS support_conversations_select ON public.support_conversations;
CREATE POLICY support_conversations_select ON public.support_conversations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS support_conversation_messages_select ON public.support_conversation_messages;
CREATE POLICY support_conversation_messages_select ON public.support_conversation_messages
  FOR SELECT TO authenticated
  USING (
    (
      visibility = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.support_conversations c
        WHERE c.id = conversation_id AND c.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS support_typing_select ON public.support_conversation_typing;
CREATE POLICY support_typing_select ON public.support_conversation_typing
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role IN ('admin', 'super_admin')
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime publication missing — skip';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_conversation_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversation_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
  END IF;
END $$;

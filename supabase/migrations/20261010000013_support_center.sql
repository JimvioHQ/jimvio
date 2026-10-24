-- Support Center: tickets, customer-visible messages, and article feedback.
-- Additive only. Staff reads and writes go through the service role after
-- platform-admin authorization in the API. Customers never receive internal notes.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_name TEXT,
  requester_email TEXT,
  subject TEXT NOT NULL CHECK (char_length(trim(subject)) BETWEEN 3 AND 180),
  category TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 8000),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  reference_code TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed')
  ),
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_idempotency_key_uidx
  ON public.support_tickets (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_tickets_user_updated_idx
  ON public.support_tickets (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_updated_idx
  ON public.support_tickets (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_email_idx
  ON public.support_tickets (lower(requester_email));

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('customer', 'staff', 'system')),
  visibility TEXT NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer', 'internal')),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 8000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_created_idx
  ON public.support_ticket_messages (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS public.support_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug TEXT NOT NULL,
  helpful BOOLEAN NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS support_article_feedback_user_slug_uidx
  ON public.support_article_feedback (user_id, article_slug)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS support_article_feedback_ip_slug_uidx
  ON public.support_article_feedback (ip_hash, article_slug)
  WHERE user_id IS NULL AND ip_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_article_feedback_slug_idx
  ON public.support_article_feedback (article_slug, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_article_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_select_own ON public.support_tickets;
CREATE POLICY support_tickets_select_own ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS support_tickets_insert_own ON public.support_tickets;
CREATE POLICY support_tickets_insert_own ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS support_messages_select_own ON public.support_ticket_messages;
CREATE POLICY support_messages_select_own ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    visibility = 'customer'
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS support_messages_insert_own ON public.support_ticket_messages;
CREATE POLICY support_messages_insert_own ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_role = 'customer'
    AND visibility = 'customer'
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS support_feedback_insert_own ON public.support_article_feedback;
CREATE POLICY support_feedback_insert_own ON public.support_article_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS support_feedback_select_own ON public.support_article_feedback;
CREATE POLICY support_feedback_select_own ON public.support_article_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

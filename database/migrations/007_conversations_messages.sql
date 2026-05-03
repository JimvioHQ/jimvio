-- Conversations between buyers and vendors (suppliers)
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_vendor ON public.conversations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON public.conversation_messages(conversation_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can manage own conversations" ON public.conversations
FOR ALL USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Vendors can view conversations with them" ON public.conversations
FOR SELECT USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Participants can read messages" ON public.conversation_messages
FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE buyer_id = auth.uid() OR vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  )
);
CREATE POLICY "Participants can insert messages" ON public.conversation_messages
FOR INSERT WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE buyer_id = auth.uid() OR vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  )
);

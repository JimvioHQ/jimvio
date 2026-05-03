-- Direct inbox between two active members of the same community (not the marketplace buyer↔vendor chat).

CREATE TABLE public.community_inbox_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_low uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_high uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (user_low < user_high),
  UNIQUE (community_id, user_low, user_high)
);

CREATE INDEX idx_community_inbox_conv_community ON public.community_inbox_conversations(community_id);

CREATE TABLE public.community_inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.community_inbox_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_community_inbox_msg_conv ON public.community_inbox_messages(conversation_id, created_at);

ALTER TABLE public.community_inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_inbox_conv_select_participant"
  ON public.community_inbox_conversations FOR SELECT
  USING (
    (auth.uid() = user_low OR auth.uid() = user_high)
    AND EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_inbox_conversations.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "community_inbox_conv_insert_participant"
  ON public.community_inbox_conversations FOR INSERT
  WITH CHECK (
    (auth.uid() = user_low OR auth.uid() = user_high)
    AND EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_inbox_conversations.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "community_inbox_conv_update_participant"
  ON public.community_inbox_conversations FOR UPDATE
  USING (auth.uid() = user_low OR auth.uid() = user_high);

CREATE POLICY "community_inbox_msg_select_participant"
  ON public.community_inbox_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_inbox_conversations c
      WHERE c.id = community_inbox_messages.conversation_id
        AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  );

CREATE POLICY "community_inbox_msg_insert_sender"
  ON public.community_inbox_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_inbox_conversations c
      WHERE c.id = community_inbox_messages.conversation_id
        AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.get_or_create_community_inbox_conversation(
  p_community_id uuid,
  p_peer_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_peer_id = v_uid THEN
    RAISE EXCEPTION 'invalid peer';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_memberships
    WHERE community_id = p_community_id AND user_id = v_uid AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_memberships
    WHERE community_id = p_community_id AND user_id = p_peer_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'peer not in community';
  END IF;

  v_low := LEAST(v_uid, p_peer_id);
  v_high := GREATEST(v_uid, p_peer_id);

  INSERT INTO public.community_inbox_conversations (community_id, user_low, user_high)
  VALUES (p_community_id, v_low, v_high)
  ON CONFLICT (community_id, user_low, user_high)
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_community_inbox_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_community_inbox_conversation(uuid, uuid) TO authenticated;

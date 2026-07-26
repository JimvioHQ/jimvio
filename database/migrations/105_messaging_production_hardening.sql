-- Messaging production hardening (mirror of supabase/migrations/20260726075025_*.sql)
-- See supabase migration for full commentary.

ALTER TABLE public.community_inbox_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid,
  ADD COLUMN IF NOT EXISTS reply_to_body text,
  ADD COLUMN IF NOT EXISTS reply_to_sender text,
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

DROP POLICY IF EXISTS "community_inbox_messages_update_participant_reactions" ON public.community_inbox_messages;
DROP POLICY IF EXISTS "community_inbox_messages_update_sender" ON public.community_inbox_messages;
CREATE POLICY "community_inbox_messages_update_sender"
  ON public.community_inbox_messages
  FOR UPDATE
  USING (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.community_inbox_conversations c
      WHERE c.id = community_inbox_messages.conversation_id
        AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.community_inbox_conversations c
      WHERE c.id = community_inbox_messages.conversation_id
        AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.toggle_inbox_message_reaction(
  p_message_id uuid,
  p_emoji text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_conversation_id uuid;
  v_reactions jsonb;
  emj text;
  arr jsonb;
  new_arr jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  emj := nullif(trim(p_emoji), '');
  IF emj IS NULL OR length(emj) > 32 THEN RAISE EXCEPTION 'invalid emoji'; END IF;

  SELECT m.conversation_id, m.reactions
    INTO v_conversation_id, v_reactions
  FROM public.community_inbox_messages m
  WHERE m.id = p_message_id
    AND coalesce(m.is_deleted, false) = false;

  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.community_inbox_conversations c
    WHERE c.id = v_conversation_id
      AND (c.user_low = v_uid OR c.user_high = v_uid)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_reactions := coalesce(v_reactions, '{}'::jsonb);
  IF jsonb_typeof(v_reactions) != 'object' THEN v_reactions := '{}'::jsonb; END IF;
  arr := v_reactions -> emj;
  IF arr IS NULL OR jsonb_typeof(arr) != 'array' THEN arr := '[]'::jsonb; END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(arr) AS t(x) WHERE t.x = v_uid::text
  ) THEN
    SELECT CASE WHEN count(*) = 0 THEN NULL ELSE jsonb_agg(to_jsonb(x)) END
      INTO new_arr
    FROM (
      SELECT x
      FROM jsonb_array_elements_text(arr) AS t(x)
      WHERE x IS DISTINCT FROM v_uid::text
    ) s;
    IF new_arr IS NULL OR jsonb_array_length(new_arr) = 0 THEN
      v_reactions := v_reactions - emj;
    ELSE
      v_reactions := jsonb_set(v_reactions, ARRAY[emj], new_arr, true);
    END IF;
  ELSE
    arr := arr || jsonb_build_array(v_uid::text);
    v_reactions := jsonb_set(v_reactions, ARRAY[emj], arr, true);
  END IF;

  UPDATE public.community_inbox_messages
  SET reactions = v_reactions
  WHERE id = p_message_id;

  RETURN v_reactions;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_inbox_message_reaction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_inbox_message_reaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_inbox_message_reaction(uuid, text) TO service_role;

DROP POLICY IF EXISTS "messaging_reads_select_peer_inbox" ON public.messaging_conversation_reads;
CREATE POLICY "messaging_reads_select_peer_inbox"
  ON public.messaging_conversation_reads
  FOR SELECT
  USING (
    conversation_key LIKE 'inbox:%'
    AND EXISTS (
      SELECT 1
      FROM public.community_inbox_conversations c
      WHERE c.id::text = substring(conversation_key from 7)
        AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messaging_reads_select_peer_room" ON public.messaging_conversation_reads;
CREATE POLICY "messaging_reads_select_peer_room"
  ON public.messaging_conversation_reads
  FOR SELECT
  USING (
    conversation_key LIKE 'room:%'
    AND EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.community_memberships m
        ON m.community_id = r.community_id
       AND m.user_id = auth.uid()
       AND m.status = 'active'
      WHERE r.id::text = substring(conversation_key from 6)
    )
  );

DROP POLICY IF EXISTS "community_messages_update" ON public.community_messages;
CREATE POLICY "community_messages_update"
  ON public.community_messages
  FOR UPDATE
  USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.community_memberships m
        ON m.community_id = r.community_id
       AND m.user_id = auth.uid()
       AND m.status = 'active'
       AND m.role IN ('owner', 'admin', 'moderator')
      WHERE r.id = community_messages.room_id
    )
  )
  WITH CHECK (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.community_memberships m
        ON m.community_id = r.community_id
       AND m.user_id = auth.uid()
       AND m.status = 'active'
       AND m.role IN ('owner', 'admin', 'moderator')
      WHERE r.id = community_messages.room_id
    )
  );

CREATE OR REPLACE FUNCTION public.hub_room_last_messages(p_room_ids uuid[])
RETURNS TABLE (
  room_id uuid,
  body text,
  created_at timestamptz,
  sender_id uuid,
  message_type text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (m.room_id)
    m.room_id,
    m.body,
    m.created_at,
    m.sender_id,
    m.message_type
  FROM public.community_messages m
  WHERE m.room_id = ANY (p_room_ids)
    AND coalesce(m.is_deleted, false) = false
  ORDER BY m.room_id, m.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.hub_room_last_messages(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hub_room_last_messages(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hub_room_last_messages(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.hub_message_unread_counts(
  p_user_id uuid,
  p_inbox_ids uuid[],
  p_room_ids uuid[]
)
RETURNS TABLE (conversation_key text, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    'inbox:' || m.conversation_id::text AS conversation_key,
    count(*)::bigint AS unread_count
  FROM public.community_inbox_messages m
  LEFT JOIN public.messaging_conversation_reads r
    ON r.user_id = p_user_id
   AND r.conversation_key = 'inbox:' || m.conversation_id::text
  WHERE p_inbox_ids IS NOT NULL
    AND cardinality(p_inbox_ids) > 0
    AND m.conversation_id = ANY (p_inbox_ids)
    AND m.sender_id IS DISTINCT FROM p_user_id
    AND coalesce(m.is_deleted, false) = false
    AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
  GROUP BY m.conversation_id

  UNION ALL

  SELECT
    'room:' || m.room_id::text AS conversation_key,
    count(*)::bigint AS unread_count
  FROM public.community_messages m
  LEFT JOIN public.messaging_conversation_reads r
    ON r.user_id = p_user_id
   AND r.conversation_key = 'room:' || m.room_id::text
  WHERE p_room_ids IS NOT NULL
    AND cardinality(p_room_ids) > 0
    AND m.room_id = ANY (p_room_ids)
    AND m.sender_id IS DISTINCT FROM p_user_id
    AND coalesce(m.is_deleted, false) = false
    AND m.thread_id IS NULL
    AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
  GROUP BY m.room_id;
$$;

REVOKE ALL ON FUNCTION public.hub_message_unread_counts(uuid, uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hub_message_unread_counts(uuid, uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hub_message_unread_counts(uuid, uuid[], uuid[]) TO service_role;

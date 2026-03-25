-- Toggle reactions on any message (members); bump reply_count on thread replies.

CREATE OR REPLACE FUNCTION public.toggle_community_message_reaction(
  p_message_id uuid,
  p_emoji text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_id uuid;
  v_reactions jsonb;
  v_uid uuid := auth.uid();
  emj text;
  arr jsonb;
  new_arr jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  emj := nullif(trim(p_emoji), '');
  IF emj IS NULL OR length(emj) > 32 THEN
    RAISE EXCEPTION 'invalid emoji';
  END IF;

  SELECT cm.community_id, cm.reactions INTO v_community_id, v_reactions
  FROM public.community_messages cm
  WHERE cm.id = p_message_id AND cm.is_deleted = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_memberships m
    WHERE m.community_id = v_community_id
      AND m.user_id = v_uid
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_reactions := coalesce(v_reactions, '{}'::jsonb);
  IF jsonb_typeof(v_reactions) != 'object' THEN
    v_reactions := '{}'::jsonb;
  END IF;

  arr := v_reactions -> emj;
  IF arr IS NULL OR jsonb_typeof(arr) != 'array' THEN
    arr := '[]'::jsonb;
  END IF;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(arr) AS t(x) WHERE t.x = v_uid::text) THEN
    SELECT CASE WHEN count(*) = 0 THEN NULL ELSE jsonb_agg(to_jsonb(x)) END INTO new_arr
    FROM (
      SELECT x FROM jsonb_array_elements_text(arr) AS t(x) WHERE x IS DISTINCT FROM v_uid::text
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

  UPDATE public.community_messages
  SET reactions = v_reactions
  WHERE id = p_message_id;

  RETURN v_reactions;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_community_message_reaction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_community_message_reaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_community_message_reaction(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.bump_parent_message_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE public.community_messages
    SET reply_count = COALESCE(reply_count, 0) + 1
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_community_messages_bump_reply ON public.community_messages;
CREATE TRIGGER tr_community_messages_bump_reply
  AFTER INSERT ON public.community_messages
  FOR EACH ROW
  EXECUTE PROCEDURE public.bump_parent_message_reply_count();

-- Harden affiliate click RPC so invalid IP strings cannot abort recording.
CREATE OR REPLACE FUNCTION public.record_affiliate_click(
  p_link_id uuid,
  p_affiliate_id uuid,
  p_campaign_id uuid DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_session_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  click_id uuid;
  is_uniq boolean := true;
  safe_ip inet := NULL;
BEGIN
  IF p_ip IS NOT NULL AND btrim(p_ip) <> '' THEN
    BEGIN
      safe_ip := p_ip::inet;
    EXCEPTION WHEN others THEN
      safe_ip := NULL;
    END;
  END IF;

  IF p_session_key IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.affiliate_clicks
      WHERE link_id = p_link_id
        AND session_key = p_session_key
        AND created_at > now() - interval '24 hours'
    ) INTO is_uniq;
  END IF;

  INSERT INTO public.affiliate_clicks (
    link_id, affiliate_id, campaign_id, ip_address, user_agent,
    referrer, device_type, session_key, is_unique
  ) VALUES (
    p_link_id, p_affiliate_id, p_campaign_id, safe_ip, p_user_agent,
    p_referrer, p_device_type, p_session_key, is_uniq
  )
  RETURNING id INTO click_id;

  UPDATE public.affiliate_links
  SET
    total_clicks = COALESCE(total_clicks, 0) + 1,
    unique_clicks = COALESCE(unique_clicks, 0) + CASE WHEN is_uniq THEN 1 ELSE 0 END
  WHERE id = p_link_id;

  UPDATE public.affiliates
  SET total_clicks = COALESCE(total_clicks, 0) + 1,
      updated_at = now()
  WHERE id = p_affiliate_id;

  RETURN click_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_affiliate_click(uuid, uuid, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(uuid, uuid, uuid, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(uuid, uuid, uuid, text, text, text, text, text) TO authenticated;

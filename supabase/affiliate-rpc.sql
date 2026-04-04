-- ── AFFILIATE CLICK COUNTER ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_affiliate_click(link_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.affiliate_links 
  SET total_clicks = total_clicks + 1, 
      unique_clicks = unique_clicks + 1 -- Simplified for now
  WHERE id = link_id;
END;
$$;

-- ── AFFILIATE EARNINGS COUNTER ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_affiliate_earnings(p_affiliate_id uuid, p_amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.affiliates 
  SET total_earnings = total_earnings + p_amount,
      total_conversions = total_conversions + 1
  WHERE id = p_affiliate_id;
END;
$$;

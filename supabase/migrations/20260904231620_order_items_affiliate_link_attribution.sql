-- Persist affiliate link + campaign on order line items so commission creation
-- can update per-link conversion/earnings counters.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS affiliate_link_id uuid NULL
    REFERENCES public.affiliate_links(id) ON DELETE SET NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS affiliate_campaign_id uuid NULL
    REFERENCES public.affiliate_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS order_items_affiliate_link_id_idx
  ON public.order_items (affiliate_link_id)
  WHERE affiliate_link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS order_items_affiliate_campaign_id_idx
  ON public.order_items (affiliate_campaign_id)
  WHERE affiliate_campaign_id IS NOT NULL;

COMMENT ON COLUMN public.order_items.affiliate_link_id IS
  'Affiliate link that attributed this line item (from cart sticky link or cookie resolve).';

COMMENT ON COLUMN public.order_items.affiliate_campaign_id IS
  'Affiliate campaign associated with the attributed link, when present.';

-- T-3 follow-up: orders.status is an enum; compare as text.
CREATE OR REPLACE FUNCTION public.enforce_verified_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  has_order boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.buyer_id = NEW.buyer_id
      AND o.payment_status = 'paid'
      AND COALESCE(o.status::text, '') NOT IN ('cancelled', 'refunded')
      AND (NEW.product_id IS NULL OR oi.product_id = NEW.product_id)
      AND (NEW.vendor_id IS NULL OR oi.vendor_id = NEW.vendor_id OR o.vendor_id = NEW.vendor_id)
  ) INTO has_order;

  NEW.is_verified_purchase := COALESCE(has_order, false);

  IF auth.uid() IS NOT NULL AND NOT NEW.is_verified_purchase THEN
    RAISE EXCEPTION 'Only buyers with a paid order can leave a review'
      USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    NEW.is_featured := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.is_featured, false) ELSE false END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_verified_review() FROM PUBLIC, anon, authenticated;

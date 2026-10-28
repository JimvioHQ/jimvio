-- T-3: reviews come only from real buyers. The verified flag is computed by
-- the database (never trusted from the client), and a signed-in user cannot
-- review a product or store without a paid, non-cancelled order for it.
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
      AND COALESCE(o.status, '') NOT IN ('cancelled', 'refunded')
      AND (NEW.product_id IS NULL OR oi.product_id = NEW.product_id)
      AND (NEW.vendor_id IS NULL OR oi.vendor_id = NEW.vendor_id OR o.vendor_id = NEW.vendor_id)
  ) INTO has_order;

  NEW.is_verified_purchase := COALESCE(has_order, false);

  -- Signed-in users (not service jobs) need a qualifying order.
  IF auth.uid() IS NOT NULL AND NOT NEW.is_verified_purchase THEN
    RAISE EXCEPTION 'Only buyers with a paid order can leave a review'
      USING ERRCODE = 'P0001';
  END IF;

  -- Featuring is an admin decision, not something a reviewer can set.
  IF auth.uid() IS NOT NULL THEN
    NEW.is_featured := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.is_featured, false) ELSE false END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_verified_review() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_enforce_verified_review' AND tgrelid = 'public.reviews'::regclass
  ) THEN
    CREATE TRIGGER trg_enforce_verified_review
    BEFORE INSERT OR UPDATE OF product_id, vendor_id, buyer_id, is_verified_purchase, is_featured, rating, body, title
    ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.enforce_verified_review();
  END IF;
END $$;

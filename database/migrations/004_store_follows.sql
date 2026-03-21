-- ============================================================
-- JIMVIO — Store Following & Enhanced Ratings
-- ============================================================

-- 1. Create vendor_followers table
CREATE TABLE IF NOT EXISTS public.vendor_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, user_id)
);

-- 2. Add follower count to vendors table (optional but good for performance)
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS follower_count INT DEFAULT 0;

-- 3. Trigger to update follower count
CREATE OR REPLACE FUNCTION public.update_vendor_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.vendors SET follower_count = follower_count + 1 WHERE id = NEW.vendor_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.vendors SET follower_count = follower_count - 1 WHERE id = OLD.vendor_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vendor_follower_change
  AFTER INSERT OR DELETE ON public.vendor_followers
  FOR EACH ROW EXECUTE FUNCTION public.update_vendor_follower_count();

-- 4. RLS for vendor_followers
ALTER TABLE public.vendor_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Followers are publicly viewable" ON public.vendor_followers
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows" ON public.vendor_followers
  FOR ALL USING (auth.uid() = user_id);

-- 5. Add vendor_id to reviews for direct store rating
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ALTER COLUMN product_id DROP NOT NULL; -- Allow store-only reviews

-- 6. Trigger to update vendor rating when review added
CREATE OR REPLACE FUNCTION public.update_vendor_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_id IS NOT NULL THEN
    UPDATE public.vendors
    SET rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.reviews WHERE vendor_id = NEW.vendor_id)
    WHERE id = NEW.vendor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_vendor_review_change ON public.reviews;
CREATE TRIGGER on_vendor_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_vendor_overall_rating();

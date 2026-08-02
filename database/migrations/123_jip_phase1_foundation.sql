-- ============================================================
-- JIP Phase 1 Foundation — reviews, response time, XP awards
-- Additive only. profiles remains source of truth.
-- ============================================================

ALTER TABLE public.jip_identity
  ADD COLUMN IF NOT EXISTS response_time_hours numeric(8,2),
  ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

-- Verified bidirectional reviews (brand ↔ creator)
CREATE TABLE IF NOT EXISTS public.jip_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('brand_to_creator', 'creator_to_brand')),
  rating numeric(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  body text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  verification_source text,
  booking_id uuid REFERENCES public.jip_bookings(id) ON DELETE SET NULL,
  campaign_id uuid,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_user_id, reviewer_user_id, direction, booking_id)
);

CREATE INDEX IF NOT EXISTS jip_reviews_subject_idx
  ON public.jip_reviews (subject_user_id, is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS jip_reviews_reviewer_idx
  ON public.jip_reviews (reviewer_user_id, created_at DESC);

-- XP ledger for achievements engine
CREATE TABLE IF NOT EXISTS public.jip_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  ref_type text,
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jip_xp_events_user_idx
  ON public.jip_xp_events (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.jip_award_xp(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_type text DEFAULT NULL,
  p_ref_id text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_xp integer;
BEGIN
  IF p_amount = 0 THEN
    SELECT xp INTO new_xp FROM public.jip_identity WHERE user_id = p_user_id;
    RETURN COALESCE(new_xp, 0);
  END IF;

  INSERT INTO public.jip_identity (user_id, xp)
  VALUES (p_user_id, GREATEST(p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET xp = public.jip_identity.xp + p_amount,
        updated_at = now()
  RETURNING xp INTO new_xp;

  INSERT INTO public.jip_xp_events (user_id, amount, reason, ref_type, ref_id)
  VALUES (p_user_id, p_amount, p_reason, p_ref_type, p_ref_id);

  RETURN new_xp;
END;
$$;

CREATE OR REPLACE FUNCTION public.jip_refresh_review_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  target := COALESCE(NEW.subject_user_id, OLD.subject_user_id);
  UPDATE public.jip_identity ji
  SET
    avg_rating = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 2)
      FROM public.jip_reviews r
      WHERE r.subject_user_id = target AND r.is_public = true AND r.is_verified = true
    ), 0),
    review_count = COALESCE((
      SELECT COUNT(*)::integer
      FROM public.jip_reviews r
      WHERE r.subject_user_id = target AND r.is_public = true AND r.is_verified = true
    ), 0),
    updated_at = now()
  WHERE ji.user_id = target;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS jip_reviews_refresh_agg ON public.jip_reviews;
CREATE TRIGGER jip_reviews_refresh_agg
  AFTER INSERT OR UPDATE OR DELETE ON public.jip_reviews
  FOR EACH ROW EXECUTE FUNCTION public.jip_refresh_review_aggregates();

DROP TRIGGER IF EXISTS jip_reviews_touch ON public.jip_reviews;
CREATE TRIGGER jip_reviews_touch
  BEFORE UPDATE ON public.jip_reviews
  FOR EACH ROW EXECUTE FUNCTION public.jip_touch_updated_at();

ALTER TABLE public.jip_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_xp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jip_reviews_select ON public.jip_reviews;
CREATE POLICY jip_reviews_select ON public.jip_reviews
  FOR SELECT USING (
    is_public = true
    OR subject_user_id = auth.uid()
    OR reviewer_user_id = auth.uid()
  );

DROP POLICY IF EXISTS jip_reviews_insert ON public.jip_reviews;
CREATE POLICY jip_reviews_insert ON public.jip_reviews
  FOR INSERT WITH CHECK (reviewer_user_id = auth.uid());

DROP POLICY IF EXISTS jip_reviews_update ON public.jip_reviews;
CREATE POLICY jip_reviews_update ON public.jip_reviews
  FOR UPDATE USING (reviewer_user_id = auth.uid());

DROP POLICY IF EXISTS jip_xp_events_own ON public.jip_xp_events;
CREATE POLICY jip_xp_events_own ON public.jip_xp_events
  FOR SELECT USING (user_id = auth.uid());

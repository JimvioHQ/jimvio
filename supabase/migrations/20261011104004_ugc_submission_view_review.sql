-- Separate creator-claimed views from owner-accepted views used for CPM settlement.
ALTER TABLE public.ugc_submissions
  ADD COLUMN IF NOT EXISTS claimed_views bigint,
  ADD COLUMN IF NOT EXISTS accepted_views bigint,
  ADD COLUMN IF NOT EXISTS views_reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS views_reviewed_at timestamptz;

COMMENT ON COLUMN public.ugc_submissions.claimed_views IS
  'Views the creator reported. Null means not provided. Never used alone as a payout basis.';
COMMENT ON COLUMN public.ugc_submissions.accepted_views IS
  'Views the campaign reviewer accepted for CPM payment. Null means not reviewed. Not a platform-verified count.';

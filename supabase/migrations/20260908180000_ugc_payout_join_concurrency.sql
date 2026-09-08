-- Twin of database/migrations/145_ugc_payout_join_concurrency.sql
-- Fixed payout one-shot unique index + atomic max_participants trigger.

ALTER TABLE public.ugc_payouts
  ADD COLUMN IF NOT EXISTS is_fixed_one_shot boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ugc_payouts.is_fixed_one_shot IS
  'True for the single fixed_per_content approval payout for a submission. Per-views deltas stay false.';

WITH ranked AS (
  SELECT
    up.id,
    ROW_NUMBER() OVER (
      PARTITION BY up.submission_id
      ORDER BY up.created_at ASC NULLS LAST, up.id ASC
    ) AS rn
  FROM public.ugc_payouts up
  INNER JOIN public.ugc_submissions s ON s.id = up.submission_id
  INNER JOIN public.ugc_campaigns c ON c.id = s.campaign_id
  WHERE c.payment_model = 'fixed_per_content'
)
UPDATE public.ugc_payouts p
SET is_fixed_one_shot = true
FROM ranked r
WHERE p.id = r.id
  AND r.rn = 1
  AND p.is_fixed_one_shot IS DISTINCT FROM true;

CREATE UNIQUE INDEX IF NOT EXISTS ugc_payouts_fixed_one_shot_submission_uidx
  ON public.ugc_payouts (submission_id)
  WHERE is_fixed_one_shot IS TRUE;

CREATE OR REPLACE FUNCTION public.ugc_enforce_campaign_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_p integer;
  occupied integer;
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('accepted', 'pending', 'invited', 'waitlisted') THEN
    RETURN NEW;
  END IF;

  SELECT c.max_participants
  INTO max_p
  FROM public.ugc_campaigns c
  WHERE c.id = NEW.campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF max_p IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
  INTO occupied
  FROM public.ugc_campaign_participants p
  WHERE p.campaign_id = NEW.campaign_id
    AND p.status IN ('accepted', 'pending', 'invited', 'waitlisted')
    AND p.id IS DISTINCT FROM NEW.id;

  IF occupied >= max_p THEN
    RAISE EXCEPTION 'Campaign is full'
      USING ERRCODE = 'check_violation',
            HINT = 'max_participants';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ugc_enforce_campaign_capacity ON public.ugc_campaign_participants;

CREATE TRIGGER trg_ugc_enforce_campaign_capacity
  BEFORE INSERT OR UPDATE OF status
  ON public.ugc_campaign_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.ugc_enforce_campaign_capacity();

COMMENT ON FUNCTION public.ugc_enforce_campaign_capacity() IS
  'Locks ugc_campaigns row then enforces max_participants for occupying participant statuses.';

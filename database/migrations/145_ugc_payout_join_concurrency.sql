-- UGC reliability: fixed-payout DB idempotency + atomic max_participants enforcement.
-- Additive. Does not invent financial records or weaken RLS.
--
-- 1) Fixed one-shot payouts get a partial unique index on submission_id.
--    Per-views sync may still create multiple non-fixed rows per submission.
-- 2) Campaign capacity is enforced by a BEFORE INSERT/UPDATE trigger that
--    locks the campaign row (FOR UPDATE) before counting occupying participants.

-- ── Fixed payout one-shot marker ─────────────────────────────────────────────
ALTER TABLE public.ugc_payouts
  ADD COLUMN IF NOT EXISTS is_fixed_one_shot boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ugc_payouts.is_fixed_one_shot IS
  'True for the single fixed_per_content approval payout for a submission. Per-views deltas stay false.';

-- Preserve all existing rows. Mark at most one fixed payout per submission as one-shot
-- (earliest created) so the unique index can be created safely without deletes.
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

-- ── Atomic max_participants ──────────────────────────────────────────────────
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

  -- Serialize concurrent join/accept attempts for this campaign.
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

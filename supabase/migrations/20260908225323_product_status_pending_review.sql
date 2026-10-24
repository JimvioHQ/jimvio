DO $$ BEGIN
  ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'pending_review';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;
-- Allow affiliates to set payout method for withdrawals
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS payout_account TEXT;

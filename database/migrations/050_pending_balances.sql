-- ============================================================
-- MIGRATION 050: PENDING BALANCES (FRAUD DELAY SYSTEM)
-- ============================================================
-- Adds pending balance tracking to securely hold UGC earnings
-- for 48 hours to prevent botting fraud.
-- ============================================================

ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS pending_balance numeric DEFAULT 0;

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS pending_balance numeric DEFAULT 0;

-- Ensure payouts table tracks when a pending payout was created
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS release_date timestamptz;

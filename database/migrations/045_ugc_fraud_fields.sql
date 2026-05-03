-- ============================================================
-- MIGRATION 045: UGC FRAUD TRACKING FIELDS
-- ============================================================
-- Adds fraud and suspicious metrics tracking to UGC submissions.
-- ============================================================

ALTER TABLE public.ugc_submissions
  ADD COLUMN IF NOT EXISTS is_suspicious boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraud_score   numeric  DEFAULT 0;

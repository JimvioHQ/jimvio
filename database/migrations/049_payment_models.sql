-- ============================================================
-- MIGRATION 049: FIXED RATE PAYMENT MODEL
-- ============================================================
-- Introduces fixed-rate "pay-per-content" compensation 
-- overriding the default daily pay-per-views model.
-- ============================================================

CREATE TYPE public.ugc_payment_model AS ENUM ('per_views', 'fixed_per_content');

ALTER TABLE public.ugc_campaigns
  ADD COLUMN IF NOT EXISTS payment_model public.ugc_payment_model DEFAULT 'per_views',
  ADD COLUMN IF NOT EXISTS fixed_rate   numeric DEFAULT 0;

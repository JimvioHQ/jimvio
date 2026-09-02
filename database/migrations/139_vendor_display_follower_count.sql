-- Customer-facing store social-proof baseline.
-- Canonical copy: supabase/migrations/20260902080000_vendor_display_follower_count.sql

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS display_follower_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.vendors.display_follower_count IS
  'Customer-facing social-proof baseline. Never written into vendor_followers.';

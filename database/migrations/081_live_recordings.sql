-- DEPRECATED — DO NOT APPLY ON PRODUCTION
--
-- live_recordings already exists in production (RC4 columns present).
-- Use 083_live_recordings_repair.sql for idempotent indexes / RLS / realtime.
--
-- This stub is intentionally a no-op.

DO $$
BEGIN
  RAISE NOTICE
    '081_live_recordings.sql is deprecated. Apply 083_live_recordings_repair.sql after 082.';
END $$;

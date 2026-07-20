-- DEPRECATED — DO NOT APPLY ON PRODUCTION AS A SCHEMA BUILDER
--
-- Historical note: an earlier revision used CREATE TABLE IF NOT EXISTS for
-- public.live_sessions with a greenfield column set that included room_id.
--
-- Production already had public.live_sessions (space_id-based streaming schema).
-- That no-op CREATE was followed by an index on room_id, which failed with:
--   ERROR: column "room_id" does not exist
--
-- Apply instead (in order):
--   082_live_schema_repair.sql
--   083_live_recordings_repair.sql
--
-- This stub is intentionally a no-op so accidental re-runs cannot corrupt data.

DO $$
BEGIN
  RAISE NOTICE
    '080_live_studio.sql is deprecated. Apply 082_live_schema_repair.sql then 083_live_recordings_repair.sql.';
END $$;

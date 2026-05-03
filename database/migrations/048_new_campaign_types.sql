-- ============================================================
-- MIGRATION 048: NEW CAMPAIGN TYPES (MUSIC & PROMOTION)
-- ============================================================
-- Adds the Music Clipping and Promotion campaign types
-- and their specific required fields.
-- ============================================================

-- Safely extend the ENUM type
ALTER TYPE ugc_campaign_type ADD VALUE IF NOT EXISTS 'music_clipping';
ALTER TYPE ugc_campaign_type ADD VALUE IF NOT EXISTS 'promotion';

-- Add new columns to campaigns table for the contextual requirements
ALTER TABLE public.ugc_campaigns
  ADD COLUMN IF NOT EXISTS music_track_url       text,
  ADD COLUMN IF NOT EXISTS music_artist_name     text,
  ADD COLUMN IF NOT EXISTS promotion_target      text,
  ADD COLUMN IF NOT EXISTS promotion_target_url  text;

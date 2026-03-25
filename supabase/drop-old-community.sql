-- ════════════════════════════════════════════════════════════════
-- DROP OLD COMMUNITY TABLES + RELATED TYPES & FUNCTION
-- Run this in Supabase SQL editor BEFORE running new community schema
-- WARNING: Permanently deletes all community data and related enum-only types
-- ════════════════════════════════════════════════════════════════
--
-- Tables removed (from your schema):
--   public.communities
--   public.community_members
--   public.community_posts
--   public.community_post_comments
--   public.community_saved_posts
--
-- Also drops:
--   • Trigger function update_community_member_count (001_initial_schema)
--   • Types community_member_status, subscription_plan (only used by community_members)
--
-- Does NOT drop shared enums user_role / notification_type; those still contain
-- legacy values (community_owner, community). Clean rows + migrate enums separately if needed.
-- ════════════════════════════════════════════════════════════════

-- Optional: remove notifications that used the old "community" notification type
DELETE FROM public.notifications
WHERE type::text = 'community';

-- Optional: remove user_roles rows for community owners (adjust if your enum still has the value)
DELETE FROM public.user_roles
WHERE role::text = 'community_owner';

-- Trigger + function depend on community_members; drop trigger first so function can be dropped cleanly
DROP TRIGGER IF EXISTS on_community_member_change ON public.community_members;

-- Child → parent order (FK-safe)
DROP TABLE IF EXISTS public.community_saved_posts CASCADE;
DROP TABLE IF EXISTS public.community_post_comments CASCADE;
DROP TABLE IF EXISTS public.community_posts CASCADE;
DROP TABLE IF EXISTS public.community_members CASCADE;
DROP TABLE IF EXISTS public.communities CASCADE;

DROP FUNCTION IF EXISTS public.update_community_member_count() CASCADE;

-- Only referenced by community_members in 001_initial_schema.sql
DROP TYPE IF EXISTS public.community_member_status CASCADE;
DROP TYPE IF EXISTS public.subscription_plan CASCADE;

-- ── Follow-up (run in a separate migration if you need a clean enum surface) ──
-- • user_role may still list 'community_owner' — recreate type or use PG tooling to drop the value.
-- • notification_type may still list 'community' — same.
-- • Re-create RLS policies for any new community tables in your new schema migration.

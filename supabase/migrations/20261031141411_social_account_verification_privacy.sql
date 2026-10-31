-- Restores the local migration file for a migration already recorded in Supabase.
-- The remote migration removed the broad select policy; do not reapply manually.
DROP POLICY IF EXISTS jip_social_select ON public.jip_social_accounts;

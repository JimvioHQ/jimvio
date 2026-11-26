-- Do not expose full membership rows (payment references, amount paid, moderation state, and mutes)
-- directly to every authenticated member of the same community.
DROP POLICY IF EXISTS memberships_select_active_peers ON public.community_memberships;

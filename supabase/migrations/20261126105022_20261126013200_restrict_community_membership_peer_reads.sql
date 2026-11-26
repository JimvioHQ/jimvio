-- Community roster endpoints already authorize the caller and read roster
-- data through the service-role client. Do not expose full membership rows
-- (including payment references, amount paid, moderation state, and mutes)
-- directly to every authenticated member of the same community.

DROP POLICY IF EXISTS memberships_select_active_peers ON public.community_memberships;

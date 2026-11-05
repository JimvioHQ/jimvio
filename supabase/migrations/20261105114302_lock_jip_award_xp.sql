-- XP can only be awarded by the server (service role). Anyone holding the
-- public key could previously give or remove XP for any user.
revoke execute on function public.jip_award_xp(uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.jip_award_xp(uuid, integer, text, text, text) to service_role;

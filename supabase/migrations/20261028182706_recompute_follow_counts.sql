-- Recompute follower/following counts from user_follows after persona
-- follows were removed (the delete trigger decrements from a cached value
-- that already excluded personas, which floored some counts at 0).
UPDATE public.profiles p
SET follower_count = (SELECT count(*) FROM public.user_follows f WHERE f.following_id = p.id),
    following_count = (SELECT count(*) FROM public.user_follows f WHERE f.follower_id = p.id)
WHERE p.follower_count IS DISTINCT FROM (SELECT count(*) FROM public.user_follows f WHERE f.following_id = p.id)
   OR p.following_count IS DISTINCT FROM (SELECT count(*) FROM public.user_follows f WHERE f.follower_id = p.id);

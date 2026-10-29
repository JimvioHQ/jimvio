-- Realtime DELETE/UPDATE events need the full old row so filters like
-- session_id=eq.X match and clients know who left, without a refresh.
alter table public.live_session_participants replica identity full;
alter table public.live_session_messages replica identity full;

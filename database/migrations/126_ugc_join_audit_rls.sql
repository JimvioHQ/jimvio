-- Enable RLS on ugc_join_audit (created without RLS in 20260709_ugc_join_engine).
-- Service role continues to bypass RLS for application writes.
-- Anon/authenticated have no policies → no PostgREST access to audit rows.

ALTER TABLE public.ugc_join_audit ENABLE ROW LEVEL SECURITY;

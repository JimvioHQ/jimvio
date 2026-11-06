-- SECURITY DEFINER functions that only serve as triggers (return type "trigger") were
-- also exposed as /rest/v1/rpc/* to anon and signed-in users (Supabase advisors
-- 0028/0029). Trigger execution does not check EXECUTE on the function, so revoking
-- it from API roles changes nothing for the triggers and closes the RPC surface.
--
-- Rollback (per function): grant execute on function public.<name>() to anon, authenticated;
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prosecdef
      and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

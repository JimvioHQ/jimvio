-- Performance: evaluate auth.uid()/auth.role()/auth.jwt() once per query
-- instead of once per row (Supabase lint auth_rls_initplan). Same results.
-- Original definitions are kept in ops_backup.policies_20261105 for rollback.
create schema if not exists ops_backup;
revoke all on schema ops_backup from public, anon, authenticated;

create table if not exists ops_backup.policies_20261105 as
  select schemaname, tablename, policyname, cmd, qual, with_check, now() as saved_at
  from pg_policies where schemaname = 'public';

do $$
declare
  r record;
  pat constant text := '(?<!SELECT )auth\.(uid|role|jwt)\(\)';
  new_qual text;
  new_check text;
  sql text;
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ pat or coalesce(with_check, '') ~ pat)
  loop
    new_qual := case when r.qual is null then null else regexp_replace(r.qual, pat, '(SELECT auth.\1())', 'g') end;
    new_check := case when r.with_check is null then null else regexp_replace(r.with_check, pat, '(SELECT auth.\1())', 'g') end;
    sql := format('alter policy %I on public.%I', r.policyname, r.tablename);
    if new_qual is not null then sql := sql || format(' using (%s)', new_qual); end if;
    if new_check is not null then sql := sql || format(' with check (%s)', new_check); end if;
    execute sql;
  end loop;
end $$;

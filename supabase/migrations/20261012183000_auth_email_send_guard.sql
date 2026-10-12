-- Durable signup/recovery resend guard. Service role only. Buckets are hashes, not addresses.
create table if not exists public.auth_email_send_guard (
  bucket text primary key,
  window_started_at timestamptz not null,
  hits integer not null check (hits >= 0)
);

alter table public.auth_email_send_guard enable row level security;
revoke all on table public.auth_email_send_guard from public, anon, authenticated;

create or replace function public.consume_auth_email_send(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  allowed boolean;
begin
  if p_bucket is null
     or length(p_bucket) < 32
     or p_limit < 1
     or p_window_seconds < 1
     or p_window_seconds > 86400 then
    return false;
  end if;

  insert into public.auth_email_send_guard as g (bucket, window_started_at, hits)
  values (p_bucket, clock_timestamp(), 1)
  on conflict (bucket) do update
    set
      window_started_at = case
        when g.window_started_at <= clock_timestamp() - make_interval(secs => p_window_seconds)
          then clock_timestamp()
        else g.window_started_at
      end,
      hits = case
        when g.window_started_at <= clock_timestamp() - make_interval(secs => p_window_seconds)
          then 1
        else g.hits + 1
      end
  returning hits <= p_limit into allowed;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.consume_auth_email_send(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_auth_email_send(text, integer, integer) to service_role;

-- Persist the OAuth resource binding beyond the short-lived authorization request.
-- This lets the Custom Access Token Hook bind both initial and refreshed tokens.
create table if not exists public.mcp_oauth_resource_bindings (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.oauth_clients(id) on delete cascade,
  resource text not null check (resource = 'https://www.jimvio.com/api/mcp'),
  created_at timestamptz not null default now(),
  primary key (user_id, client_id, resource)
);

alter table public.mcp_oauth_resource_bindings enable row level security;
revoke all on table public.mcp_oauth_resource_bindings from public, anon, authenticated;
grant select on table public.mcp_oauth_resource_bindings to supabase_auth_admin;

create or replace function public.register_mcp_oauth_resource_binding(p_authorization_id text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $register$
declare
  current_user_id uuid := auth.uid();
  oauth_client_id uuid;
  requested_resource text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select oa.client_id, oa.resource
    into oauth_client_id, requested_resource
    from auth.oauth_authorizations as oa
   where oa.authorization_id = p_authorization_id
     and oa.user_id = current_user_id
     and oa.status::text = 'pending'
     and oa.expires_at > now()
   for update;

  if oauth_client_id is null then
    raise exception 'OAuth authorization request is missing, expired, or belongs to another user';
  end if;

  if requested_resource is distinct from 'https://www.jimvio.com/api/mcp' then
    raise exception 'Unexpected OAuth resource';
  end if;

  insert into public.mcp_oauth_resource_bindings (user_id, client_id, resource)
  values (current_user_id, oauth_client_id, requested_resource)
  on conflict (user_id, client_id, resource)
  do update set created_at = now();
end;
$register$;

revoke all on function public.register_mcp_oauth_resource_binding(text) from public, anon;
grant execute on function public.register_mcp_oauth_resource_binding(text) to authenticated;

-- Replace the initial short-lived authorization lookup with a persistent,
-- consent-aware binding that also works when OAuth access tokens are refreshed.
create or replace function public.jimvio_mcp_custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $hook$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  auth_method text := coalesce(event ->> 'authentication_method', '');
  token_user_id uuid := nullif(event ->> 'user_id', '')::uuid;
  oauth_client_id uuid := nullif(claims ->> 'client_id', '')::uuid;
  resources text[];
begin
  if auth_method in ('oauth', 'oauth_provider/authorization_code', 'token_refresh')
     and oauth_client_id is not null
     and token_user_id is not null then
    select array_agg(distinct binding.resource)
      into resources
      from public.mcp_oauth_resource_bindings as binding
      join auth.oauth_consents as consent
        on consent.user_id = binding.user_id
       and consent.client_id = binding.client_id
       and consent.revoked_at is null
     where binding.user_id = token_user_id
       and binding.client_id = oauth_client_id;

    if coalesce(cardinality(resources), 0) > 1 then
      raise exception 'MCP OAuth resource binding is ambiguous';
    end if;

    if coalesce(cardinality(resources), 0) = 1 then
      claims := jsonb_set(claims, '{aud}', to_jsonb(resources[1]), true);
    end if;
  end if;

  return jsonb_build_object('claims', claims);
end;
$hook$;

revoke all on function public.jimvio_mcp_custom_access_token_hook(jsonb) from public;
grant usage on schema public to supabase_auth_admin;
grant usage on schema auth to supabase_auth_admin;
grant select on table public.mcp_oauth_resource_bindings to supabase_auth_admin;
grant select on table auth.oauth_consents to supabase_auth_admin;
grant execute on function public.jimvio_mcp_custom_access_token_hook(jsonb) to supabase_auth_admin;

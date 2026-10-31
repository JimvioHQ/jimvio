-- Resource-bound access tokens for the Jimvio Media MCP server.
-- This function is inert until selected as the Custom Access Token Hook in
-- Supabase Dashboard > Authentication > Hooks.
create or replace function public.jimvio_mcp_custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
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
    select array_agg(distinct authorization.resource)
      into resources
      from auth.oauth_authorizations as authorization
     where authorization.user_id = token_user_id
       and authorization.client_id = oauth_client_id
       and authorization.status::text = 'approved'
       and authorization.expires_at > now()
       and authorization.resource is not null;

    -- Fail closed if the same user/client has no unexpired resource binding,
    -- or if multiple distinct resources make the audience ambiguous.
    if coalesce(cardinality(resources), 0) <> 1 then
      raise exception 'MCP OAuth resource binding is missing or ambiguous';
    end if;

    claims := jsonb_set(claims, '{aud}', to_jsonb(resources[1]), true);
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

revoke all on function public.jimvio_mcp_custom_access_token_hook(jsonb) from public;
grant usage on schema public to supabase_auth_admin;
grant usage on schema auth to supabase_auth_admin;
grant select on table auth.oauth_authorizations to supabase_auth_admin;
grant execute on function public.jimvio_mcp_custom_access_token_hook(jsonb) to supabase_auth_admin;

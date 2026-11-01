# Jimvio Media Publisher MCP

## Endpoint

- Streamable HTTP endpoint: `https://www.jimvio.com/api/mcp`
- Protected Resource Metadata: `https://www.jimvio.com/.well-known/oauth-protected-resource/api/mcp`
- OAuth authorization server discovery: Supabase project discovery URL at `https://vsfhwfimudpdipdkxbww.supabase.co/.well-known/oauth-authorization-server/auth/v1`
- OAuth consent path: `/oauth/consent`

Set `MCP_RESOURCE_URL=https://www.jimvio.com/api/mcp` in the Vercel Production and Preview environments.

## Tools

1. `search_media_articles`
2. `get_media_article`
3. `create_media_draft`
4. `update_media_article`
5. `upload_media_featured_image`
6. `publish_media_article`
7. `verify_published_article`

All seven tools require a valid Supabase OAuth access token bound to the exact MCP resource and an active Jimvio `admin` / `super_admin` role, or a server-configured bootstrap administrator email. The existing Media CMS store, validation planner, Cloudinary editorial folder, audit table and cache tags are reused.

## Publishing safety

Draft creation and editing never publish. Only `publish_media_article` can publish, and it requires the exact confirmation string `PUBLISH <article_id>` plus the latest `expectedUpdatedAt` revision. A stale revision is rejected. Publication and image uploads are recorded in the existing admin audit log.

## OAuth setup

1. In Supabase Dashboard, open Authentication > OAuth Server and set Authorization Path to `/oauth/consent`.
2. Keep user approval enabled. Dynamic Client Registration should only be enabled if Jimvio intends to allow arbitrary MCP clients to register; otherwise pre-register the approved ChatGPT client.
3. Apply migrations `20261031160339_jimvio_mcp_oauth_resource_hook.sql` and `20261031160918_jimvio_mcp_oauth_resource_bindings.sql`.
4. In Authentication > Hooks, enable the Custom Access Token Hook and select `public.jimvio_mcp_custom_access_token_hook`.
5. OAuth consent records the requested resource against the authenticated user and OAuth client before approval. The token hook reads only active, non-revoked consent bindings and sets `aud=https://www.jimvio.com/api/mcp`, including on refresh.
6. Verify that newly issued OAuth access tokens have the exact MCP resource audience. Tokens with only `aud=authenticated` are intentionally rejected.
7. Ensure the OAuth authorization request includes the resource parameter `https://www.jimvio.com/api/mcp`.

The migrations create the resource-binding table and hook function but do not activate the hook or configure the OAuth Server authorization path. Those are separate Supabase Auth project settings.

## Preview safety

The existing `previewPrivilegedDenied()` policy remains in force. Preview deployments may validate route compilation and unauthenticated OAuth challenges, but privileged Media reads/writes are intentionally blocked because Preview shares the Production database. Do not weaken this guard for testing.

## Verification

Run:

- `npm run type-check`
- `npm run lint:app`
- `npm run test:unit`
- `npm run build`

Then exercise the seven tools with a dedicated authorized administrator OAuth client and a disposable draft. Do not publish a real editorial article as a smoke test.

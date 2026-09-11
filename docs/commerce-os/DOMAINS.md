# Domains

## Kinds

- `jimvio_subdomain` — `{handle}.jimvio.com` (canonical public storefront host)
- `custom` — `brand.com` / `shop.brand.com`

## Status fields

- `verification_status`: pending | verified | failed | removed
- `ssl_status`: pending | active | failed | unknown

## Rules

1. Do not claim SSL active without platform verification
2. Hostname is unique globally
3. Primary domain is store-scoped
4. Path storefront `/s/[handle]` always works as browse + rewrite target
5. Canonical public URL is `https://{handle}.jimvio.com` (SEO / Open Graph / share links)

## Host routing (code — already shipped)

`proxy.ts` rewrites `{handle}.jimvio.com/*` → `/s/[handle]/*` while preserving session cookies.
Platform hosts (`www.jimvio.com`, `jimvio.com`, `*.vercel.app`) are never rewritten.

## Production infrastructure — audited 2026-09-11

### What is live today

| Item | Status |
|------|--------|
| DNS nameservers | Cloudflare (`coen.ns.cloudflare.com`, `joyce.ns.cloudflare.com`) |
| `www.jimvio.com` | CNAME → `9b3bd96691543f8d.vercel-dns-017.com` (works) |
| Apex `jimvio.com` | Points at Vercel (works) |
| Vercel project domains | `www.jimvio.com`, `jimvio.com`, `jimvio-rho.vercel.app`, `jimvio-jimvio.vercel.app` |
| `*.jimvio.com` on Vercel project | **NOT configured** |
| DNS `*` / `p7-provider-store.jimvio.com` | **NO records** (NXDOMAIN / empty) |
| `JIMVIO_STORE_SUBDOMAINS_ENABLED` | **ABSENT** (must stay off until infra resolves) |
| Path `/s/{handle}` | **Works** |

### Why `https://p7-provider-store.jimvio.com` fails

1. No Cloudflare DNS record for `*` or `p7-provider-store`
2. No `*.jimvio.com` domain attached to the Vercel project
3. Feature flag correctly not enabled yet

App code rewrite is ready; public DNS + Vercel wildcard are the blockers.

### Manual steps (exact)

**A. Vercel (Project → Settings → Domains)**

1. Open https://vercel.com/jimvio/jimvio/settings/domains
2. Add domain: `*.jimvio.com`
3. Do **not** remove `www.jimvio.com` or `jimvio.com`
4. Copy the CNAME target Vercel shows for the wildcard (typically `cname.vercel-dns.com` or a project-specific `*.vercel-dns-017.com` host)

> CLI note: `vercel domains add '*.jimvio.com' jimvio` currently returns `403 domain_not_owned` for this team — use the dashboard.

**B. Cloudflare DNS (zone `jimvio.com`)**

Add (DNS only / grey cloud — not proxied orange):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `*` | Exact target from Vercel wildcard UI (often `cname.vercel-dns.com`) | DNS only |

Do **not** change existing `www`, apex, mail, SPF, DKIM, or DMARC records.

**C. After DNS + Vercel verify**

1. Confirm `dig p7-provider-store.jimvio.com` returns the Vercel target
2. Confirm `https://p7-provider-store.jimvio.com` returns HTTP 200
3. Then set Production env: `JIMVIO_STORE_SUBDOMAINS_ENABLED=1` (optional: `NEXT_PUBLIC_JIMVIO_STORE_SUBDOMAINS=1`)
4. Redeploy if env alone does not hot-apply

Until step C succeeds, keep the flag unset and use `/s/{handle}` for Open Store.

## Custom domains

For custom domains, point CNAME to Jimvio’s edge host (see Vercel project domains). Verification jobs must confirm DNS before flipping `verification_status` to `verified`. Host-based custom-domain rewrite is staged after Jimvio subdomain hosting is confirmed in production.

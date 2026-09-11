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

## Host routing

`proxy.ts` rewrites `{handle}.jimvio.com/*` → `/s/[handle]/*` while preserving session cookies.
Platform hosts (`www.jimvio.com`, `jimvio.com`, `*.vercel.app`) are never rewritten.

## Production infrastructure (manual)

Wildcard subdomain hosting requires platform DNS + Vercel domain config:

1. Add `*.jimvio.com` to the Vercel project domains
2. Create the DNS wildcard record Cloudflare/registrar points at Vercel (as shown in the Vercel domain UI)
3. Confirm TLS for wildcard / multi-tenant hosts
4. Set `JIMVIO_STORE_SUBDOMAINS_ENABLED=1` (and optionally `NEXT_PUBLIC_JIMVIO_STORE_SUBDOMAINS=1`) once live
5. Do **not** remove `www.jimvio.com` or break Shopify OAuth / webhook hosts

Until wildcard DNS is live, merchants still open stores via `/s/{handle}` while UI shows `{handle}.jimvio.com` as the intended store URL.

## Custom domains

For custom domains, point CNAME to Jimvio’s edge host (see Vercel project domains). Verification jobs must confirm DNS before flipping `verification_status` to `verified`. Host-based custom-domain rewrite is staged after Jimvio subdomain hosting is confirmed in production.

# Domains

## Kinds

- `jimvio_subdomain` — `{handle}.jimvio.com` (canonical public storefront host)
- `custom` — `brand.com` / `shop.brand.com` (future — hostname lookup ready)

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

`proxy.ts` **rewrites** (does not redirect) `{handle}.jimvio.com/*` → `/s/[handle]/*` while preserving the merchant hostname in the browser.

- Platform hosts (`www.jimvio.com`, `jimvio.com`, `*.vercel.app`, localhost) are never rewritten.
- Merchant hosts skip the global Jimvio Navbar/Footer and platform chrome (Copilot / Command Center).
- Storefront-owned paths on merchant hosts (`/`, `/cart`, `/collections/*`, `/product/*`, …) rewrite into the store engine.
- Platform paths on merchant hosts (`/api`, `/commerce`, `/marketplace`, `/checkout`, `/login`, …) stay on the platform router.

## Production (verified)

| Item | Status |
|------|--------|
| DNS / Vercel wildcard | Configured externally (subdomain resolves) |
| `https://p7-provider-store.jimvio.com` | Serves storefront rewrite (`x-matched-path: /s/[handle]`) |
| Path `/s/{handle}` | Compatibility browse route |
| Feature flags | `JIMVIO_STORE_SUBDOMAINS_ENABLED=1` / `NEXT_PUBLIC_JIMVIO_STORE_SUBDOMAINS=1` for share URL helpers |

## Custom domains

For custom domains, point CNAME to Jimvio’s edge host (see Vercel project domains). Verification jobs must confirm DNS before flipping `verification_status` to `verified`. Host-based custom-domain rewrite can reuse the same storefront engine after hostname → store lookup.

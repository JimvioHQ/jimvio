# Domains

## Kinds

- `jimvio_subdomain` — `{handle}.jimvio.com`
- `custom` — `brand.com` / `shop.brand.com`

## Status fields

- `verification_status`: pending | verified | failed | removed
- `ssl_status`: pending | active | failed | unknown

## Rules

1. Do not claim SSL active without platform verification
2. Hostname is unique globally
3. Primary domain is store-scoped
4. Path storefront `/s/[handle]` always works

## DNS instructions (merchant-facing)

For custom domains, point CNAME to Jimvio’s edge host (see deployment docs / Vercel project domains). Verification jobs must confirm DNS before flipping `verification_status` to `verified`.

# Shopify OAuth (Dropshipping OS)

Jimvio supports **multiple Shopify merchants**. Each connected store has its own
encrypted credentials in `merchant_store_credentials` (never a global token).

## Architecture

```
Merchant → /commerce/integrations → Connect Shopify
  → GET /api/dropshipping/shopify/oauth/start?shop=store.myshopify.com
  → Shopify authorize (merchant login / store selection)
  → GET /api/dropshipping/shopify/oauth/callback
  → token exchange (server-only)
  → connectShopifyStore (test shop.json + persist)
  → idempotent webhook registration
  → /commerce/connected-stores (Connected)
```

Merchant production UX is **OAuth-only**. The Integrations page does not expose
Admin API token paste. If OAuth env is missing, merchants see a temporary
unavailable message (no secrets, no token instructions).

Internal break-glass (not merchant UI): `POST /api/dropshipping/stores` with
`{ platform, domain, accessToken }` remains available for authorized ops only.
## Shopify Partner app settings

1. Create a Shopify app (Partner Dashboard or Dev Dashboard).
2. Allowed redirection URL(s) (production):

   `https://www.jimvio.com/api/dropshipping/shopify/oauth/callback`

3. Copy Client ID + Client secret into Vercel Production env (server-only for secret).
4. Scopes must match Jimvio defaults (or `SHOPIFY_OAUTH_SCOPES`):

   - `read_products`, `write_products`
   - `read_orders`, `write_orders`
   - `read_inventory`, `write_inventory`, `read_locations`
   - `read_fulfillments`, `write_fulfillments`
   - `read_merchant_managed_fulfillment_orders`, `write_merchant_managed_fulfillment_orders`

   Justification for each scope: see `SHOPIFY_SCOPE_JUSTIFICATION` in `shopify-scopes.ts`.
   Do **not** request assigned fulfillment-order or shipping scopes unless a feature requires them.

## Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `SHOPIFY_CLIENT_ID` | OAuth | Public client id |
| `SHOPIFY_CLIENT_SECRET` | OAuth | Server-only; token exchange + state signing |
| `SHOPIFY_WEBHOOK_SECRET` | Webhooks | HMAC; often same as client secret |
| `SHOPIFY_OAUTH_REDIRECT_URI` | Prod | Exact callback URL |
| `SHOPIFY_APP_URL` | Webhooks auto-register | e.g. `https://www.jimvio.com` |
| `SHOPIFY_OAUTH_SCOPES` | Optional | Comma-separated override |
| `SHOPIFY_API_VERSION` | Optional | Default `2024-07` |
| `SHOPIFY_ENCRYPTION_KEY` | Recommended | AES for tokens; falls back to `APP_ENCRYPTION_KEY` |

Never put client secret or tokens in `NEXT_PUBLIC_*` vars, git, or client bundles.

## Security

- Shop domain must be `*.myshopify.com` (strict validation).
- OAuth `state` is HMAC-signed, bound to vendor/user/shop, expires in 10 minutes, and must match an httpOnly cookie (CSRF).
- Access tokens are encrypted at rest when an encryption key is configured (`jvs1:` ciphertext). Legacy plaintext rows still decrypt for compatibility.
- Tokens are never returned from list/store APIs.
- Webhooks require valid `X-Shopify-Hmac-Sha256`.

## Webhooks

After a successful connect, Jimvio attempts **idempotent** registration for:

- `orders/create`, `orders/updated`, `orders/paid`, `orders/cancelled`
- `products/create`, `products/update`, `products/delete`
- `app/uninstalled`

Endpoint: `{SHOPIFY_APP_URL}/api/webhooks/dropshipping/shopify`

**App Store compliance webhooks** (mandatory for public apps) are also handled on the same endpoint:

- `customers/data_request`
- `customers/redact`
- `shop/redact`

These must be subscribed via `shopify.app.toml` + `shopify app deploy` (app-level). Admin API registration alone fails Shopify automated checks.

Legacy marketplace webhooks remain at `/api/webhooks/shopify` (product sync + fulfillment earnings).

If auto-registration is skipped (missing public URL / localhost), register the Dropshipping URL manually in the Shopify app.

## Disconnect / uninstall

- Merchant disconnect clears tokens, marks store `disconnected`, cancels pending sync jobs, keeps historical orders/mappings.
- `app/uninstalled` webhook clears credentials and marks the store disconnected.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 501 OAuth not configured | `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` on Vercel Production |
| Invalid state | Cookie blocked, expired (>10m), or secret rotated mid-flow |
| Connection test failed | Token revoked → status becomes `expired`; use Reconnect |
| Webhooks 401 | `SHOPIFY_WEBHOOK_SECRET` / client secret mismatch |
| Encrypted token errors | Set `SHOPIFY_ENCRYPTION_KEY` or `APP_ENCRYPTION_KEY` to the same value used when tokens were stored |

## Live verification

Live OAuth round-trip requires a Shopify development store + app credentials in the environment.
Without an authenticated Jimvio session and a Shopify Dev Store, mark **LIVE SHOPIFY OAUTH ROUND-TRIP: BLOCKED**.

Production must include `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`,
`SHOPIFY_APP_URL=https://www.jimvio.com`, and
`SHOPIFY_OAUTH_REDIRECT_URI=https://www.jimvio.com/api/dropshipping/shopify/oauth/callback`.
Preferred: `SHOPIFY_WEBHOOK_SECRET`. Encryption uses `SHOPIFY_ENCRYPTION_KEY` or
`LIVE_DESTINATION_ENCRYPTION_KEY`.

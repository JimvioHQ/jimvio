# Jimvio Commerce OS

Canonical merchant product: **Jimvio Commerce OS** at `/commerce`.

Dropshipping OS capabilities (Shopify connect, channel products/orders, pricing,
sync, API keys) are consolidated under Commerce **Channels** — they still use
`merchant_stores`, `store_product_links`, `ds_*` tables and `/api/dropshipping/**`.

## Information architecture

| Section | Routes |
|---------|--------|
| Operations | Overview, Stores (Jimvio), Products, Orders, Inventory |
| Channels | Integrations, Connected Stores, Channel Products/Orders/Inventory, Pricing, Sync |
| Supply | Suppliers, Fulfillment, Shipping |
| Storefront | Builder, Collections, Customers, Discounts, Analytics, Payments, Pages, Domains |
| System | Settings, API Keys, Channel Settings |

## Dual store models (do not merge)

- **Jimvio Store** → `jimvio_stores` → `/commerce/stores`, orders via `jimvio_store_id`
- **Connected Store (Shopify)** → `merchant_stores` → `/commerce/connected-stores`, orders via `merchant_store_id`

## Legacy URLs

`/dropshipping/*` redirects to Commerce equivalents (see `lib/commerce-os/legacy-redirects.ts`).
API and webhook paths are **not** redirected.

## Shopify

See [SHOPIFY_OAUTH.md](./SHOPIFY_OAUTH.md). Connect UI: `/commerce/integrations`.

## Suppliers / CJ

CJ remains the existing connector + fulfillment router. Merchant entry: `/commerce/suppliers`.

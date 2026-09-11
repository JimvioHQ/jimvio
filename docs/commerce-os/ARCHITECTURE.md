# Jimvio Commerce OS — Architecture

## What it is

Commerce OS is the **native Jimvio storefront layer**: merchants create branded stores at `/s/[handle]`, publish catalog products onto them, and manage theme drafts, collections, discounts, domains, and pages.

It is additive. It does **not** replace Marketplace, Dropshipping OS, or shared checkout.

## Native store vs `merchant_stores`

| | `jimvio_stores` (Commerce OS) | `merchant_stores` (Dropshipping OS) |
|--|-------------------------------|-------------------------------------|
| Purpose | Hosted Jimvio storefront | External connector (Shopify, etc.) |
| URL | `/s/{handle}` (+ custom domain later) | Merchant’s own Shopify domain |
| Products | `jimvio_store_products` → same `products` rows | `store_product_links` + push to Shopify |
| Checkout | Shared Jimvio `/cart` + `/checkout` | External store checkout |
| Orders | `orders.jimvio_store_id` / channel `jimvio_store` | `orders.merchant_store_id` |
| Merchant UI | `/commerce` | `/dropshipping` |

## Core modules

Import from `@/lib/commerce-os`:

- `requireCommerceMerchant` / `cosAdminDb` — tenant auth + service DB
- `createJimvioStore` / `publishJimvioStore`
- `publishProductToJimvioStore`
- `loadPublishedStoreByHandle` / `loadStoreProducts` / `loadStoreProductBySlug`
- `getStoreAnalytics` — real order/product counts only; visitors/conversion stay `null`
- Theme helpers: `mergeThemeSettings`, `defaultHomeSections`, `reorderSections`

## Surfaces

- **Merchant dashboard:** `/commerce/*` (auth-protected)
- **Public storefront:** `/s/[handle]/*`
- **APIs:** `/api/commerce/*`, plus `/api/v1/jimvio-stores` for API keys
- **Admin:** `/admin/commerce`

## Guardrails

- No fake analytics numbers
- Domain SSL / verification remain `pending` until actually verified
- No second checkout — cart reuses marketplace `addToCart`
- Public primary nav (Home / Marketplace / Communities / Affiliates / UGC) unchanged

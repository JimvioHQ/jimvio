# Orders & Fulfillment (Commerce OS)

## Channel

`orders.order_channel = 'jimvio_store'`
`orders.jimvio_store_id = <store uuid>`

Marketplace and Shopify channels remain unchanged.

## Flow

```
Storefront cart (scoped)
  → Jimvio checkout (shared)
  → Order (jimvio_store channel)
  → Inventory hold (soft)
  → Payment confirmation
  → Fulfillment router (Dropshipping OS)
  → CJ / merchant stock / other supplier
  → Tracking
```

## Returns

`jimvio_store_returns` + `jimvio_store_return_items` — request lifecycle.
Refunds must use payment provider confirmation (never fake success).

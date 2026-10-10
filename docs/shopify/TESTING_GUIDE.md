# Jimvio Commerce — Shopify App Store reviewer testing guide

**App:** Jimvio Commerce  
**Production app URL:** https://www.jimvio.com/commerce  
**OAuth callback:** https://www.jimvio.com/api/dropshipping/shopify/oauth/callback  
**Webhook endpoint:** https://www.jimvio.com/api/webhooks/dropshipping/shopify  

Do not put secrets in this document. Provide a development store + Jimvio test account via Partner Dashboard secure fields only.

---

## 1. How to install

1. From the Shopify install / Partner test link for **Jimvio Commerce**, install on a development store.  
2. Complete Shopify authorization (scopes shown on the consent screen).  
3. You may see “This app hasn’t been reviewed” until App Store approval — that is expected.  
4. After install, open **https://www.jimvio.com/commerce** (Jimvio is an external Commerce OS, not an embedded Admin iframe).

## 2. How to connect Shopify (from Jimvio)

1. Sign in to Jimvio with the provided reviewer account (or create a merchant/vendor account if instructed).  
2. Go to **Commerce → Integrations** (`/commerce/integrations`) or **Stores**.  
3. Click **Connect Shopify**.  
4. Enter the store’s `*.myshopify.com` domain if prompted, then approve on Shopify.  
5. You should return to Jimvio with the store status **Connected**.

## 3. How to connect / verify a store

1. Open **Stores** / **Connected stores**.  
2. Confirm domain, status Connected, and no connection error.  
3. Optional: trigger a connection health / test from the UI if available.

## 4. How to sync / publish products

1. Open **Products** in Commerce OS.  
2. Select a Jimvio catalog product (or create one per onboarding notes).  
3. Use **Add to store** / publish / sync toward the connected Shopify store.  
4. In Shopify Admin → Products, confirm the product appears.  
5. Expected: product created via Admin **GraphQL** Product APIs; handle and variants present.

## 5. How to test inventory

1. Open **Inventory** (or Sync → inventory job).  
2. Change quantity in Jimvio or run inventory sync.  
3. In Shopify Admin → product variant inventory, confirm quantity updates at a location.  
4. Expected: inventory set on a Shopify location (requires location access).

## 6. How to test orders

1. Place a test order on the development store (Shopify Admin or storefront).  
2. Within a short time, open Jimvio **Orders**.  
3. Expected: order ingested via `orders/create` (or `orders/updated`) webhook; line items mapped when possible.

## 7. How fulfillment works

1. From a Jimvio order that is ready to fulfill (or after supplier fulfillment), ensure tracking is available.  
2. Jimvio creates Shopify fulfillments via the Fulfillment Orders API and attaches tracking.  
3. In Shopify Admin → order, expect fulfillment + tracking number/URL.  
4. If supplier (CJ) is enabled, tracking may arrive from CJ webhooks then sync to Shopify.

## 8. How CJ / supplier integration works

1. Open **Suppliers**.  
2. Connect CJ Dropshipping only if reviewer credentials / sandbox are provided.  
3. Map a product to a CJ SKU if instructed.  
4. Place a test order and confirm supplier order routing / tracking sync when enabled.  
5. If CJ is not in scope for this review, skip and note “optional capability.”

## 9. How to disconnect

1. In Jimvio → Stores / Integrations → **Disconnect**.  
2. Expected: store status disconnected; access token cleared; sync jobs cancelled.  
3. Reconnect: Connect Shopify again — expected safe reinstall / reconnect without duplicate fatal errors.

## 10. Expected results (summary)

| Step | Expected |
|------|----------|
| Install + OAuth | Offline token stored encrypted; store Connected |
| Products | Product visible in Shopify Admin |
| Inventory | Quantity matches at a location |
| Orders | Appears in Jimvio Orders |
| Fulfillment | Shopify order shows fulfilled + tracking |
| Disconnect | Token cleared; status disconnected |
| Uninstall (optional) | `app/uninstalled` clears credentials; later `shop/redact` redacts shop PII |

## Compliance webhooks (automated / Partner)

Handlers live on the same endpoint with HMAC verification:

- `customers/data_request`
- `customers/redact`
- `shop/redact`

Must be subscribed via `shopify.app.toml` + `shopify app deploy` (app-level), not only Admin API after install.

## Support during review

- info@jimvio.com  
- https://www.jimvio.com/help  
- Privacy: https://www.jimvio.com/privacy  
- Terms: https://www.jimvio.com/terms  

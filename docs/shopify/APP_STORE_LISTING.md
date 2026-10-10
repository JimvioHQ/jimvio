# Jimvio Commerce — Shopify App Store listing (draft)

**Status:** Internal listing copy for Partner Dashboard.  
**Do not claim** Verified / Approved / Published until Shopify shows that status.

## App name

Jimvio Commerce

## Tagline / short description (≤100 characters recommended)

Commerce OS for Shopify: products, inventory, orders, fulfillment, and suppliers.

## Long description

Jimvio Commerce is a Commerce OS for Shopify merchants. Connect your Shopify store to Jimvio to manage catalog publishing, inventory synchronization, order intake, fulfillment and tracking pushback, and optional supplier integrations (including CJ Dropshipping) from one workspace.

Jimvio is not only a dropshipping tool. Dropshipping and supplier routing are capabilities inside a broader Commerce OS that also covers stores, products, orders, inventory, fulfillment, shipping, pricing, sync, and integrations.

**With Jimvio Commerce you can:**

- Connect one or more Shopify stores securely (offline Admin access token, encrypted at rest)
- Publish and sync products from Jimvio to Shopify using current Admin GraphQL Product APIs
- Keep inventory quantities aligned across Jimvio, suppliers, and Shopify locations
- Ingest Shopify orders into Jimvio for operations and fulfillment routing
- Push fulfillments and tracking back to Shopify
- Connect suppliers such as CJ Dropshipping when you enable that integration
- Monitor sync jobs and connection health from Jimvio Commerce OS (`/commerce`)

**How it works**

1. Install Jimvio Commerce and open Jimvio at https://www.jimvio.com/commerce  
2. Connect Shopify from Stores / Integrations  
3. Authorize the Jimvio app on your Shopify store  
4. Use Products, Inventory, Orders, Fulfillment, Suppliers, and Sync in Commerce OS  

Jimvio hosts the merchant workspace outside the Shopify Admin iframe (external app). You authorize once; Jimvio uses Shopify Admin APIs and webhooks to keep your store in sync.

## Key features (bullets for listing)

- Multi-store Shopify connection with encrypted credentials
- Product publish & sync (GraphQL Admin Product APIs)
- Inventory sync to Shopify locations
- Order intake via Shopify webhooks
- Fulfillment + tracking pushback (Fulfillment Orders)
- Supplier / CJ Dropshipping integration (optional)
- Commerce OS navigation: Overview, Stores, Products, Orders, Inventory, Suppliers, Fulfillment, Shipping, Pricing, Sync, Integrations, Settings
- GDPR compliance webhooks: customers/data_request, customers/redact, shop/redact

## Categories (suggested)

- Orders and shipping  
- Finding products  
- Inventory  

(Adjust in Partner Dashboard to match Shopify’s current category list.)

## Pricing

Document the real commercial model in Partner Dashboard.  
If the app is free during review, state clearly: **Free to install** (and list any paid Jimvio plans outside Shopify Billing if applicable).  
Jimvio does not currently implement Shopify Billing API in this connector — if you charge via Shopify, add Billing before claiming in-app charges.

## Support

| Field | Value |
|-------|--------|
| Support email | info@jimvio.com |
| Contact email | info@jimvio.com |
| Support URL | https://www.jimvio.com/support → /help |
| Privacy policy | https://www.jimvio.com/privacy |
| Terms | https://www.jimvio.com/terms |
| App URL | https://www.jimvio.com/commerce |
| Emergency developer contact | Use Partner Dashboard emergency contact (set manually; do not invent) |

Do not use “Shopify” in Jimvio’s brand/support identity beyond describing the integration.

## App icon

File: `public/icons/shopify-app-icon-1200.png`  
Format: PNG, **1200×1200**, Jimvio brand mark on white.

Upload in Partner Dashboard → App listing → Branding.

## Screenshots (MANUAL ACTION)

Capture from a development store + Jimvio Commerce:

1. Commerce Overview  
2. Integrations / Connect Shopify  
3. Connected store status  
4. Products  
5. Orders  
6. Inventory / Sync  
7. Suppliers (CJ) if enabled  

No secrets, tokens, or PII in screenshots.

## Onboarding / installation (listing field)

After install, open https://www.jimvio.com/commerce/integrations, sign in to Jimvio, click Connect Shopify, approve scopes, then confirm the store shows Connected. Continue to Products and Sync to verify catalog and inventory.

## Testing instructions for reviewers

See `docs/shopify/TESTING_GUIDE.md`.

## Protected customer data

Jimvio processes order customer contact and shipping fields required for fulfillment (name, email, phone, address).  
If Partner Dashboard requires a Protected Customer Data request, submit with that justification. Prefer minimum access; do not request analytics or unrelated customer profiles.

## Distribution

Target: **Public distribution** (App Store eligible).  
Do not select Custom distribution.

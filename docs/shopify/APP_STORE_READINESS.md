# Shopify App Store readiness checklist (internal)

Statuses: **PASS** | **FAIL** | **NEEDS MANUAL ACTION** | **NOT APPLICABLE**

Last updated with code prep for App Store review. This is **not** Shopify approval.

| Area | Status | Notes |
|------|--------|-------|
| Public distribution | NEEDS MANUAL ACTION | Partner Dashboard → Distribution → Public (App Store). Do not use Custom. |
| Embedded App Bridge | NOT APPLICABLE | External Commerce OS; `embedded = false` in `shopify.app.toml`. |
| OAuth (existing Jimvio flow) | PASS | Signed state, CSRF cookie, `*.myshopify.com`, code exchange, offline token, encrypted at rest. |
| Redirect URL | PASS | `https://www.jimvio.com/api/dropshipping/shopify/oauth/callback` |
| App URL | PASS | `https://www.jimvio.com` / `/commerce` |
| Scopes minimization | PASS | Defaults in `shopify-scopes.ts` + justification map; assigned FO + `read_shipping` removed; `read_locations` added. |
| Protected customer data | NEEDS MANUAL ACTION | Order PII used for fulfillment — submit PCD request in Partner Dashboard if prompted. |
| Compliance webhooks (code) | PASS | Handlers on `/api/webhooks/dropshipping/shopify` with HMAC 401. |
| Compliance webhooks (Partner subscribe) | NEEDS MANUAL ACTION | Set `client_id` in `shopify.app.toml` and run `shopify app deploy`. |
| Privacy policy URL live | PASS | https://www.jimvio.com/privacy (includes Shopify/Commerce section in code). |
| Terms URL live | PASS | https://www.jimvio.com/terms |
| Support URL | PASS | https://www.jimvio.com/support → /help |
| Support emails | PASS | info@jimvio.com |
| Emergency contact | NEEDS MANUAL ACTION | Partner Dashboard field |
| App icon 1200×1200 | PASS (asset) | `public/icons/shopify-app-icon-1200.png` — upload manually |
| Listing copy | PASS (draft) | `docs/shopify/APP_STORE_LISTING.md` — paste into Partner Dashboard |
| Screenshots | NEEDS MANUAL ACTION | Capture from Dev Store |
| Testing guide | PASS (draft) | `docs/shopify/TESTING_GUIDE.md` |
| GraphQL Product APIs | PASS | `publishProduct` + price updates via Admin GraphQL |
| Inventory REST locations | PASS (acceptable) | Uses locations + inventory_levels with `read_locations` |
| Billing API | NOT APPLICABLE | Unless charging via Shopify Billing — then implement before claiming |
| Theme app extension | NOT APPLICABLE | No theme requirement for this connector |
| Automated pre-submit checks | NEEDS MANUAL ACTION | Run in Partner Dashboard / CLI after deploy |
| Live E2E install→fulfill | NEEDS MANUAL ACTION | Requires Dev Store + Jimvio session |
| “Hasn’t been reviewed” banner | NOT APPLICABLE to fix in code | Disappears only after Shopify review/approval |

## Manual Partner Dashboard sequence

1. Open the **existing** Jimvio Commerce app (do not create a new app).  
2. Set **Public** distribution.  
3. Confirm app URL + redirect URLs match production.  
4. Paste scopes from `shopify.app.toml` / `SHOPIFY_DEFAULT_OAUTH_SCOPES`.  
5. Set `client_id` in `shopify.app.toml` → `shopify app deploy` (compliance subscriptions).  
6. Upload icon + screenshots + listing copy.  
7. Set support / emergency contacts.  
8. Complete Protected Customer Data questionnaire if shown.  
9. Run automated checks; fix remaining Partner-only items.  
10. Submit for App Store review with `TESTING_GUIDE.md` content.

/**
 * Marketplace commerce production hardening smoke checks — no network.
 * Auto-picked up by ci:prepush via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const orderTotals = mustExist("lib/commerce/order-totals.ts");
assert.match(orderTotals, /computeOrderTotalAmount/);

const taxHooks = mustExist("lib/commerce/tax-hooks.ts");
assert.match(taxHooks, /estimateOrderTax/);

const affHooks = mustExist("lib/commerce/affiliate-hooks.ts");
assert.match(affHooks, /jimvio_ref/);
assert.match(affHooks, /_aff_ref/);
assert.match(affHooks, /estimateAffiliateCommission/);

const signed = mustExist("lib/commerce/signed-download.ts");
assert.match(signed, /createSignedDownloadToken/);
assert.match(signed, /verifySignedDownloadToken/);

const checkout = mustExist("lib/actions/checkout.ts");
assert.match(checkout, /computeOrderTotalAmount/);
assert.match(checkout, /total_amount: totalAmount/);

const inventory = mustExist("lib/actions/inventory-management.ts");
assert.match(inventory, /adjust_variant_inventory|adjust_product_inventory/);
assert.match(inventory, /restockOrderInventory/);

const orderUpdate = mustExist("app/api/orders/update/[status]/[orderId]/route.ts");
assert.match(orderUpdate, /ADMIN_ONLY_STATUSES|Refunds must be processed/);
assert.match(orderUpdate, /BUYER_ALLOWED_STATUSES/);
assert.match(orderUpdate, /isOrderPaymentComplete/);

const digital = mustExist("services/creator-economy/digital-products.ts");
assert.match(digital, /createSignedDownloadToken/);
assert.match(digital, /\/api\/creator\/digital\/file/);

mustExist("app/api/creator/digital/file/route.ts");

const track = mustExist("app/api/affiliates/track/route.ts");
assert.match(track, /AFFILIATE_REF_COOKIE|jimvio_ref/);
assert.match(track, /createServiceRoleClient/);

const helpful = mustExist("app/api/reviews/[reviewId]/helpful/route.ts");
assert.match(helpful, /vote_review_helpful/);

const promo = mustExist("app/api/promo/validate/route.ts");
assert.match(promo, /promo_codes/);

const products = mustExist("services/products.ts");
assert.match(products, /minRating/);
assert.match(products, /brand/);

const analytics = mustExist("app/api/vendor/analytics/route.ts");
assert.match(analytics, /\["paid", "completed"\]/);

const fulfill = mustExist("app/api/vendor/orders/[orderId]/fulfill/route.ts");
assert.match(fulfill, /isOrderPaymentComplete/);

const cjShip = mustExist("app/api/cj/set-shipping/route.ts");
assert.match(cjShip, /computeOrderTotalAmount/);
assert.match(cjShip, /shipping_amount: shippingAmount/);

mustExist("database/migrations/110_marketplace_commerce_hardening.sql");
mustExist("supabase/migrations/20260726140000_marketplace_commerce_hardening.sql");

const migration = mustExist(
  "supabase/migrations/20260726140000_marketplace_commerce_hardening.sql"
);
assert.match(migration, /adjust_product_inventory/);
assert.match(migration, /review_helpful_votes/);
assert.match(migration, /promo_codes/);
assert.match(migration, /referral_code/);
assert.match(migration, /DROP POLICY IF EXISTS affiliate_clicks_insert/);

console.log("verify-marketplace-commerce-hardening: ok");

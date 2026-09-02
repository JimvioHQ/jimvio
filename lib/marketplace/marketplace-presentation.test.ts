import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  productHasTrendingSignal,
  productHasVerifiedSupplier,
  productHasVideoSignal,
  productIsInStock,
} from "./product-signals";

const root = process.cwd();

describe("marketplace presentation hardening", () => {
  it("keeps signal helpers for non-card surfaces", () => {
    assert.equal(productHasVideoSignal({ product_videos: [{ url: "https://cdn.example/a.mp4" }] }), true);
    assert.equal(productHasVerifiedSupplier({ source_metadata: { cj_supplier_verified: true } }), true);
    assert.equal(productHasTrendingSignal({ source_metadata: { cj_trending: true } }), true);
    assert.equal(productIsInStock({ inventory_quantity: 4 }), true);
  });

  it("does not render signal badges on marketplace product cards", () => {
    const physical = readFileSync(join(root, "components/marketplace/product-card-physical.tsx"), "utf8");
    const trending = readFileSync(join(root, "components/marketplace/new/TrendingProductsClient.tsx"), "utf8");
    assert.equal(physical.includes("ProductSignalBadges"), false);
    assert.equal(trending.includes("ProductSignalBadges"), false);
  });

  it("does not render Shop by collection on the marketplace home", () => {
    const page = readFileSync(join(root, "components/marketplace/new/MarketplacePageClient.tsx"), "utf8");
    assert.equal(page.includes("CollectionsSection"), false);
    assert.equal(page.includes("Shop by collection"), false);
    assert.equal(page.includes("Shop by Category"), true);
  });

  it("keeps collection data available for other surfaces", () => {
    const collections = readFileSync(join(root, "components/marketplace/new/CollectionsSection.tsx"), "utf8");
    assert.equal(collections.includes("Shop by collection"), true);
    const badges = readFileSync(join(root, "components/marketplace/product-signal-badges.tsx"), "utf8");
    assert.equal(badges.includes("Verified"), true);
  });
});

describe("checkout first-load hardening", () => {
  it("does not wait on FX rates before paying", () => {
    const checkout = readFileSync(join(root, "components/checkout/checkout-experience.tsx"), "utf8");
    assert.equal(checkout.includes("Exchange rates are loading"), false);
    assert.equal(checkout.includes("rates[currency]"), false);
    assert.equal(checkout.includes("orderCurrency: PLATFORM_CURRENCY"), true);
    assert.equal(checkout.includes("currency: PLATFORM_CURRENCY"), true);
  });

  it("gives shipping quotes enough time on first request and warms the CJ token", () => {
    const shipping = readFileSync(join(root, "app/api/cj/shipping-rates/route.ts"), "utf8");
    assert.equal(shipping.includes("maxDuration = 60"), true);
    const page = readFileSync(join(root, "app/(public)/checkout/page.tsx"), "utf8");
    assert.equal(page.includes("getOrRefreshAccessToken"), true);
    assert.equal(page.includes("ensurePendingOrderPlatformCurrency"), true);
  });

  it("initiates Flutterwave in USD instead of forcing RWF", () => {
    const initiate = readFileSync(join(root, "app/api/payments/flutterwave/initiate/route.ts"), "utf8");
    assert.equal(initiate.includes("normaliseToRwf"), false);
    assert.equal(initiate.includes("normaliseToUsd"), true);
    assert.equal(initiate.includes('paymentOptions: "card,applepay,googlepay"'), true);
    assert.equal(initiate.includes("mobilemoneyrwanda"), false);
  });

  it("preserves paid historical orders during USD normalize", () => {
    const migrate = readFileSync(join(root, "lib/commerce/ensure-platform-currency.ts"), "utf8");
    assert.equal(migrate.includes('const UNPAID = new Set(["pending", "failed"])'), true);
    assert.equal(migrate.includes('.in("payment_status", ["pending", "failed"])'), true);
  });
});

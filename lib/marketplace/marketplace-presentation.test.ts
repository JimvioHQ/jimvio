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

  it("initiates Flutterwave in USD with card-only options", () => {
    const initiate = readFileSync(join(root, "app/api/payments/flutterwave/initiate/route.ts"), "utf8");
    assert.equal(initiate.includes("normaliseToRwf"), false);
    assert.equal(initiate.includes("normaliseToUsd"), true);
    assert.equal(initiate.includes('paymentOptions: "card"'), true);
    assert.equal(initiate.includes("mobilemoneyrwanda"), false);
  });

  it("preserves paid historical orders during USD normalize", () => {
    const migrate = readFileSync(join(root, "lib/commerce/ensure-platform-currency.ts"), "utf8");
    assert.equal(migrate.includes('const UNPAID = new Set(["pending", "failed"])'), true);
    assert.equal(migrate.includes('.in("payment_status", ["pending", "failed"])'), true);
  });

  it("exposes a dedicated Mobile Money checkout method", () => {
    const selector = readFileSync(join(root, "components/checkout/PaymentMethodSelector.tsx"), "utf8");
    assert.equal(selector.includes('id: "mobile_money"'), true);
    assert.equal(selector.includes("Pay with Any Card, Mobile Money or Apple Pay"), false);
    assert.equal(selector.includes("Popular in Rwanda"), false);
    assert.equal(selector.includes("Other Networks"), false);
    assert.equal(selector.includes("International Payments"), false);
    assert.equal(selector.includes("Pay with Cards"), true);
    assert.equal(selector.includes("Pay securely with Visa, Mastercard, Amex, and other supported cards"), true);
    assert.equal(selector.includes("Pay securely with your local mobile wallet"), true);
    assert.equal(selector.includes("Continue to a secure Mobile Money checkout"), true);
    // No Recommended badge in the live METHODS block
    const methodsStart = selector.lastIndexOf("const METHODS:");
    const methodsEnd = selector.indexOf("// ─── Trust badge", methodsStart);
    const methodsBlock = selector.slice(methodsStart, methodsEnd > 0 ? methodsEnd : undefined);
    assert.equal(methodsBlock.includes("Recommended"), false);
    assert.equal(methodsBlock.includes("recommended:"), false);
    // Global method card must not hardcode operator logos (MTN/Airtel/MoMo pills).
    const momoStart = selector.lastIndexOf('id: "mobile_money"');
    const nowStart = selector.lastIndexOf('id: "nowpayments"');
    assert.ok(momoStart >= 0 && nowStart > momoStart);
    const momoBlock = selector.slice(momoStart, nowStart);
    assert.equal(momoBlock.includes("<MTN"), false);
    assert.equal(momoBlock.includes("<Airtel"), false);
    assert.equal(momoBlock.includes("logos: []"), true);

    const checkout = readFileSync(join(root, "components/checkout/checkout-experience.tsx"), "utf8");
    assert.equal(checkout.includes("mobile_money"), true);
    assert.equal(checkout.includes("/api/payments/mobile-money/initiate"), true);
    assert.equal(checkout.includes("openMobileMoneyStep"), true);
    assert.equal(checkout.includes("backToPaymentMethods"), true);
    assert.equal(checkout.includes("MobileMoneyPaymentStep"), true);
    // Must not render MoMo form inline under payment methods
    const paymentIdx = checkout.indexOf('{stage === "payment" && (');
    const momoStageIdx = checkout.indexOf('{stage === "mobile_money" && (');
    assert.ok(paymentIdx >= 0 && momoStageIdx > paymentIdx);
    const paymentOnly = checkout.slice(paymentIdx, momoStageIdx);
    assert.equal(paymentOnly.includes("MobileMoneyPaymentStep"), false);
    assert.equal(paymentOnly.includes("PaymentMethodSelector"), true);

    const panel = readFileSync(join(root, "components/checkout/MobileMoneyCheckoutPanel.tsx"), "utf8");
    assert.equal(panel.includes("Popular in Rwanda"), false);
    assert.equal(panel.includes("Other Networks"), false);
    assert.equal(panel.includes("Back to payment methods"), true);
    assert.equal(panel.includes("Continue with Mobile Money"), true);
    assert.equal(panel.includes("Select country"), true);
  });
});

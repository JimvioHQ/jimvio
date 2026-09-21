import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("native commerce OS — Shopify retired from active product", () => {
  it("Commerce shell nav has no Channels / Connected Stores", () => {
    const src = read("components/commerce-os/commerce-shell.tsx");
    assert.equal(src.includes("Connected Stores"), false);
    assert.equal(src.includes("Channel Products"), false);
    assert.equal(src.includes('href: "/commerce/integrations"'), false);
    assert.equal(src.includes('label: "Channels"'), false);
    assert.ok(src.includes("/commerce/finance"));
    assert.ok(src.includes("Native Jimvio Store"));
  });

  it("merchant checkout trust panel no longer says Why checkout with Jimvio", () => {
    const panel = read("components/checkout/premium-trust-panel.tsx");
    assert.equal(panel.includes("Why checkout with Jimvio"), false);
    assert.ok(panel.includes('surface === "merchant"') || panel.includes('surface = "platform"'));
    const storeCheckout = read("app/(public)/s/[handle]/checkout/page.tsx");
    assert.ok(storeCheckout.includes('brandSurface="merchant"'));
  });

  it("Shopify OAuth start returns retired 410", () => {
    const src = read("app/api/dropshipping/shopify/oauth/start/route.ts");
    assert.ok(src.includes("SHOPIFY_RETIRED"));
    assert.ok(src.includes("410"));
  });

  it("Shopify connect/sync APIs are retired", () => {
    assert.ok(read("app/api/shopify/connect/route.ts").includes("SHOPIFY_RETIRED"));
    assert.ok(read("app/api/shopify/sync/route.ts").includes("SHOPIFY_RETIRED"));
  });

  it("vercel crons no longer schedule shopify-sync or dropshipping-sync", () => {
    const vercel = read("vercel.json");
    assert.equal(vercel.includes("shopify-sync"), false);
    assert.equal(vercel.includes("dropshipping-sync"), false);
  });

  it("instrumentation no longer boots Shopify vendor sync", () => {
    const src = read("instrumentation.ts");
    assert.equal(src.includes("syncAllShopifyVendors"), false);
  });

  it("finalizeOrderPayment disables Shopify path unless explicitly enabled", () => {
    const src = read("lib/payments/finalize-order-payment.ts");
    assert.ok(src.includes("SHOPIFY_FULFILLMENT_ENABLED"));
    assert.ok(src.includes("jimvio_store_id"));
  });

  it("channel commerce pages show retired notice", () => {
    const page = read("app/(public)/commerce/connected-stores/page.tsx");
    assert.ok(page.includes("ChannelRetiredPage"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("native commerce OS — Shopify retired from active product", () => {
  it("Commerce shell nav has no Channels / Connected Stores / Need Help card", () => {
    const src = read("components/commerce-os/commerce-shell.tsx");
    assert.equal(src.includes("Connected Stores"), false);
    assert.equal(src.includes("Channel Products"), false);
    assert.equal(src.includes('href: "/commerce/integrations"'), false);
    assert.equal(src.includes('label: "Channels"'), false);
    assert.equal(src.includes("Need help?"), false);
    assert.equal(src.includes("Help Center"), false);
    assert.equal(src.includes('href="/help"'), false);
    assert.ok(src.includes("/commerce/finance"));
    assert.ok(src.includes("Native Jimvio Store"));
    assert.ok(src.includes('label: "Revenue"'));
  });

  it("Overview has no right-rail Store Status / Latest Activity / Upgrade cards", () => {
    const src = read("app/(public)/commerce/page.tsx");
    assert.equal(src.includes("Store status"), false);
    assert.equal(src.includes("Latest activity"), false);
    assert.equal(src.includes("Upgrade Your Plan"), false);
    assert.equal(src.includes("xl:grid-cols-[minmax(0,1fr)_280px]"), false);
    assert.ok(src.includes("Order pipeline"));
    assert.ok(src.includes("Recent transactions"));
    assert.ok(src.includes("Pending payment"));
    assert.ok(src.includes("status=processing"));
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

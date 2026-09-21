import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

/** Strip JS/TS comments so audits ignore internal comments that mention CJ. */
function stripComments(src: string) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function userFacingText(src: string) {
  // Approximate: string literals + JSX text (comments stripped first).
  return stripComments(src);
}

describe("commerce orders — order-before-payment + CJ/Shopify UI purge", () => {
  it("createVendorOrder inserts payment_status pending before payment", () => {
    const src = read("lib/actions/checkout.ts");
    assert.ok(src.includes('payment_status: "pending"'));
    assert.ok(src.includes('status: "pending"'));
    assert.ok(src.includes("Resume existing pending/failed orders"));
    assert.ok(src.includes('event: "order.created"'));
    assert.ok(src.includes("New order — payment pending"));
  });

  it("Commerce Orders page shows Pending payment filter and product column", () => {
    const src = read("app/(public)/commerce/orders/page.tsx");
    assert.ok(src.includes("Pending payment"));
    assert.ok(src.includes("order_items"));
    assert.ok(src.includes("Waiting for payment"));
    assert.equal(src.includes('.eq("vendor_id", auth.vendorId)'), false);
    assert.equal(/\bCJ\b/.test(userFacingText(src)), false);
    assert.equal(/Shopify/i.test(userFacingText(src)), false);
  });

  it("Commerce Order detail has no user-facing CJ branding", () => {
    const src = userFacingText(
      read("app/(public)/commerce/orders/[orderId]/page.tsx")
    );
    assert.equal(/\bCJ\b/.test(src), false);
    assert.ok(src.includes("Fulfillment"));
    assert.ok(src.includes("Waiting for payment") || src.includes("Pending payment"));
    assert.ok(src.includes("isSupplierFulfilled"));
  });

  it("Fulfillment panel uses Jimvio Fulfillment language", () => {
    const src = userFacingText(
      read("components/commerce-os/commerce-order-fulfillment-panel.tsx")
    );
    assert.equal(/\bCJ\b/.test(src), false);
    assert.ok(src.includes("Jimvio Fulfillment"));
  });

  it("Fulfillment + suppliers pages hide supplier brand", () => {
    for (const rel of [
      "app/(public)/commerce/fulfillment/page.tsx",
      "app/(public)/commerce/suppliers/page.tsx",
      "app/(public)/commerce/shipping/page.tsx",
    ]) {
      const src = userFacingText(read(rel));
      assert.equal(/\bCJ\b/.test(src), false, rel);
      assert.equal(/CJ Dropshipping/i.test(src), false, rel);
      assert.equal(/Shopify/i.test(src), false, rel);
    }
  });

  it("mark-store-order error never mentions CJ", () => {
    const src = userFacingText(
      read("lib/commerce-os/fulfillment/mark-store-order.ts")
    );
    assert.equal(/\bCJ\b/.test(src), false);
    assert.ok(src.includes("Jimvio Fulfillment"));
  });

  it("channel retired page does not push Shopify branding", () => {
    const src = userFacingText(
      read("components/commerce-os/channel-retired-page.tsx")
    );
    assert.equal(/Shopify/i.test(src), false);
  });

  it("customer storefront order detail tracks without CJ/Shopify", () => {
    const src = userFacingText(
      read("app/(public)/s/[handle]/account/orders/[orderId]/page.tsx")
    );
    assert.equal(/\bCJ\b/.test(src), false);
    assert.equal(/Shopify/i.test(src), false);
    assert.ok(src.includes("tracking_number"));
    assert.ok(src.includes("Pending payment") || src.includes("paymentLabel"));
  });

  it("customer order list includes pending payment label", () => {
    const src = read("app/(public)/s/[handle]/account/orders/page.tsx");
    assert.ok(src.includes("Pending payment"));
  });

  it("MoMo initiate uses transactions.reference not provider_reference", () => {
    const src = read("app/api/payments/mobile-money/initiate/route.ts");
    assert.equal(src.includes("provider_reference:"), false);
    assert.ok(src.includes("provider_transaction_id: txRef"));
    assert.ok(src.includes("reference: charge.flwRef"));
  });

  it("Flutterwave webhook verifies amount and is idempotent", () => {
    const src = read("app/api/payments/flutterwave/webhook/route.ts");
    assert.ok(src.includes("paymentAmountsMatch"));
    assert.ok(src.includes("idempotencyKey"));
    assert.ok(src.includes("Duplicate"));
    assert.ok(src.includes("finalizeOrderPayment"));
  });
});

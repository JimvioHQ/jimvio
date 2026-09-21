import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("store order visibility + customer order detail", () => {
  it("customer order detail never selects nonexistent order_items.sku", () => {
    const src = read(
      "app/(public)/s/[handle]/account/orders/[orderId]/page.tsx"
    );
    assert.equal(/order_items\s*\([\s\S]*?\bsku\b/.test(src), false);
    assert.ok(src.includes("Continue payment") || src.includes("canResumePayment"));
    assert.ok(src.includes('eq("jimvio_store_id", store.id)'));
    assert.ok(src.includes('eq("buyer_id", user.id)'));
  });

  it("Commerce Orders scopes by store ownership, not product catalog vendor_id", () => {
    const list = read("app/(public)/commerce/orders/page.tsx");
    assert.ok(list.includes('.eq("jimvio_store_id", active.id)'));
    // Must not AND-filter order.vendor_id to merchant — product vendors differ.
    const queryBlock = list.slice(
      list.indexOf("let query = db"),
      list.indexOf("if (status ===")
    );
    assert.equal(queryBlock.includes('.eq("vendor_id", auth.vendorId)'), false);
  });

  it("Commerce order detail authorizes via owned jimvio_store_id", () => {
    const detail = read("app/(public)/commerce/orders/[orderId]/page.tsx");
    assert.ok(detail.includes("storeIds.has(order.jimvio_store_id)"));
    assert.ok(detail.includes("!order.jimvio_store_id"));
    const selectMatch = detail.match(/order_items\s*\(([\s\S]*?)\)/);
    assert.ok(selectMatch);
    assert.equal(/\bsku\b/.test(selectMatch![1]), false);
    assert.equal(detail.includes('.eq("vendor_id", auth.vendorId)'), false);
  });

  it("native store checkout attributes order.vendor_id to store owner", () => {
    const checkout = read("lib/actions/checkout.ts");
    assert.ok(checkout.includes("orderOwnerVendorId"));
    assert.ok(checkout.includes("vendor_id: orderOwnerVendorId"));
    assert.ok(checkout.includes("catalog_vendor_id"));
    assert.ok(checkout.includes('revalidatePath("/commerce/orders")'));
  });

  it("analytics order pipeline does not require order.vendor_id match", () => {
    const overview = read("lib/commerce-os/analytics/overview.ts");
    const query = overview.slice(
      overview.indexOf("const { data: orders }"),
      overview.indexOf("const list = orders")
    );
    assert.ok(query.includes('.eq("jimvio_store_id", storeId)'));
    assert.equal(query.includes('.eq("vendor_id", vendorId)'), false);
  });

  it("merchant host rewrites account order detail paths", () => {
    const host = read("lib/commerce-os/domains/host.ts");
    assert.ok(host.includes('"/orders": "/account/orders"'));
    assert.equal(
      shouldRewriteAccountOrders(host),
      true
    );
  });
});

function shouldRewriteAccountOrders(hostSrc: string) {
  // /account is not in PLATFORM_PATH_PREFIXES → store host rewrite applies
  return (
    !hostSrc.includes('"/account"') ||
    !/PLATFORM_PATH_PREFIXES = \[[\s\S]*?"\/account"/.test(hostSrc)
  );
}

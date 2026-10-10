import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { shouldScopeCartSyncToCatalogVendor } from "./checkout/cart-sync-scope.ts";
import { merchantCanAdjustStock } from "./inventory/ownership.ts";
import {
  overlappingCountries,
  selectAuthoritativeShipping,
  validateShippingRate,
} from "./shipping/validate.ts";
import {
  defaultStorePageHtml,
  missingDefaultStorePageHandles,
  resolveStorePageHtml,
} from "./storefront/page-content.ts";

const root = join(process.cwd());

describe("store checkout cart sync", () => {
  it("does not match store orders to the catalog vendor on each cart line", () => {
    assert.equal(
      shouldScopeCartSyncToCatalogVendor({ jimvio_store_id: "store-1" }),
      false,
    );
    assert.equal(shouldScopeCartSyncToCatalogVendor({ jimvio_store_id: null }), true);
  });

  it("keeps the checkout page from treating a cancelled sync as a missing order id", () => {
    const checkout = readFileSync(
      join(root, "lib/actions/checkout.ts"),
      "utf8",
    );
    const page = readFileSync(
      join(root, "app/(public)/s/[handle]/checkout/page.tsx"),
      "utf8",
    );
    assert.match(checkout, /shouldScopeCartSyncToCatalogVendor/);
    assert.match(checkout, /error: "cart_empty"/);
    assert.match(page, /cart_empty/);
    assert.match(page, /order_id/);
    assert.match(page, /sp\.order/);
  });
});

describe("supplier inventory controls", () => {
  it("hides stock edits for supplier imports and other merchants", () => {
    assert.equal(
      merchantCanAdjustStock({
        productVendorId: "merchant",
        merchantVendorId: "merchant",
        source: "cj",
      }),
      false,
    );
    assert.equal(
      merchantCanAdjustStock({
        productVendorId: "merchant",
        merchantVendorId: "merchant",
        source: "vendor",
        sourceMetadata: { cj_pid: "CJ123" },
      }),
      false,
    );
    assert.equal(
      merchantCanAdjustStock({
        productVendorId: "other",
        merchantVendorId: "merchant",
        source: "vendor",
      }),
      false,
    );
    assert.equal(
      merchantCanAdjustStock({
        productVendorId: "merchant",
        merchantVendorId: "merchant",
        source: "vendor",
      }),
      true,
    );
    const route = readFileSync(join(root, "app/api/commerce/inventory/route.ts"), "utf8");
    assert.match(route, /merchantCanAdjustStock/);
    assert.match(route, /status: 403/);
  });
});

describe("shipping configuration", () => {
  it("rejects overlapping countries, invalid amounts, and untrusted client prices", () => {
    assert.deepEqual(overlappingCountries([["RW", "KE"]], ["KE"]), ["KE"]);
    assert.deepEqual(overlappingCountries([[]], ["US"]), ["US"]);
    const invalid = validateShippingRate({
      name: "Express",
      rate_type: "price",
      price: -1,
    });
    assert.equal(invalid.ok, false);
    const missing = selectAuthoritativeShipping({
      fulfillment: "merchant",
      quotes: [],
      proposed: 12,
    });
    assert.equal(missing.error?.includes("No shipping rate"), true);
    const supplier = selectAuthoritativeShipping({
      fulfillment: "supplier",
      quotes: [{ price: 9 }],
      proposed: 4,
      verifiedSupplierShipping: 7.5,
    });
    assert.equal(supplier.amount, 7.5);
    assert.equal(supplier.source, "supplier");
    const matched = selectAuthoritativeShipping({
      fulfillment: "merchant",
      quotes: [{ price: 5 }, { price: 9 }],
      proposed: 9,
    });
    assert.equal(matched.amount, 9);
    const fallback = selectAuthoritativeShipping({
      fulfillment: "merchant",
      quotes: [{ price: 5 }, { price: 9 }],
      proposed: 0,
    });
    assert.equal(fallback.amount, 5);
    assert.equal(fallback.source, "store");
  });
});

describe("content pages", () => {
  it("creates defaults only for missing handles", () => {
    assert.deepEqual(
      missingDefaultStorePageHandles(["about", "contact"]),
      ["privacy", "refund-policy", "shipping-policy", "terms"],
    );
    assert.equal(missingDefaultStorePageHandles([
      "about",
      "contact",
      "privacy",
      "refund-policy",
      "shipping-policy",
      "terms",
    ]).length, 0);
  });

  it("keeps custom copy and does not invent contact details or refund promises", () => {
    const custom = resolveStorePageHtml({
      handle: "about",
      storeName: "Valentine",
      savedHtml: "<p>Our own story.</p>",
    });
    assert.equal(custom.usingDefault, false);
    assert.match(custom.html, /Our own story/);
    const contact = defaultStorePageHtml("contact", "Valentine");
    assert.match(contact, /have not been added yet/);
    assert.equal(contact.includes("@"), false);
    const refund = defaultStorePageHtml("refund-policy", "Valentine");
    assert.equal(/instant refund/i.test(refund), false);
    assert.match(refund, /Merchant to complete/);
  });
});

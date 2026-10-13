import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeExistingCjListing, type JimvioProduct } from "./cj_product";

function listing(overrides: Partial<JimvioProduct> = {}): JimvioProduct {
  return {
    vendor_id: "vendor",
    source: "cj",
    name: "Cable",
    slug: "cable-new",
    short_description: "Cable",
    description: "Cable",
    product_type: "physical",
    status: "draft",
    is_digital: false,
    requires_shipping: true,
    price: 7560,
    price_usd: 5.6,
    cost_price: 4,
    compare_at_price: null,
    currency: "RWF",
    pricing_type: "one_time",
    billing_period: null,
    weight: 10,
    sku: "SKU",
    images: ["https://cdn.example.com/a.jpg"],
    category_id: null,
    track_inventory: true,
    inventory_quantity: 0,
    allow_backorder: false,
    affiliate_enabled: true,
    affiliate_commission_rate: 20,
    affiliate_price: 100,
    influencer_enabled: true,
    is_active: false,
    is_featured: false,
    cj_last_synced_at: "2026-10-13T00:00:00.000Z",
    source_metadata: {
      cj_pid: "PID",
      cj_sku: "SKU",
      cj_category_id: "1",
      cj_category_name: "Cables",
      cj_sale_status: 3,
      cj_shipping_countries: [],
      cj_is_free_shipping: false,
      cj_product_type: "physical",
      cj_create_time: 0,
      cj_product_names_raw: ["Cable"],
      cj_source_from: "cj",
    },
    ...overrides,
  };
}

describe("existing CJ listing updates", () => {
  it("keeps a published URL and does not clear an admin price lock", () => {
    const merged = mergeExistingCjListing(listing(), {
      status: "active",
      is_active: true,
      slug: "original-cable",
      price: 9000,
      price_usd: 9,
      source_metadata: { jimvio_price_locked: true, cj_pid: "PID" },
    });
    assert.equal(merged.status, "active");
    assert.equal(merged.is_active, true);
    assert.equal(merged.slug, "original-cable");
    assert.equal(merged.price, 9000);
    assert.equal(merged.price_usd, 9);
    const meta = merged.source_metadata as { jimvio_pricing_conflict?: { policy_base_price_usd?: number } };
    assert.equal(meta.jimvio_pricing_conflict?.policy_base_price_usd, 5.6);
  });
});

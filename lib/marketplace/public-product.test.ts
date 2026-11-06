import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanProductTitle,
  cleanSupplierDescription,
  isFulfilledSource,
  PUBLIC_FULFILLED_SOURCE,
  publicSourceMetadata,
  toPublicPayload,
  toPublicProduct,
} from "@/lib/marketplace/public-product";
import { storefrontMetaFromProduct } from "@/lib/shipping/regional-shipping";
import { productHasTrendingSignal, productHasVerifiedSupplier } from "@/lib/marketplace/product-signals";
import { resolveStockStatus } from "@/lib/marketplace/stock-status";

const raw = {
  id: "p1",
  slug: "camping-light",
  name: "Wholesale Hot Sale Camping Light 露营灯",
  price: 3369,
  cost_price: 1.63,
  sale_count: 5,
  view_count: 9,
  review_notes: "internal",
  digital_file_url: "https://files.example/secret.zip",
  source: "cj",
  description: "<p>Bright light.</p><p>Please allow 1-3cm error due to manual measurement.</p><p>伸缩马灯</p>",
  source_metadata: {
    cj_pid: "A447",
    cj_sku: "CJYDQ",
    cj_category_name: "Sports",
    cj_product_names_raw: ["伸缩马灯"],
    jimvio_pricing: { supplier_cost_usd: 1.63, policy_id: "x" },
    cj_delivery_cycle: 4,
    cj_trending: true,
    trend_classification: "search",
    cj_supplier_verified: true,
    brand: "Lumo",
  },
  product_variants: [{ id: "v1", name: "New Style Red", cj_vid: "29EA", cost_price: 1, source: "cj", source_metadata: { cj_vid: "29EA" } }],
};

describe("public product copy", () => {
  const pub = toPublicProduct(raw) as Record<string, unknown>;
  const text = JSON.stringify(pub);

  it("never ships cost, supplier ids, pricing, admin or file fields", () => {
    for (const secret of ["cost_price", "1.63", "cj_pid", "A447", "CJYDQ", "jimvio_pricing", "supplier_cost", "review_notes", "sale_count", "view_count", "secret.zip", "29EA", "cj_category_name", "\"cj\""]) {
      assert.ok(!text.includes(secret), `leaked ${secret}`);
    }
  });

  it("uses a neutral source alias the storefront still understands", () => {
    assert.equal(pub.source, PUBLIC_FULFILLED_SOURCE);
    assert.ok(isFulfilledSource(pub.source as string));
    assert.ok(isFulfilledSource("cj"));
    assert.ok(!isFulfilledSource("native"));
  });

  it("keeps the shipping facts and signals under neutral names", () => {
    const meta = pub.source_metadata as Record<string, unknown>;
    assert.deepEqual(meta, { brand: "Lumo", processing_days: 4, trending: true, verified: true });
    assert.equal(storefrontMetaFromProduct(pub as never).processingDays, 4);
    assert.equal(productHasTrendingSignal(pub as never), true);
    assert.equal(productHasVerifiedSupplier(pub as never), true);
  });

  it("cleans buyer-facing title and description but not variant names", () => {
    assert.equal(pub.name, "Camping Light");
    assert.ok(!String(pub.description).includes("manual measurement"));
    assert.ok(!/[一-鿿]/.test(String(pub.description)));
    assert.ok(String(pub.description).includes("Bright light."));
    assert.equal((pub.product_variants as Array<{ name: string }>)[0]!.name, "New Style Red");
  });

  it("does not change the original row", () => {
    assert.equal(raw.cost_price, 1.63);
    assert.equal(raw.source, "cj");
  });

  it("cleans nested product lists in any payload shape", () => {
    const payload = toPublicPayload({ sections: [{ title: "Trending", products: [raw] }], total: 1 });
    const out = JSON.stringify(payload);
    assert.ok(!out.includes("cost_price") && !out.includes("cj_pid"));
    assert.ok(out.includes("Trending"));
  });

  it("drops unknown supplier keys from metadata", () => {
    assert.deepEqual(publicSourceMetadata({ cj_verified_warehouse: 1, cj_sale_status: 3, anything: "x" }), {});
  });

  it("keeps a sensible title when cleaning would remove too much", () => {
    assert.equal(cleanProductTitle("Wholesale"), "Wholesale");
    assert.equal(cleanSupplierDescription(null), null);
  });
});

describe("stock label for buyers", () => {
  it("never shows a warehouse-sized count", () => {
    assert.equal(resolveStockStatus({ inventory_quantity: 242893, track_inventory: true }).label, "In stock");
    assert.equal(resolveStockStatus({ inventory_quantity: 3, track_inventory: true, low_stock_threshold: 5 }).label, "Only 3 left");
  });
});

describe("ranking payloads (camelCase)", () => {
  it("removes cost and counts and neutralises the source", () => {
    const out = JSON.stringify(toPublicPayload({ rankings: [{ productId: "p", name: "Lamp", costPrice: 1.6, saleCount: 4, viewCount: 9, source: "cj", score: 0.9 }] }));
    for (const secret of ["costPrice", "saleCount", "viewCount", "\"cj\""]) assert.ok(!out.includes(secret), secret);
    assert.ok(out.includes("Lamp") && out.includes("score"));
  });
});


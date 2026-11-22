import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compactCjListPayload,
  listV2RowToRaw,
} from "@/lib/cj/premium-intelligence/map-to-cj-product";

describe("CJ list payload compaction", () => {
  it("keeps browse/filter metadata while excluding large detail fields", () => {
    const row = {
      id: "CJ-PID-001",
      nameEn: "Portable Smart Watch",
      bigImage: "https://cdn.example.com/main.jpg",
      sku: "WATCH-001",
      sellPrice: "12.50",
      discountPrice: "9.50",
      warehouseInventoryNum: 120,
      listedNum: 870,
      categoryName: "Electronics",
      threeCategoryName: "Wearables",
      supplierName: "Verified Supplier",
      supplierId: "SUP-1",
      verifiedWarehouse: 1,
      productTags: Array.from({ length: 30 }, (_, i) => `tag-${i}`),
      description: `<p>${"Detailed product copy ".repeat(80)}</p>`,
      variants: Array.from({ length: 40 }, (_, i) => ({ vid: `VID-${i}`, inventories: [{ totalInventory: 5 }] })),
      productImageSet: Array.from({ length: 12 }, (_, i) => `https://cdn.example.com/${i}.jpg`),
      productNameSet: ["name-a", "name-b"],
      productProEnSet: ["long specification".repeat(100)],
      productVideo: ["https://cdn.example.com/video.mp4"],
    };

    const raw = listV2RowToRaw(row);
    const payload = raw.raw_payload;

    assert.equal(raw.pid, "CJ-PID-001");
    assert.equal(raw.title, "Portable Smart Watch");
    assert.equal(raw.image, "https://cdn.example.com/main.jpg");
    assert.equal(raw.stock, 120);
    assert.equal(raw.orders, 870);

    assert.equal(payload.categoryName, "Electronics");
    assert.equal(payload.threeCategoryName, "Wearables");
    assert.equal(payload.supplierId, "SUP-1");
    assert.equal(payload.verifiedWarehouse, 1);
    assert.equal(payload.variantCount, 40);
    assert.equal(payload.imageCount, 12);
    assert.equal(payload.isVideo, 1);
    assert.equal(payload.videoCount, 1);
    assert.equal((payload.productTags as string[]).length, 20);
    assert.ok(String(payload.description).length <= 500);
    assert.ok(!String(payload.description).includes("<p>"));

    assert.equal("variants" in payload, false);
    assert.equal("productImageSet" in payload, false);
    assert.equal("productNameSet" in payload, false);
    assert.equal("productProEnSet" in payload, false);
  });

  it("compacts pre-existing list payloads without losing variant and image counts", () => {
    const payload = compactCjListPayload({
      status: 3,
      variants: [{ vid: "a" }, { vid: "b" }],
      productImageSet: ["a.jpg", "b.jpg", "c.jpg"],
      description: "  A simple product description  ",
      productKeyEnSet: ["Color", "Size"],
    });

    assert.equal(payload.status, 3);
    assert.equal(payload.variantCount, 2);
    assert.equal(payload.imageCount, 3);
    assert.equal(payload.description, "A simple product description");
    assert.deepEqual(payload.productKeyEnSet, ["Color", "Size"]);
    assert.equal("variants" in payload, false);
    assert.equal("productImageSet" in payload, false);
  });
});

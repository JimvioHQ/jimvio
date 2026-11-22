import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterLiveMappedCjRows,
  isLiveMarketplaceProduct,
  type CjCatalogMapping,
  type CjCatalogProductState,
} from "./catalog-retention";

const products: CjCatalogProductState[] = [
  { id: "live", status: "active", is_active: true, deleted_at: null },
  { id: "null-active", status: "published", is_active: null, deleted_at: null },
  { id: "draft", status: "draft", is_active: true, deleted_at: null },
  { id: "inactive", status: "active", is_active: false, deleted_at: null },
  { id: "deleted", status: "active", is_active: true, deleted_at: "2026-11-01T00:00:00Z" },
];

const mappings: CjCatalogMapping[] = [
  { cj_pid: "PID-LIVE", product_id: "live" },
  { cj_pid: "PID-NULL-ACTIVE", product_id: "null-active" },
  { cj_pid: "PID-DRAFT", product_id: "draft" },
  { cj_pid: "PID-INACTIVE", product_id: "inactive" },
  { cj_pid: "PID-DELETED", product_id: "deleted" },
];

describe("CJ catalog retention", () => {
  it("recognizes active Marketplace products and preserves nullable is_active as enabled", () => {
    assert.equal(isLiveMarketplaceProduct(products[0]!), true);
    assert.equal(isLiveMarketplaceProduct(products[1]!), true);
    assert.equal(isLiveMarketplaceProduct(products[2]!), false);
    assert.equal(isLiveMarketplaceProduct(products[3]!), false);
    assert.equal(isLiveMarketplaceProduct(products[4]!), false);
  });

  it("keeps only supplier rows mapped to live Marketplace products", () => {
    const rows = [
      { pid: "PID-LIVE", title: "Live product" },
      { pid: "PID-NULL-ACTIVE", title: "Live with default active state" },
      { pid: "PID-DRAFT", title: "Draft" },
      { pid: "PID-INACTIVE", title: "Inactive" },
      { pid: "PID-DELETED", title: "Deleted" },
      { pid: "PID-UNMAPPED", title: "Supplier-only catalog row" },
    ];

    assert.deepEqual(
      filterLiveMappedCjRows(rows, mappings, products).map((row) => row.pid),
      ["PID-LIVE", "PID-NULL-ACTIVE"],
    );
  });

  it("returns no retained rows when there are no Marketplace mappings", () => {
    assert.deepEqual(
      filterLiveMappedCjRows([{ pid: "PID-UNMAPPED" }], [], products),
      [],
    );
  });
});

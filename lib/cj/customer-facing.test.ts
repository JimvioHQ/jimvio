import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsSupplierBranding,
  sanitizeProductDescriptionHtml,
} from "./customer-facing";

describe("sanitizeProductDescriptionHtml", () => {
  it("preserves description images hosted on the supplier CDN", () => {
    const html =
      '<p>Size chart</p><img src="https://cf.cjdropshipping.com/images/chart.jpg" alt="chart">';
    const out = sanitizeProductDescriptionHtml(html);
    assert.match(out, /cf\.cjdropshipping\.com\/images\/chart\.jpg/);
    assert.match(out, /<img /);
    assert.doesNotMatch(out, /<a /);
  });

  it("strips supplier marketing links while keeping surrounding copy", () => {
    const html =
      'Buy at <a href="https://www.cjdropshipping.com/product">CJ Dropshipping</a> today';
    const out = sanitizeProductDescriptionHtml(html);
    assert.doesNotMatch(out, /href=/);
    assert.doesNotMatch(out, /cjdropshipping\.com\/product/);
  });
});

describe("containsSupplierBranding", () => {
  it("is stable across repeated calls (no lastIndex mutation)", () => {
    assert.equal(containsSupplierBranding("CJ Warehouse"), true);
    assert.equal(containsSupplierBranding("CJ Warehouse"), true);
    assert.equal(containsSupplierBranding("Jimvio Store"), false);
  });
});

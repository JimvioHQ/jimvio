import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  storefrontGridColumnCount,
  storefrontProductGridTemplate,
} from "./product-grid.ts";

const GRID_CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../styles/storefront-product-grid.css"),
  "utf8"
);

describe("storefront product grid columns", () => {
  it("uses 2 columns below 768 and 3 below 1024", () => {
    assert.equal(storefrontGridColumnCount(320), 2);
    assert.equal(storefrontGridColumnCount(375), 2);
    assert.equal(storefrontGridColumnCount(390), 2);
    assert.equal(storefrontGridColumnCount(430), 2);
    assert.equal(storefrontGridColumnCount(767), 2);
    assert.equal(storefrontGridColumnCount(768), 3);
    assert.equal(storefrontGridColumnCount(1023), 3);
  });

  it("uses merchant columns from 1024 up, defaulting to 4", () => {
    assert.equal(storefrontGridColumnCount(1024), 4);
    assert.equal(storefrontGridColumnCount(1280), 4);
    assert.equal(storefrontGridColumnCount(1440), 4);
    assert.equal(storefrontGridColumnCount(1920), 4);
    assert.equal(storefrontGridColumnCount(1440, 5), 5);
    assert.equal(storefrontGridColumnCount(1440, 2), 2);
    assert.equal(storefrontProductGridTemplate(390), "repeat(2, minmax(0, 1fr))");
    assert.equal(storefrontProductGridTemplate(1024, 4), "repeat(4, minmax(0, 1fr))");
  });

  it("applies column counts from CSS variables, not invalid Tailwind comma classes", () => {
    assert.match(GRID_CSS, /@media \(min-width: 768px\)/);
    assert.match(GRID_CSS, /repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(GRID_CSS, /@media \(min-width: 1024px\)/);
    assert.match(GRID_CSS, /repeat\(var\(--store-grid-cols, 4\), minmax\(0, 1fr\)\)/);
    assert.match(GRID_CSS, /max-width: 16rem/);
    assert.doesNotMatch(GRID_CSS, /lg:\[grid-template-columns/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogByLocator, UNVERIFIED_CANDIDATES, VERIFIED_FEEDS } from "./catalog.ts";

describe("editorial feed catalog verification boundaries", () => {
  it("keeps every discovery candidate disabled and explicitly unverified", () => {
    assert.ok(UNVERIFIED_CANDIDATES.length > 0);
    for (const source of UNVERIFIED_CANDIDATES) {
      assert.equal(source.enabled, false, source.name);
      assert.equal(source.verifiedAt, null, source.name);
      assert.equal(catalogByLocator(source.locator), null, source.name);
    }
  });

  it("only exposes checked feeds through the verified catalog lookup", () => {
    assert.ok(VERIFIED_FEEDS.length > 0);
    for (const source of VERIFIED_FEEDS) {
      assert.ok(source.verifiedAt, source.name);
      assert.ok(source.termsNote.startsWith("Checked "), source.name);
      assert.equal(catalogByLocator(source.locator)?.name, source.name);
    }
  });

  it("retains Africa and Rwanda coverage as candidates without enabling it", () => {
    assert.ok(UNVERIFIED_CANDIDATES.some((source) => source.region === "Africa"));
    assert.ok(UNVERIFIED_CANDIDATES.some((source) => source.region === "Rwanda"));
    assert.ok(UNVERIFIED_CANDIDATES.filter((source) => source.region === "Rwanda").every((source) => !source.enabled));
  });
});

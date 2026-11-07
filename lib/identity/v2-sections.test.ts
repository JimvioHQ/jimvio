import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEGACY_TAB_TO_SECTION, resolveIdentitySection } from "./v2-sections";

describe("resolveIdentitySection", () => {
  it("defaults to overview", () => {
    assert.equal(resolveIdentitySection(null), "overview");
    assert.equal(resolveIdentitySection(undefined), "overview");
    assert.equal(resolveIdentitySection(""), "overview");
  });

  it("maps legacy tabs to Identity 2.0 sections", () => {
    assert.equal(resolveIdentitySection("ugc"), "business");
    assert.equal(resolveIdentitySection("affiliate"), "business");
    assert.equal(resolveIdentitySection("marketplace"), "business");
    assert.equal(resolveIdentitySection("community"), "business");
    assert.equal(resolveIdentitySection("bookings"), "services");
    assert.equal(resolveIdentitySection("resume"), "experience");
    assert.equal(resolveIdentitySection("portfolio"), "portfolio");
    assert.equal(resolveIdentitySection("achievements"), "overview");
    assert.equal(resolveIdentitySection("reviews"), "overview");
  });

  it("accepts new section ids", () => {
    for (const id of Object.values(LEGACY_TAB_TO_SECTION)) {
      assert.equal(resolveIdentitySection(id), id);
    }
  });

  it("falls back for unknown tabs", () => {
    assert.equal(resolveIdentitySection("unknown-tab"), "overview");
  });
});

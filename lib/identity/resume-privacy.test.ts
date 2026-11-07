import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { privacyFieldVisible } from "./privacy";

describe("resume privacy opt-in", () => {
  it("keeps resume private by default", () => {
    assert.equal(privacyFieldVisible({}, "showResume"), false);
    assert.equal(privacyFieldVisible(undefined, "showResume"), false);
  });

  it("allows resume only when explicitly enabled", () => {
    assert.equal(privacyFieldVisible({ showResume: true }, "showResume"), true);
    assert.equal(privacyFieldVisible({ showResume: false }, "showResume"), false);
  });

  it("keeps portfolio visible by default unless disabled", () => {
    assert.equal(privacyFieldVisible({}, "showPortfolio"), true);
    assert.equal(privacyFieldVisible({ showPortfolio: false }, "showPortfolio"), false);
  });
});

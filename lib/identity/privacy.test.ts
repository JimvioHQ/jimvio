import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { privacyFieldVisible } from "./privacy";

describe("identity profile field visibility", () => {
  it("preserves existing public-field defaults", () => {
    assert.equal(privacyFieldVisible({}, "showBio"), true);
    assert.equal(privacyFieldVisible({}, "showSocial"), true);
  });

  it("keeps resume, media kit and analytics private until explicitly enabled", () => {
    assert.equal(privacyFieldVisible({}, "showResume"), false);
    assert.equal(privacyFieldVisible({}, "showMediaKit"), false);
    assert.equal(privacyFieldVisible({}, "showAnalytics"), false);
    assert.equal(privacyFieldVisible({ showResume: true }, "showResume"), true);
    assert.equal(privacyFieldVisible({ showMediaKit: true }, "showMediaKit"), true);
    assert.equal(privacyFieldVisible({ showAnalytics: true }, "showAnalytics"), true);
  });

  it("honors an explicit hide setting", () => {
    assert.equal(privacyFieldVisible({ showBio: false }, "showBio"), false);
    assert.equal(privacyFieldVisible({ showAnalytics: false }, "showAnalytics"), false);
  });
});

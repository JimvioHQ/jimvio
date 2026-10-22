import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SETTINGS_NAV_ITEMS,
  getActiveSettingsId,
  isSettingsPath,
  resolveSettingsHref,
} from "./nav";

describe("settings nav", () => {
  it("keeps a single destination per section", () => {
    const hrefs = SETTINGS_NAV_ITEMS.map((item) => item.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
    const ids = SETTINGS_NAV_ITEMS.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("does not include an empty addresses placeholder", () => {
    assert.equal(
      SETTINGS_NAV_ITEMS.some((item) => item.label.toLowerCase().includes("address")),
      false,
    );
  });

  it("resolves legacy identity settings URLs", () => {
    assert.equal(resolveSettingsHref("/identity/edit"), "/settings/profile");
    assert.equal(resolveSettingsHref("/identity/security"), "/settings/security");
    assert.equal(getActiveSettingsId("/identity/privacy"), "privacy");
    assert.equal(getActiveSettingsId("/settings/notifications"), "notifications");
  });

  it("detects settings paths", () => {
    assert.equal(isSettingsPath("/settings"), true);
    assert.equal(isSettingsPath("/settings/profile"), true);
    assert.equal(isSettingsPath("/marketplace"), false);
  });
});

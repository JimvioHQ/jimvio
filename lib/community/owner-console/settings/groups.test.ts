import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SETTINGS_GROUPS, settingsGroupForTab } from "./groups.ts";
import { SETTINGS_SECTIONS } from "./types.ts";

describe("settings groups", () => {
  it("covers every settings section exactly once", () => {
    const all = SETTINGS_GROUPS.flatMap((g) => g.sections);
    assert.deepEqual([...all].sort(), [...SETTINGS_SECTIONS].sort());
  });
  it("maps legacy ?tab= section ids to their group", () => {
    assert.equal(settingsGroupForTab("privacy"), "visibility");
    assert.equal(settingsGroupForTab("branding"), "customization");
    assert.equal(settingsGroupForTab("danger"), "danger");
    assert.equal(settingsGroupForTab("access"), "access");
    assert.equal(settingsGroupForTab("nope"), null);
    assert.equal(settingsGroupForTab(null), null);
  });
});

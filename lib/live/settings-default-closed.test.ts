import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Live settings closed by default", () => {
  it("never restores settings as the landing left panel", () => {
    const utils = readFileSync(
      join(root, "components/community/hub/live/studio-utils.ts"),
      "utf8"
    );
    const types = readFileSync(
      join(root, "components/community/hub/live/studio-types.ts"),
      "utf8"
    );
    const page = readFileSync(
      join(root, "components/community/hub/hub-live-page.tsx"),
      "utf8"
    );
    assert.match(types, /DRAWER_STATE_VERSION = 6/);
    assert.match(types, /leftPanel: "none"/);
    assert.match(utils, /leftPanelRaw === "settings" \? "none"/);
    assert.match(utils, /const rightOpen = false/);
    assert.match(page, /rightOpen: true,\s*rightTab: "chat"/);
    assert.doesNotMatch(
      page,
      /if \(openSettings\) \{\s*updateDrawer\(\{ leftPanel: "settings" \}\)/
    );
  });

  it("settings categories are functional-only", () => {
    const panels = readFileSync(
      join(root, "components/community/hub/live/panels.tsx"),
      "utf8"
    );
    assert.doesNotMatch(panels, /id: "about"/);
    assert.doesNotMatch(panels, /id: "accessibility"/);
    assert.doesNotMatch(panels, /id: "privacy"/);
    assert.match(panels, /id: "video"/);
    assert.match(panels, /id: "destinations"/);
  });
});

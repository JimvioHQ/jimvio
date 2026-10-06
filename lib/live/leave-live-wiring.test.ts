import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Leave Live vs End Live wiring", () => {
  it("exposes Leave Live for participants and End Live for hosts", () => {
    const page = readFileSync(
      join(root, "components/community/hub/hub-live-page.tsx"),
      "utf8"
    );
    const dock = readFileSync(
      join(root, "components/community/hub/live/ControlDock.tsx"),
      "utf8"
    );
    const header = readFileSync(
      join(root, "components/community/hub/live/LiveExperienceHeader.tsx"),
      "utf8"
    );
    const more = readFileSync(
      join(root, "components/community/hub/live/LiveMorePanel.tsx"),
      "utf8"
    );

    assert.match(dock, /Leave Live/);
    assert.match(dock, /End Live/);
    assert.match(header, /onLeaveLive/);
    assert.match(page, /setConfirmDialog\("leave"\)/);
    assert.match(page, /livekit\.disconnect\(\)/);
    assert.match(page, /media\.releaseMedia\(\)/);
    assert.match(more, /id: "leave"/);
    assert.match(more, /id: "end"/);
  });
});

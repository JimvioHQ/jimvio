import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Live runtime defaults", () => {
  it("pre-live chat stays closed and does not subscribe", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const utils = read("components/community/hub/live/studio-utils.ts");
    assert.match(utils, /Boolean\(parsed\.rightOpen\)/);
    assert.match(page, /showRight = !focusMode && hasSession/);
    assert.match(
      page,
      /live\.session\?\.status === "live" \? chatRoomId : null/
    );
    assert.match(
      page,
      /live\.session\?\.status === "live" \? live\.session\.id : null/
    );
  });

  it("Go Live does not auto-enable camera or microphone", () => {
    const prepare = read("components/community/hub/live/LivePrepareStage.tsx");
    const plane = read("lib/live/media-plane.ts");
    assert.match(prepare, /onClick=\{\(\) => onGoLive\(\)\}/);
    assert.doesNotMatch(prepare, /onEnableMedia\(\);\s*\n\s*onGoLive/);
    assert.match(plane, /private micEnabled = false/);
    assert.match(plane, /private camEnabled = false/);
  });

  it("avatar wrappers are circular without square halo or white ring", () => {
    const prepare = read("components/community/hub/live/LivePrepareStage.tsx");
    const avatar = read("components/community/hub/hub-ui.tsx");
    const fallback = read("components/community/hub/live/LiveStageFallback.tsx");
    assert.doesNotMatch(prepare, /-inset-6/);
    assert.doesNotMatch(prepare, /radial-gradient\(circle,rgba\(255,90,31/);
    assert.doesNotMatch(avatar, /ring-2 ring-white/);
    assert.match(avatar, /borderRadius: 9999/);
    assert.match(prepare, /borderRadius: 9999/);
    assert.match(fallback, /bg-transparent/);
  });

  it("recording uses Live session egress, not silent local-camera MediaRecorder", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const route = read("app/api/live/sessions/[id]/recording/route.ts");
    assert.match(page, /action: "start"/);
    assert.match(page, /capturing this Live|already being recorded|Starting recording/);
    assert.doesNotMatch(page, /media\.startRecording\(\)/);
    assert.match(route, /parseParticipantPermissions/);
    assert.match(route, /canRecord\(role/);
  });
});

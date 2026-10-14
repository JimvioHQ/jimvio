import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeLiveSessionSettings, mergeStageFocus, canControlRoomStage } from "./stage-selection.ts";
import { enterElementFullscreen, exitDocumentFullscreen } from "./stage-fullscreen.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("immersive live stage", () => {
  const page = read("components/community/hub/hub-live-page.tsx");
  const pip = read("components/community/hub/live/LiveStagePip.tsx");
  const strip = read("components/community/hub/live/LiveScreenShareStrip.tsx");
  const layout = read("lib/live/stage-share-layout.ts");
  const room = read("lib/live/livekit-room.ts");
  const session = read("hooks/live/useLiveSession.ts");
  const service = read("services/live/session-service.ts");

  it("hides participant and screen sections until View Members and Speakers", () => {
    assert.match(page, /useState\(false\)/);
    assert.match(page, /View Members and Speakers/);
    assert.match(page, /Hide Members and Speakers/);
    assert.match(page, /membersOpen \? \(/);
    assert.match(page, /aria-label="Members and speakers"/);
    assert.match(page, /env\(safe-area-inset-bottom\)/);
    const panelStart = page.indexOf('aria-label="Members and speakers"');
    const panelEnd = page.indexOf("No members on stage yet", panelStart);
    const panel = page.slice(panelStart, panelEnd);
    assert.match(panel, /LiveStagePipStack/);
    assert.match(panel, /LiveScreenShareStrip/);
  });

  it("closing the members panel does not call setStageFocus", () => {
    const button = page.slice(page.indexOf("View Members and Speakers") - 700, page.indexOf("View Members and Speakers"));
    assert.match(button, /setMembersOpen/);
    assert.doesNotMatch(button, /setStageFocus/);
  });

  it("host stage selection is shared and guests cannot write it", () => {
    assert.equal(canControlRoomStage("viewer"), false);
    assert.equal(canControlRoomStage("speaker"), false);
    assert.match(service, /if \(!canControlRoomStage\(role\)\)/);
    assert.match(page, /kind: "participant"/);
    assert.match(page, /kind: "screen"/);
    const merged = mergeLiveSessionSettings(
      { stage_focus: { identity: "host-a", owner: "host-a", kind: "screen", version: 2 } },
      { stage_focus: { identity: "guest-b", owner: "guest-b", kind: "participant", version: 3 } },
    );
    assert.equal(
      (merged.stage_focus as { identity: string }).identity,
      "guest-b",
    );
    const stale = mergeStageFocus(
      { identity: "guest-b", owner: "guest-b", kind: "participant", version: 3 },
      { identity: "host-a", owner: "host-a", kind: "screen", version: 1 },
    );
    assert.equal(stale?.identity, "guest-b");
    assert.match(session, /mergeLiveSessionSettings\(prev\.settings, next\.settings\)/);
    assert.match(session, /mergeLiveSessionSettings\(prev\.settings, row\.settings\)/);
  });

  it("active speaker highlight does not select the stage", () => {
    assert.doesNotMatch(layout, /speaking/);
    const layoutCall = room.slice(
      room.indexOf("const layout = selectStageShareLayout"),
      room.indexOf("const active ="),
    );
    assert.doesNotMatch(layoutCall, /speakingIds/);
    assert.match(room, /stageStream: layout\.stageStream/);
    const tile = page.slice(page.indexOf("<LiveStagePipTile"), page.indexOf("onMoveToStage"));
    assert.match(tile, /roomStageFocus\.kind === "participant"/);
    assert.doesNotMatch(tile, /activeSpeakerId === p\.id/);
  });

  it("card fullscreen does not change room stage focus", () => {
    const local = page.slice(page.indexOf("const openLocalFullscreen"), page.indexOf("const toggleLiveFullscreen"));
    assert.match(local, /enterElementFullscreen/);
    assert.doesNotMatch(local, /setStageFocus/);
    assert.match(strip, /Fullscreen/);
    assert.match(pip, /Fullscreen/);
    assert.match(pip, /Exit Fullscreen/);
    assert.match(pip, /Exit focus/);
    assert.match(page, /documentFullscreen \? "Exit Fullscreen" : "Exit focus"/);
  });

  it("main-stage fullscreen uses the Fullscreen API and labels fallback honestly", async () => {
    assert.match(page, /enterElementFullscreen\(stageRootRef\.current, document\)/);
    assert.match(read("lib/live/stage-fullscreen.ts"), /requestFullscreen/);
    const denied = await enterElementFullscreen(
      { requestFullscreen: async () => { throw new Error("denied"); } },
      { fullscreenElement: null },
    );
    assert.equal(denied, "fallback");
    const missing = await enterElementFullscreen({}, { fullscreenElement: null });
    assert.equal(missing, "fallback");
    const entered = await enterElementFullscreen(
      { requestFullscreen: async () => undefined },
      { fullscreenElement: null },
    );
    assert.equal(entered, "entered");
    const exited = await exitDocumentFullscreen({
      fullscreenElement: {},
      exitFullscreen: async () => undefined,
    });
    assert.equal(exited, "exited");
    assert.match(page, /e\.key === "Escape"/);
    assert.match(page, /closeLocalFullscreen/);
  });

  it("keeps chat, record, invite, destinations, and leave controls", () => {
    assert.match(page, /onChat=\{toggleChat\}/);
    assert.match(page, /void toggleRecord\(\)/);
    assert.match(page, /onInvite=\{openShareSheet\}/);
    assert.match(page, /onStreamTo=\{openStreamTo\}/);
    assert.match(page, /setConfirmDialog\("end"\)/);
    assert.match(page, /setConfirmDialog\("leave"\)/);
    assert.match(page, /setMembersOpen\(false\)/);
  });
});

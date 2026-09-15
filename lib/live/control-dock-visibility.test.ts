import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  desktopDockControls,
  dockKeepsAvDuringShare,
  mobileDockControls,
} from "./control-dock-visibility.ts";

describe("screen share preserving audio/video controls", () => {
  it("keeps mic and cam in desktop share mode", () => {
    assert.equal(dockKeepsAvDuringShare("share"), true);
    const share = desktopDockControls("share");
    assert.ok(share.includes("mic"));
    assert.ok(share.includes("cam"));
    assert.ok(share.includes("stopShare"));
    assert.ok(!share.includes("share") || share.includes("stopShare"));
  });

  it("keeps mic and cam on mobile while sharing", () => {
    const controls = mobileDockControls({
      canPublish: true,
      isHost: true,
      sharing: true,
    });
    assert.ok(controls.includes("mic"));
    assert.ok(controls.includes("cam"));
    assert.ok(controls.includes("stopShare"));
  });
});

describe("mobile control visibility", () => {
  it("shows chat-first actions for viewers", () => {
    const controls = mobileDockControls({
      canPublish: false,
      isHost: false,
    });
    assert.ok(controls.includes("leave"));
    assert.ok(!controls.includes("mic"));
  });

  it("exposes end for hosts and leave for speakers", () => {
    assert.ok(
      mobileDockControls({ canPublish: true, isHost: true }).includes("end")
    );
    assert.ok(
      mobileDockControls({ canPublish: true, isHost: false }).includes("leave")
    );
  });
});

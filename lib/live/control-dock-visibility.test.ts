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

  it("keeps mic and cam in present mode", () => {
    assert.equal(dockKeepsAvDuringShare("present"), true);
    const present = desktopDockControls("present");
    assert.ok(present.includes("mic"));
    assert.ok(present.includes("cam"));
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

describe("desktop control visibility", () => {
  it("exposes primary live controls for publishers", () => {
    const live = desktopDockControls("live", { canEnd: true });
    for (const id of ["mic", "cam", "share", "invite", "record", "end"] as const) {
      assert.ok(live.includes(id), `expected ${id}`);
    }
  });

  it("uses leave instead of end when cannot end", () => {
    const live = desktopDockControls("live", { canEnd: false });
    assert.ok(live.includes("leave"));
    assert.ok(!live.includes("end"));
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

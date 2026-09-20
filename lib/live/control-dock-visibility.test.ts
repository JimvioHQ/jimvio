import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  desktopDockControls,
  dockKeepsAvDuringShare,
  mobileDockAvFirst,
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
    assert.ok(mobileDockAvFirst(controls));
  });
});

describe("desktop control visibility", () => {
  it("exposes primary live controls for publishers", () => {
    const live = desktopDockControls("live", { canEnd: true });
    for (const id of ["mic", "cam", "share", "invite", "record", "react", "end"] as const) {
      assert.ok(live.includes(id), `expected ${id}`);
    }
    assert.ok(!live.includes("polls"));
    assert.ok(!live.includes("qa"));
    assert.ok(!live.includes("more"));
  });

  it("uses leave instead of end when cannot end", () => {
    const live = desktopDockControls("live", { canEnd: false });
    assert.ok(live.includes("leave"));
    assert.ok(!live.includes("end"));
  });
});

describe("mobile control visibility", () => {
  it("uses Audio → Video → Chat → React → Share → More → Leave order", () => {
    const controls = mobileDockControls({
      canPublish: true,
      isHost: false,
      sharing: false,
    });
    assert.deepEqual(controls, [
      "mic",
      "cam",
      "chat",
      "react",
      "share",
      "more",
      "leave",
    ]);
  });

  it("keeps Audio and Video first for viewers (not hidden)", () => {
    const controls = mobileDockControls({
      canPublish: false,
      isHost: false,
    });
    assert.ok(mobileDockAvFirst(controls));
    assert.ok(controls.includes("chat"));
    assert.ok(controls.includes("react"));
    assert.ok(controls.includes("copyLink"));
    assert.ok(controls.includes("more"));
    assert.ok(controls.includes("leave"));
    assert.ok(!controls.includes("share") || controls.includes("copyLink"));
  });

  it("exposes end for hosts and leave for speakers", () => {
    assert.ok(
      mobileDockControls({ canPublish: true, isHost: true }).includes("end")
    );
    assert.ok(
      mobileDockControls({ canPublish: true, isHost: false }).includes("leave")
    );
  });

  it("keeps Audio/Video visible in share and present-equivalent mobile share", () => {
    for (const sharing of [false, true]) {
      const c = mobileDockControls({
        canPublish: true,
        isHost: true,
        sharing,
      });
      assert.ok(mobileDockAvFirst(c), `sharing=${sharing}`);
    }
  });
});

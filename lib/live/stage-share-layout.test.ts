import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pipStreamForParticipant,
  selectStageShareLayout,
} from "./stage-share-layout.ts";
import type { RoomStageFocus } from "./stage-selection.ts";

function fakeStream(label: string): MediaStream {
  return { __label: label } as unknown as MediaStream;
}

function focus(partial: Partial<RoomStageFocus> & Pick<RoomStageFocus, "identity" | "kind">): RoomStageFocus {
  return {
    owner: partial.identity,
    version: partial.version ?? 1,
    identity: partial.identity,
    kind: partial.kind,
  };
}

describe("stage-share-layout", () => {
  it("keeps the host camera on stage when a participant starts sharing", () => {
    const hostCam = fakeStream("host-cam");
    const guestScreen = fakeStream("guest-screen");
    const layout = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: guestScreen,
          cameraStream: fakeStream("guest-cam"),
        },
      ],
      hostIdentity: "host-a",
      localIdentity: "host-a",
      localCamera: hostCam,
      preferLocalCamera: true,
    });
    assert.equal(layout.stageStream, hostCam);
    assert.equal(layout.activeScreenShareIdentity, null);
    assert.equal(layout.screenShares[0]?.identity, "guest-b");
    assert.equal(layout.screenShares[0]?.stream, guestScreen);
    assert.equal(layout.screenShares[0]?.onStage, false);
  });

  it("does not replace the host screen when another participant starts sharing", () => {
    const hostScreen = fakeStream("host-screen");
    const guestScreen = fakeStream("guest-screen");
    const layout = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: guestScreen,
          cameraStream: null,
        },
      ],
      hostIdentity: "host-a",
      localIdentity: "host-a",
      localSharing: true,
      localScreen: hostScreen,
      stageFocus: focus({ identity: "host-a", kind: "screen", version: 2 }),
    });
    assert.equal(layout.stageStream, hostScreen);
    assert.equal(layout.activeScreenShareIdentity, "host-a");
    assert.equal(layout.screenShares.find((share) => share.identity === "guest-b")?.onStage, false);
  });

  it("promotes the host-selected screen without changing the underlying stream", () => {
    const guestScreen = fakeStream("guest-screen");
    const layout = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: guestScreen,
          cameraStream: fakeStream("guest-cam"),
        },
      ],
      hostIdentity: "host-a",
      localCamera: fakeStream("host-cam"),
      stageFocus: focus({ identity: "guest-b", kind: "screen", version: 4 }),
    });
    assert.equal(layout.stageStream, guestScreen);
    assert.equal(layout.activeScreenShareIdentity, "guest-b");
    assert.equal(layout.screenShares[0]?.onStage, true);
    assert.equal(
      pipStreamForParticipant({
        cameraStream: fakeStream("guest-cam"),
        screenStream: guestScreen,
        sharing: true,
      }) === guestScreen,
      false,
    );
  });

  it("falls back to the host screen when the selected share stops", () => {
    const hostScreen = fakeStream("host-screen");
    const layout = selectStageShareLayout({
      remotes: [],
      hostIdentity: "host-a",
      localIdentity: "host-a",
      localSharing: true,
      localScreen: hostScreen,
      stageFocus: focus({ identity: "guest-b", kind: "screen", version: 3 }),
    });
    assert.equal(layout.stageStream, hostScreen);
    assert.equal(layout.activeScreenShareIdentity, "host-a");
    assert.equal(layout.screenShares.some((share) => share.identity === "guest-b"), false);
  });

  it("falls back to the host camera when no screen remains", () => {
    const hostCam = fakeStream("host-cam");
    const layout = selectStageShareLayout({
      remotes: [
        { identity: "host-a", role: "host", screenStream: null, cameraStream: hostCam },
        { identity: "guest-b", role: "speaker", screenStream: null, cameraStream: fakeStream("guest-cam") },
      ],
      hostIdentity: "host-a",
      stageFocus: focus({ identity: "guest-b", kind: "screen", version: 3 }),
    });
    assert.equal(layout.stageStream, hostCam);
    assert.equal(layout.activeScreenShareIdentity, null);
  });

  it("does not duplicate previews when the same share is reported twice", () => {
    const screen = fakeStream("guest-screen");
    const layout = selectStageShareLayout({
      remotes: [
        { identity: "guest-b", role: "speaker", screenStream: screen, cameraStream: null },
        { identity: "guest-b", role: "speaker", screenStream: screen, cameraStream: null },
      ],
      hostIdentity: "host-a",
    });
    assert.equal(layout.screenShares.length, 1);
  });

  it("shows a pinned participant even while the host screen is live", () => {
    const guestCam = fakeStream("guest-cam");
    const hostScreen = fakeStream("host-screen");
    const layout = selectStageShareLayout({
      remotes: [
        { identity: "guest-b", role: "speaker", screenStream: null, cameraStream: guestCam },
      ],
      hostIdentity: "host-a",
      localIdentity: "host-a",
      localSharing: true,
      localScreen: hostScreen,
      stageFocus: focus({ identity: "guest-b", kind: "participant", version: 4 }),
    });
    assert.equal(layout.stageStream, guestCam);
    assert.equal(layout.stageKind, "camera");
    assert.equal(layout.activeScreenShareIdentity, null);
    assert.equal(layout.screenShares[0]?.identity, "host-a");
    assert.equal(layout.screenShares[0]?.onStage, false);
  });

  it("keeps the selected screen when the sharer camera turns on", () => {
    const guestScreen = fakeStream("guest-screen");
    const withoutCamera = selectStageShareLayout({
      remotes: [
        { identity: "guest-b", role: "speaker", screenStream: guestScreen, cameraStream: null },
      ],
      hostIdentity: "host-a",
      stageFocus: focus({ identity: "guest-b", kind: "screen", version: 3 }),
    });
    const withCamera = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: guestScreen,
          cameraStream: fakeStream("guest-cam"),
        },
      ],
      hostIdentity: "host-a",
      localCamera: fakeStream("host-cam"),
      stageFocus: focus({ identity: "guest-b", kind: "screen", version: 3 }),
    });
    assert.equal(withoutCamera.stageStream, guestScreen);
    assert.equal(withCamera.stageStream, guestScreen);
    assert.equal(withCamera.stageKind, "screen");
  });

  it("drops a stopped share and falls back when the pinned person has left", () => {
    const hostScreen = fakeStream("host-screen");
    const layout = selectStageShareLayout({
      remotes: [],
      hostIdentity: "host-a",
      localIdentity: "host-a",
      localSharing: true,
      localScreen: hostScreen,
      stageFocus: focus({ identity: "guest-b", kind: "participant", version: 5 }),
    });
    assert.equal(layout.stageStream, hostScreen);
    assert.equal(layout.stageKind, "screen");
    assert.equal(layout.screenShares.some((share) => share.identity === "guest-b"), false);
  });

  it("keeps a pinned camera when nobody is selected as a screen", () => {
    const guestCam = fakeStream("guest-cam");
    const layout = selectStageShareLayout({
      remotes: [
        { identity: "guest-b", role: "speaker", screenStream: null, cameraStream: guestCam },
      ],
      hostIdentity: "host-a",
      localCamera: fakeStream("host-cam"),
      preferLocalCamera: true,
      stageFocus: focus({ identity: "guest-b", kind: "participant", version: 2 }),
    });
    assert.equal(layout.stageStream, guestCam);
    assert.equal(layout.stageKind, "camera");
  });

  it("PIP helper never returns the screen track", () => {
    const screen = fakeStream("screen");
    const cam = fakeStream("cam");
    assert.equal(
      pipStreamForParticipant({ cameraStream: null, screenStream: screen, sharing: true }),
      null,
    );
    assert.equal(
      pipStreamForParticipant({ cameraStream: cam, screenStream: screen, sharing: true }),
      cam,
    );
  });
});

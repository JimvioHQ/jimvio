import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pipStreamForParticipant,
  selectStageShareLayout,
} from "./stage-share-layout.ts";

function fakeStream(label: string): MediaStream {
  // Minimal stand-in — identity by object reference is enough for layout tests.
  return { __label: label } as unknown as MediaStream;
}

describe("stage-share-layout", () => {
  it("puts guest screen on main stage and keeps camera for PIP", () => {
    const screen = fakeStream("screen");
    const cam = fakeStream("cam");
    const layout = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: screen,
          cameraStream: cam,
        },
      ],
      hostIdentity: "host-a",
      preferLocalStage: true,
      localPreview: fakeStream("host-cam"),
    });
    assert.equal(layout.stageStream, screen);
    assert.equal(layout.activeScreenShareIdentity, "guest-b");
    assert.equal(
      pipStreamForParticipant({
        cameraStream: cam,
        screenStream: screen,
        sharing: true,
      }),
      cam
    );
  });

  it("keeps screen main when sharer enables camera", () => {
    const screen = fakeStream("screen");
    const cam = fakeStream("cam");
    const layout = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: screen,
          cameraStream: cam,
        },
      ],
      hostIdentity: "host-a",
      preferLocalStage: true,
      localPreview: fakeStream("host-cam"),
      stagePinIdentity: "guest-b",
    });
    assert.equal(layout.stageStream, screen);
    assert.equal(layout.activeScreenShareIdentity, "guest-b");
  });

  it("does not let Move-to-Stage camera replace an active screen", () => {
    const screen = fakeStream("screen-b");
    const camC = fakeStream("cam-c");
    const layout = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: screen,
          cameraStream: null,
        },
        {
          identity: "guest-c",
          role: "speaker",
          screenStream: null,
          cameraStream: camC,
        },
      ],
      hostIdentity: "host-a",
      stagePinIdentity: "guest-c",
    });
    assert.equal(layout.stageStream, screen);
    assert.equal(layout.activeScreenShareIdentity, "guest-b");
  });

  it("hands off main stage to the latest remote screen share", () => {
    const screenB = fakeStream("screen-b");
    const screenC = fakeStream("screen-c");
    const layout = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: screenB,
          cameraStream: null,
        },
        {
          identity: "guest-c",
          role: "speaker",
          screenStream: screenC,
          cameraStream: null,
        },
      ],
      hostIdentity: "host-a",
      lastRemoteScreenIdentity: "guest-c",
    });
    assert.equal(layout.stageStream, screenC);
    assert.equal(layout.activeScreenShareIdentity, "guest-c");
  });

  it("hands off back to B when B publishes screen again", () => {
    const screenB = fakeStream("screen-b");
    const screenC = fakeStream("screen-c");
    const layout = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: screenB,
          cameraStream: fakeStream("cam-b"),
        },
        {
          identity: "guest-c",
          role: "speaker",
          screenStream: screenC,
          cameraStream: null,
        },
      ],
      hostIdentity: "host-a",
      lastRemoteScreenIdentity: "guest-b",
    });
    assert.equal(layout.stageStream, screenB);
    assert.equal(layout.activeScreenShareIdentity, "guest-b");
  });

  it("restores host camera stage when screen share stops", () => {
    const hostCam = fakeStream("host-cam");
    const layout = selectStageShareLayout({
      remotes: [
        {
          identity: "guest-b",
          role: "speaker",
          screenStream: null,
          cameraStream: fakeStream("guest-cam"),
        },
        {
          identity: "host-a",
          role: "host",
          screenStream: null,
          cameraStream: hostCam,
        },
      ],
      hostIdentity: "host-a",
    });
    assert.equal(layout.stageStream, hostCam);
    assert.equal(layout.activeScreenShareIdentity, null);
  });

  it("PIP helper never returns the screen track", () => {
    const screen = fakeStream("screen");
    const cam = fakeStream("cam");
    assert.equal(
      pipStreamForParticipant({
        cameraStream: null,
        screenStream: screen,
        sharing: true,
      }),
      null
    );
    assert.equal(
      pipStreamForParticipant({
        cameraStream: cam,
        screenStream: screen,
        sharing: true,
      }),
      cam
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canControlRoomStage,
  mergeStageFocus,
  nextStageFocus,
  readStageFocus,
  resolveStageSource,
} from "./stage-selection.ts";

describe("live stage selection", () => {
  it("lets only the host and cohost change the room stage", () => {
    assert.equal(canControlRoomStage("host"), true);
    assert.equal(canControlRoomStage("cohost"), true);
    assert.equal(canControlRoomStage("speaker"), false);
    assert.equal(canControlRoomStage("viewer"), false);
    assert.equal(canControlRoomStage(null), false);
  });

  it("keeps an unselected host screen when a participant starts sharing", () => {
    const resolved = resolveStageSource({
      focus: null,
      hostIdentity: "host-a",
      screenIdentities: ["host-a", "guest-b"],
      hostSharing: true,
    });
    assert.equal(resolved.identity, "host-a");
    assert.equal(resolved.kind, "screen");
  });

  it("keeps the host screen when a participant share arrives", () => {
    const resolved = resolveStageSource({
      focus: { identity: "host-a", owner: "host-a", kind: "screen", version: 2 },
      hostIdentity: "host-a",
      screenIdentities: ["host-a", "guest-b"],
      hostSharing: true,
    });
    assert.equal(resolved.identity, "host-a");
    assert.equal(resolved.kind, "screen");
    assert.equal(resolved.fellBack, false);
  });

  it("uses the host selection for every participant, including a late joiner", () => {
    const stored = readStageFocus({
      stage_focus: { identity: "guest-b", owner: "guest-b", kind: "screen", version: 5 },
    });
    const resolved = resolveStageSource({
      focus: stored,
      hostIdentity: "host-a",
      screenIdentities: ["host-a", "guest-b"],
      hostSharing: true,
    });
    assert.equal(resolved.identity, "guest-b");
    assert.equal(resolved.kind, "screen");
  });

  it("ignores a stale selection and does not restore a stopped share", () => {
    const current = { identity: "guest-c", owner: "guest-c", kind: "screen" as const, version: 6 };
    const stale = { identity: "guest-b", owner: "guest-b", kind: "screen" as const, version: 4 };
    assert.equal(mergeStageFocus(current, stale)?.identity, "guest-c");
    const resolved = resolveStageSource({
      focus: current,
      hostIdentity: "host-a",
      screenIdentities: ["host-a"],
      hostSharing: true,
    });
    assert.equal(resolved.identity, "host-a");
    assert.equal(resolved.fellBack, true);
    assert.equal(resolved.identity === "guest-c", false);
  });

  it("keeps an explicit participant pin ahead of an active host screen", () => {
    const resolved = resolveStageSource({
      focus: { identity: "guest-b", owner: "guest-b", kind: "participant", version: 4 },
      hostIdentity: "host-a",
      screenIdentities: ["host-a"],
      hostSharing: true,
    });
    assert.equal(resolved.identity, "guest-b");
    assert.equal(resolved.kind, "camera");
    assert.equal(resolved.fellBack, false);
  });

  it("does not let a newer share replace the host-selected screen", () => {
    const resolved = resolveStageSource({
      focus: { identity: "host-a", owner: "host-a", kind: "screen", version: 2 },
      hostIdentity: "host-a",
      screenIdentities: ["host-a", "guest-b"],
      hostSharing: true,
    });
    assert.equal(resolved.identity, "host-a");
    assert.equal(resolved.kind, "screen");
  });

  it("increments the version when the host changes the stage", () => {
    const next = nextStageFocus({
      previous: { identity: "host-a", owner: "host-a", kind: "screen", version: 2 },
      identity: "guest-b",
      kind: "screen",
    });
    assert.equal(next.version, 3);
    assert.equal(next.identity, "guest-b");
    assert.equal(next.owner, "guest-b");
    assert.equal(next.kind, "screen");
  });
});

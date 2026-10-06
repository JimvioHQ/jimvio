import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PARTICIPANT_PERMISSIONS,
  mergeParticipantPermissions,
  parseParticipantPermissions,
  participantMediaPublishAllowed,
  permissionDeniedReason,
  serializeParticipantPermissions,
} from "./participant-permissions";

describe("participant permissions", () => {
  it("defaults to allowing audio, video, screen share, and recording", () => {
    assert.deepEqual(parseParticipantPermissions(null), DEFAULT_PARTICIPANT_PERMISSIONS);
    assert.deepEqual(parseParticipantPermissions({}), DEFAULT_PARTICIPANT_PERMISSIONS);
    assert.equal(participantMediaPublishAllowed(DEFAULT_PARTICIPANT_PERMISSIONS), true);
  });

  it("parses snake_case and camelCase flags", () => {
    const a = parseParticipantPermissions({
      participants: { allow_audio: false, allow_video: true },
    });
    assert.equal(a.allowAudio, false);
    assert.equal(a.allowVideo, true);
    assert.equal(a.allowScreenShare, true);

    const b = parseParticipantPermissions({
      participants: {
        allowParticipantScreenShare: false,
        allowParticipantRecording: false,
      },
    });
    assert.equal(b.allowScreenShare, false);
    assert.equal(b.allowRecording, false);
  });

  it("serializes and merges patches", () => {
    const merged = mergeParticipantPermissions(DEFAULT_PARTICIPANT_PERMISSIONS, {
      allowAudio: false,
    });
    assert.equal(merged.allowAudio, false);
    assert.equal(merged.allowVideo, true);
    assert.deepEqual(serializeParticipantPermissions(merged).allow_audio, false);
  });

  it("returns clear denial reasons", () => {
    const blocked = mergeParticipantPermissions(DEFAULT_PARTICIPANT_PERMISSIONS, {
      allowAudio: false,
      allowScreenShare: false,
      allowRecording: false,
    });
    assert.match(permissionDeniedReason("audio", blocked) ?? "", /host/i);
    assert.match(permissionDeniedReason("screen", blocked) ?? "", /host/i);
    assert.match(permissionDeniedReason("recording", blocked) ?? "", /host/i);
    assert.equal(permissionDeniedReason("video", blocked), null);
  });
});

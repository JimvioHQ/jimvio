import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canRecord, canStartCloudEgress } from "./roles";

describe("recording roles", () => {
  it("allows Everyone / Guest (viewer/speaker) when session permits", () => {
    assert.equal(canRecord("viewer"), true);
    assert.equal(canRecord("speaker"), true);
    assert.equal(canRecord("moderator"), true);
    assert.equal(canRecord("host"), true);
  });

  it("honors host session deny for participants but not host", () => {
    assert.equal(canRecord("viewer", { allowParticipantRecording: false }), false);
    assert.equal(canRecord("speaker", { allowParticipantRecording: false }), false);
    assert.equal(canRecord("host", { allowParticipantRecording: false }), true);
    assert.equal(canStartCloudEgress("speaker", { allowParticipantRecording: true }), true);
    assert.equal(canStartCloudEgress("viewer", { allowParticipantRecording: false }), false);
  });

  it("uses room composite egress for any allowed recorder", () => {
    assert.equal(canStartCloudEgress("host"), true);
    assert.equal(canStartCloudEgress("cohost"), true);
    assert.equal(canStartCloudEgress("speaker"), true);
    assert.equal(canStartCloudEgress("viewer"), true);
  });
});

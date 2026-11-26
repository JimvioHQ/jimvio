import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesMissionListFilter, missionIsOpen, validateMissionDraft, validateSubmission } from "./mission-rules";

describe("mission rules", () => {
  it("blocks automatic review when evidence is required", () => {
    const result = validateMissionDraft({
      title: "Share a clip",
      reviewMode: "auto",
      submissionKind: "link",
    });
    assert.equal(result.ok, false);
  });

  it("allows points rewards and refuses a reversed deadline", () => {
    const ok = validateMissionDraft({
      title: "Daily check-in",
      reviewMode: "auto",
      submissionKind: "none",
      rewardType: "points",
      points: 25,
      startsAt: "2026-11-01T00:00:00.000Z",
      endsAt: "2026-11-08T00:00:00.000Z",
    });
    assert.equal(ok.ok, true);
    const bad = validateMissionDraft({
      title: "Daily check-in",
      startsAt: "2026-11-08T00:00:00.000Z",
      endsAt: "2026-11-01T00:00:00.000Z",
    });
    assert.equal(bad.ok, false);
  });

  it("enforces open window and submission shape", () => {
    assert.equal(missionIsOpen({ status: "paused" }).ok, false);
    assert.equal(
      missionIsOpen({ status: "published", due_date: "2020-01-01T00:00:00.000Z" }).ok,
      false,
    );
    assert.equal(validateSubmission("text", { text: "short" }).ok, false);
    assert.equal(validateSubmission("link", { url: "https://example.com/proof" }).ok, true);
  });

  it("keeps hub mission filters distinct", () => {
    assert.equal(matchesMissionListFilter({ filter: "all", status: "published" }), true);
    assert.equal(
      matchesMissionListFilter({ filter: "active", status: "published", participantStatus: "joined" }),
      true,
    );
    assert.equal(
      matchesMissionListFilter({ filter: "active", status: "published", participantStatus: "completed" }),
      false,
    );
    assert.equal(
      matchesMissionListFilter({ filter: "in_progress", participantStatus: "submitted" }),
      true,
    );
    assert.equal(
      matchesMissionListFilter({ filter: "in_progress", participantStatus: "rejected" }),
      false,
    );
    assert.equal(
      matchesMissionListFilter({ filter: "completed", participantStatus: "approved" }),
      true,
    );
    assert.equal(
      matchesMissionListFilter({ filter: "completed", participantStatus: "joined" }),
      false,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canViewEventRecord, isDiscoverableEvent, validateEventDraft } from "./event-rules";

describe("event rules", () => {
  it("rejects an end time before the start", () => {
    const result = validateEventDraft({
      title: "Launch AMA",
      startsAt: "2026-11-01T18:00:00.000Z",
      endsAt: "2026-11-01T17:00:00.000Z",
      timezone: "UTC",
      format: "online",
    });
    assert.equal(result.ok, false);
  });

  it("rejects a malformed meeting link", () => {
    const result = validateEventDraft({
      title: "Workshop",
      startsAt: "2026-11-01T18:00:00.000Z",
      timezone: "America/New_York",
      format: "online",
      meetingUrl: "javascript:alert(1)",
    });
    assert.equal(result.ok, false);
  });

  it("accepts a public online event", () => {
    const result = validateEventDraft({
      title: "Workshop",
      startsAt: "2026-11-01T18:00:00.000Z",
      endsAt: "2026-11-01T19:00:00.000Z",
      timezone: "Africa/Kigali",
      format: "hybrid",
      meetingUrl: "https://meet.example.com/room",
      venue: "Kigali",
      visibility: "public",
      status: "published",
    });
    assert.equal(result.ok, true);
  });

  it("keeps private and cancelled events out of discovery", () => {
    assert.equal(isDiscoverableEvent({ visibility: "private", status: "published" }), false);
    assert.equal(isDiscoverableEvent({ visibility: "public", status: "cancelled" }), false);
    assert.equal(isDiscoverableEvent({ visibility: "public", status: "draft" }), false);
    assert.equal(isDiscoverableEvent({ visibility: "public", status: "published" }), true);
  });

  it("lets RSVP holders view a private event after the invite link is gone", () => {
    assert.equal(
      canViewEventRecord({
        visibility: "private",
        status: "published",
        canManage: false,
        invited: false,
        rsvpStatus: "going",
      }),
      true,
    );
    assert.equal(
      canViewEventRecord({
        visibility: "private",
        status: "published",
        canManage: false,
        invited: false,
        rsvpStatus: null,
      }),
      false,
    );
  });
});

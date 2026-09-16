import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPresenceEvent,
  diffPresenceEvents,
  formatPresenceBody,
  presenceEventId,
  safeDisplayName,
} from "./presence-events.ts";

describe("presence system event formatting", () => {
  it("formats join and leave with real names", () => {
    assert.equal(formatPresenceBody("join", "Claude"), "Claude joined the live");
    assert.equal(formatPresenceBody("leave", "Sibomana"), "Sibomana left the live");
  });

  it("never surfaces UUIDs as display names", () => {
    assert.equal(
      safeDisplayName("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
      "Someone"
    );
    assert.equal(safeDisplayName(""), "Someone");
    assert.equal(safeDisplayName("Ada"), "Ada");
  });
});

describe("presence event identity / dedupe", () => {
  it("builds stable ids from kind + session + user + marker", () => {
    const a = presenceEventId("join", "s1", "u1", "2026-01-01T00:00:00.000Z");
    const b = presenceEventId("join", "s1", "u1", "2026-01-01T00:00:00.000Z");
    const c = presenceEventId("leave", "s1", "u1", "2026-01-01T00:00:00.000Z");
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it("buildPresenceEvent uses stable id", () => {
    const e = buildPresenceEvent({
      kind: "join",
      sessionId: "s1",
      userId: "u1",
      displayName: "Claude",
      marker: "t1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(e.id, "sys:join:s1:u1:t1");
    assert.equal(e.body, "Claude joined the live");
  });
});

describe("join/leave diff", () => {
  it("emits join when a participant newly appears as joined", () => {
    const seen = new Set<string>();
    const events = diffPresenceEvents({
      sessionId: "s1",
      prev: [],
      next: [
        {
          user_id: "u1",
          status: "joined",
          display_name: "Claude",
          joined_at: "2026-01-01T00:00:01.000Z",
        },
      ],
      seenIds: seen,
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, "join");
    assert.equal(events[0].body, "Claude joined the live");
  });

  it("emits leave when a joined participant disappears", () => {
    const seen = new Set<string>();
    const events = diffPresenceEvents({
      sessionId: "s1",
      prev: [
        {
          user_id: "u1",
          status: "joined",
          display_name: "Claude",
          joined_at: "2026-01-01T00:00:01.000Z",
        },
      ],
      next: [],
      seenIds: seen,
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, "leave");
    assert.equal(events[0].body, "Claude left the live");
  });

  it("does not duplicate the same join event", () => {
    const seen = new Set<string>();
    const next = [
      {
        user_id: "u1",
        status: "joined",
        display_name: "Claude",
        joined_at: "2026-01-01T00:00:01.000Z",
      },
    ];
    const first = diffPresenceEvents({
      sessionId: "s1",
      prev: [],
      next,
      seenIds: seen,
    });
    const second = diffPresenceEvents({
      sessionId: "s1",
      prev: [],
      next,
      seenIds: seen,
    });
    assert.equal(first.length, 1);
    assert.equal(second.length, 0);
  });

  it("skips self and does not re-announce on reconnect refresh", () => {
    const seen = new Set<string>();
    const row = {
      user_id: "me",
      status: "joined",
      display_name: "Me",
      joined_at: "2026-01-01T00:00:01.000Z",
    };
    const other = {
      user_id: "u2",
      status: "joined",
      display_name: "Sibomana",
      joined_at: "2026-01-01T00:00:02.000Z",
    };
    const first = diffPresenceEvents({
      sessionId: "s1",
      prev: [],
      next: [row, other],
      selfUserId: "me",
      seenIds: seen,
    });
    assert.equal(first.length, 1);
    assert.equal(first[0].user_id, "u2");

    const refresh = diffPresenceEvents({
      sessionId: "s1",
      prev: [row, other],
      next: [row, other],
      selfUserId: "me",
      seenIds: seen,
    });
    assert.equal(refresh.length, 0);
  });
});

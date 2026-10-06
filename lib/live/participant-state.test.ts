import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyParticipantEvent,
  dedupeParticipantsByUserId,
  mergeParticipantProfile,
  reconcileParticipants,
} from "./participant-state.ts";

function p(
  user_id: string,
  patch: Partial<ReturnType<typeof base>> = {}
) {
  return { ...base(user_id), ...patch };
}

function base(user_id: string) {
  return {
    id: `row-${user_id}`,
    user_id,
    status: "joined",
    role: "viewer",
    mic_on: true,
    cam_on: false,
    sharing: false,
    display_name: null as string | null,
    avatar_url: null as string | null,
    updated_at: "2026-01-01T00:00:00.000Z",
    joined_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("participant join appears immediately", () => {
  it("inserts a newly joined participant by user_id", () => {
    const next = applyParticipantEvent([], {
      eventType: "INSERT",
      row: p("u1", { display_name: "Ada", role: "speaker" }),
    });
    assert.equal(next.length, 1);
    assert.equal(next[0].user_id, "u1");
    assert.equal(next[0].display_name, "Ada");
  });
});

describe("participant leave removes correctly", () => {
  it("removes on DELETE and on left/removed status", () => {
    const start = [p("u1"), p("u2")];
    const afterDelete = applyParticipantEvent(start, {
      eventType: "DELETE",
      old: p("u1"),
    });
    assert.deepEqual(
      afterDelete.map((x) => x.user_id),
      ["u2"]
    );

    const afterLeft = applyParticipantEvent(start, {
      eventType: "UPDATE",
      row: p("u2", { status: "left" }),
    });
    assert.deepEqual(
      afterLeft.map((x) => x.user_id),
      ["u1"]
    );
  });
});

describe("participant deduplication", () => {
  it("dedupes by user_id not display name", () => {
    const list = dedupeParticipantsByUserId([
      p("u1", { display_name: "Ada", updated_at: "2026-01-01T00:00:00.000Z" }),
      p("u1", {
        display_name: "Ada Lovelace",
        avatar_url: "https://cdn/a.png",
        updated_at: "2026-01-01T00:01:00.000Z",
      }),
      p("u2", { display_name: "Ada" }),
    ]);
    assert.equal(list.length, 2);
    const ada = list.find((x) => x.user_id === "u1")!;
    assert.equal(ada.display_name, "Ada Lovelace");
    assert.equal(ada.avatar_url, "https://cdn/a.png");
  });

  it("merge preserves profile when realtime row omits it", () => {
    const merged = mergeParticipantProfile(
      p("u1", { display_name: "Ada", avatar_url: "a.png", username: "ada" }),
      p("u1", { display_name: null, avatar_url: null, username: null, mic_on: false })
    );
    assert.equal(merged.display_name, "Ada");
    assert.equal(merged.avatar_url, "a.png");
    assert.equal(merged.username, "ada");
    assert.equal(merged.mic_on, false);
  });
});

describe("audio and video state updates", () => {
  it("updates mic_on and cam_on on UPDATE without duplicating", () => {
    const start = [p("u1", { mic_on: true, cam_on: false })];
    const afterMic = applyParticipantEvent(start, {
      eventType: "UPDATE",
      row: p("u1", { mic_on: false, cam_on: false, updated_at: "2026-01-01T00:00:01.000Z" }),
    });
    assert.equal(afterMic.length, 1);
    assert.equal(afterMic[0].mic_on, false);

    const afterCam = applyParticipantEvent(afterMic, {
      eventType: "UPDATE",
      row: p("u1", {
        mic_on: false,
        cam_on: true,
        updated_at: "2026-01-01T00:00:02.000Z",
      }),
    });
    assert.equal(afterCam.length, 1);
    assert.equal(afterCam[0].cam_on, true);
  });
});

describe("screen-share related media flags", () => {
  it("accepts sharing flag updates on the same participant row", () => {
    const start = [p("u1", { mic_on: true, cam_on: true, sharing: false })];
    const next = applyParticipantEvent(start, {
      eventType: "UPDATE",
      row: p("u1", {
        mic_on: true,
        cam_on: false,
        sharing: true,
        updated_at: "2026-01-01T00:00:03.000Z",
      }),
    });
    assert.equal(next.length, 1);
    assert.equal(next[0].cam_on, false);
    assert.equal(next[0].mic_on, true);
    assert.equal(next[0].sharing, true);
  });
});

describe("duplicate realtime events", () => {
  it("INSERT of the same user_id merges instead of appending", () => {
    const first = applyParticipantEvent([], {
      eventType: "INSERT",
      row: p("u1", { display_name: "Ada" }),
    });
    const second = applyParticipantEvent(first, {
      eventType: "INSERT",
      row: p("u1", {
        display_name: "Ada Lovelace",
        mic_on: false,
        updated_at: "2026-01-01T00:00:05.000Z",
      }),
    });
    assert.equal(second.length, 1);
    assert.equal(second[0].display_name, "Ada Lovelace");
    assert.equal(second[0].mic_on, false);
  });
});

describe("reconcile keeps recent optimistic joins", () => {
  it("does not drop a local join missing from a stale server snapshot", () => {
    const now = Date.parse("2026-01-01T00:00:02.000Z");
    const local = [
      p("host", { role: "host", updated_at: "2026-01-01T00:00:00.000Z" }),
      p("joiner", {
        display_name: "Joiner",
        updated_at: "2026-01-01T00:00:01.500Z",
        joined_at: "2026-01-01T00:00:01.500Z",
      }),
    ];
    const server = [p("host", { role: "host" })];
    const next = reconcileParticipants(local, server, now);
    assert.equal(next.length, 2);
    assert.ok(next.some((x) => x.user_id === "joiner"));
  });

  it("drops stale local joins after the grace window", () => {
    const now = Date.parse("2026-01-01T00:00:20.000Z");
    const local = [
      p("host", { role: "host" }),
      p("gone", {
        updated_at: "2026-01-01T00:00:01.000Z",
        joined_at: "2026-01-01T00:00:01.000Z",
      }),
    ];
    const server = [p("host", { role: "host" })];
    const next = reconcileParticipants(local, server, now);
    assert.deepEqual(
      next.map((x) => x.user_id),
      ["host"]
    );
  });
});
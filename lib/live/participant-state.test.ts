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
      p("u1", { display_name: "Ada", avatar_url: "a.png" }),
      p("u1", { display_name: null, avatar_url: null, mic_on: false })
    );
    assert.equal(merged.display_name, "Ada");
    assert.equal(merged.avatar_url, "a.png");
    assert.equal(merged.mic_on, false);
  });
});

describe("reconnect reconciliation", () => {
  it("server list wins identity while filling profiles from local", () => {
    const local = [
      p("u1", { display_name: "Ada", avatar_url: "a.png", mic_on: false }),
      p("stale", { display_name: "Gone" }),
    ];
    const server = [
      p("u1", { display_name: null, avatar_url: null, mic_on: true }),
      p("u2", { display_name: "Bob" }),
    ];
    const next = reconcileParticipants(local, server);
    assert.deepEqual(
      next.map((x) => x.user_id),
      ["u1", "u2"]
    );
    assert.equal(next[0].display_name, "Ada");
    assert.equal(next[0].mic_on, true);
    assert.equal(next[1].display_name, "Bob");
  });
});

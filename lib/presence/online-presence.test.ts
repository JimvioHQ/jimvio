import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isUserOnline,
  liveSessionForUser,
  onlineUserIds,
  pruneStalePresence,
} from "./online-presence.ts";

describe("online presence", () => {
  it("keeps a user online while any tab is still present", () => {
    const state = {
      "user-a": [{ online_at: new Date().toISOString() }, { online_at: new Date().toISOString() }],
      "user-b": [{ online_at: new Date().toISOString() }],
    };
    assert.deepEqual(onlineUserIds(state).sort(), ["user-a", "user-b"]);
    const oneTabLeft = { "user-a": [{ online_at: new Date().toISOString() }] };
    assert.equal(isUserOnline(oneTabLeft, "user-a"), true);
    assert.equal(isUserOnline({}, "user-a"), false);
  });

  it("drops a crashed tab after the heartbeat window", () => {
    const now = Date.now();
    const pruned = pruneStalePresence(
      {
        "user-a": [{ online_at: new Date(now - 120_000).toISOString() }],
        "user-b": [{ online_at: new Date(now - 5_000).toISOString() }],
      },
      now,
      45_000,
    );
    assert.equal(isUserOnline(pruned, "user-a"), false);
    assert.equal(isUserOnline(pruned, "user-b"), true);
  });

  it("does not treat an online user as live without a session", () => {
    assert.equal(liveSessionForUser([{ userId: "host", sessionId: "sess-1" }], "guest"), null);
    assert.equal(liveSessionForUser([{ userId: "host", sessionId: "sess-1" }], "host"), "sess-1");
  });
});

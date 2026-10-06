import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  composeLivePresenceIds,
  countLivePresence,
  selectLatestScreenShareIdentity,
} from "./livekit-presence.ts";

describe("composeLivePresenceIds", () => {
  it("uses LiveKit remotes + self when connected", () => {
    const ids = composeLivePresenceIds({
      selfId: "host-a",
      connected: true,
      remotes: [{ identity: "guest-b" }],
      dbParticipants: [
        { user_id: "host-a", status: "joined" },
        { user_id: "guest-b", status: "joined" },
        { user_id: "ghost", status: "joined", joined_at: "2020-01-01T00:00:00.000Z" },
      ],
      now: Date.parse("2026-01-01T00:00:00.000Z"),
    });
    assert.deepEqual(ids.sort(), ["guest-b", "host-a"]);
  });

  it("does not resurrect departed DB joined during LiveKit disconnect", () => {
    const ids = composeLivePresenceIds({
      selfId: "host-a",
      connected: false,
      remotes: [],
      lastConnectedIds: ["host-a"],
      dbParticipants: [
        { user_id: "host-a", status: "joined" },
        { user_id: "guest-b", status: "joined" },
      ],
    });
    assert.deepEqual(ids.sort(), ["host-a"]);
  });

  it("keeps waiting-room / invited from DB", () => {
    const ids = composeLivePresenceIds({
      selfId: "host-a",
      connected: true,
      remotes: [],
      dbParticipants: [{ user_id: "waiting", status: "requested" }],
    });
    assert.ok(ids.includes("waiting"));
  });
});

describe("countLivePresence", () => {
  it("counts self + remotes when connected", () => {
    assert.equal(
      countLivePresence({
        connected: true,
        selfId: "host-a",
        remoteCount: 1,
        pendingDbCount: 0,
        composedIdCount: 99,
      }),
      2
    );
  });
});

describe("selectLatestScreenShareIdentity", () => {
  it("hands off B → C → B by publication order", () => {
    const order = new Map<string, number>();
    order.set("guest-b", 1);
    assert.equal(
      selectLatestScreenShareIdentity({
        screenIdentities: ["guest-b"],
        order,
      }),
      "guest-b"
    );
    order.set("guest-c", 2);
    assert.equal(
      selectLatestScreenShareIdentity({
        screenIdentities: ["guest-b", "guest-c"],
        order,
      }),
      "guest-c"
    );
    order.set("guest-b", 3);
    assert.equal(
      selectLatestScreenShareIdentity({
        screenIdentities: ["guest-b", "guest-c"],
        order,
      }),
      "guest-b"
    );
  });
});

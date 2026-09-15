import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  markSeenMessageId,
  reconcileChatHistory,
  reconcileOutboxFlush,
  shouldSkipRealtimeInsert,
  sortMessagesChronologically,
  upsertChatMessage,
} from "./chat-message-state.ts";

function msg(
  id: string,
  body: string,
  created_at: string,
  extra: Record<string, unknown> = {}
) {
  return { id, body, created_at, sender_name: "Member", sender_avatar: null, ...extra };
}

describe("chat realtime delivery", () => {
  it("appends a realtime insert when unseen", () => {
    const seen = new Set<string>();
    assert.equal(shouldSkipRealtimeInsert(seen, "m1"), false);
    markSeenMessageId(seen, "m1");
    const next = upsertChatMessage([], msg("m1", "hello", "2026-01-01T00:00:01.000Z"));
    assert.equal(next.length, 1);
    assert.equal(next[0].body, "hello");
    assert.equal(shouldSkipRealtimeInsert(seen, "m1"), true);
  });
});

describe("optimistic message reconciliation", () => {
  it("replaces temporary client id with server id without duplicating", () => {
    const optimistic = msg("tmp:1", "hi", "2026-01-01T00:00:01.000Z", {
      pending: true,
      client_id: "tmp:1",
    });
    const confirmed = msg("srv-1", "hi", "2026-01-01T00:00:01.100Z", {
      client_id: "tmp:1",
    });
    const next = upsertChatMessage([optimistic], confirmed, {
      replaceClientId: "tmp:1",
    });
    assert.equal(next.length, 1);
    assert.equal(next[0].id, "srv-1");
    assert.equal(next[0].pending, false);
  });

  it("reconciles outbox flush clientId → server message", () => {
    const prev = [
      msg("outbox:abc", "queued", "2026-01-01T00:00:00.000Z", { pending: true }),
    ];
    const next = reconcileOutboxFlush(
      prev,
      "outbox:abc",
      msg("srv-9", "queued", "2026-01-01T00:00:02.000Z")
    );
    assert.equal(next.length, 1);
    assert.equal(next[0].id, "srv-9");
  });
});

describe("message deduplication", () => {
  it("does not insert the same server id twice", () => {
    const first = upsertChatMessage([], msg("m1", "a", "2026-01-01T00:00:01.000Z"));
    const second = upsertChatMessage(first, msg("m1", "a", "2026-01-01T00:00:01.000Z"));
    assert.equal(second.length, 1);
  });

  it("never dedupes by body text alone", () => {
    const next = reconcileChatHistory(
      [msg("a", "same", "2026-01-01T00:00:01.000Z")],
      [msg("b", "same", "2026-01-01T00:00:02.000Z")]
    );
    assert.equal(next.length, 2);
  });
});

describe("message ordering", () => {
  it("keeps chronological order after upserts", () => {
    let list = upsertChatMessage([], msg("m2", "second", "2026-01-01T00:00:02.000Z"));
    list = upsertChatMessage(list, msg("m1", "first", "2026-01-01T00:00:01.000Z"));
    list = upsertChatMessage(list, msg("m3", "third", "2026-01-01T00:00:03.000Z"));
    assert.deepEqual(
      sortMessagesChronologically(list).map((m) => m.id),
      ["m1", "m2", "m3"]
    );
  });
});

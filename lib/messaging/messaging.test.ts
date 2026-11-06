import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeLike, normalizePeopleQuery, rankPeople, type PersonHit } from "@/lib/messaging/people-search";
import {
  isMarketplaceUnread,
  marketplaceReadKey,
  marketplaceThreadId,
  mergeTimeline,
  parseMarketplaceThreadId,
  previewMarketplaceMessage,
} from "@/lib/messaging/marketplace-thread";
import { inboxApiBase } from "@/lib/community/chat/conversation-messages";

const person = (id: string, full_name: string | null, username: string | null, extra: Partial<PersonHit> = {}): PersonHit => ({
  id, full_name, username, avatar_url: null, bio: null, is_verified: false, ...extra,
});

describe("messaging: people search", () => {
  it("normalizes queries and rejects too-short input", () => {
    assert.equal(normalizePeopleQuery("  @aline  "), "aline");
    assert.equal(normalizePeopleQuery("a"), null);
    assert.equal(normalizePeopleQuery(42), null);
    assert.equal(normalizePeopleQuery("x".repeat(200))?.length, 60);
  });

  it("escapes LIKE wildcards so input matches literally", () => {
    assert.equal(escapeLike("50%_off\\"), "50\\%\\_off\\\\");
  });

  it("dedupes, excludes the searcher, ranks exact and prefix matches first", () => {
    const rows = [
      person("3", "Marie Aline", "marie"),
      person("1", "Aline Uwase", "aline_u"),
      person("me", "Aline Me", "aline"),
      person("2", "Bob", "aline", { is_verified: true }),
      person("1", "Aline Uwase", "aline_u"),
    ];
    const ranked = rankPeople(rows, "aline", "me");
    assert.deepEqual(ranked.map((p) => p.id), ["2", "1", "3"]);
    assert.ok(!ranked.some((p) => p.id === "me"));
  });

  it("never returns private fields", () => {
    const ranked = rankPeople([{ ...person("1", "Aline", "aline"), email: "x@y.z", phone: "1" } as PersonHit], "aline", "me");
    assert.deepEqual(Object.keys(ranked[0]!).sort(), ["avatar_url", "bio", "full_name", "id", "is_verified", "username"]);
  });
});

describe("messaging: unified inbox helpers", () => {
  it("routes community DMs and platform-wide DMs to the right API", () => {
    assert.equal(inboxApiBase("kigali-creators", "c1"), "/api/communities/kigali-creators/inbox/c1/messages");
    assert.equal(inboxApiBase(null, "c1"), "/api/messages/direct/c1/messages");
    assert.equal(inboxApiBase("", "c1"), "/api/messages/direct/c1/messages");
  });

  it("round-trips marketplace thread ids and read keys", () => {
    assert.equal(parseMarketplaceThreadId(marketplaceThreadId("abc")), "abc");
    assert.equal(parseMarketplaceThreadId("room:abc"), null);
    assert.equal(marketplaceReadKey("abc"), "market:abc");
  });

  it("merges realtime echoes without duplicates, oldest first", () => {
    const a = { id: "1", created_at: "2026-11-06T10:00:00Z" };
    const b = { id: "2", created_at: "2026-11-06T10:01:00Z" };
    assert.deepEqual(mergeTimeline([b, a], [a, b]).map((m) => m.id), ["1", "2"]);
  });

  it("computes unread from the other side's newest message and my read cursor", () => {
    const last = { sender_id: "them", created_at: "2026-11-06T10:00:00Z" };
    assert.equal(isMarketplaceUnread(last, "me", null), true);
    assert.equal(isMarketplaceUnread(last, "me", "2026-11-06T10:05:00Z"), false);
    assert.equal(isMarketplaceUnread({ ...last, sender_id: "me" }, "me", null), false);
    assert.equal(previewMarketplaceMessage("", "quote_request"), "Quote request");
  });
});

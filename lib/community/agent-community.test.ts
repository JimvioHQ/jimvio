import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureOwnedCommunityChannels,
  mergeCommunitySettings,
  slugifyChannelName,
  updateOwnedCommunityDetails,
} from "./agent-community.ts";

const owned = {
  id: "community-1",
  slug: "north",
  name: "North",
  archived_at: null,
  settings: { accent: "orange" },
  long_description: "Already written",
};

function fakeClient(community: Record<string, unknown> | null, rooms: Array<{ id: string; slug: string }> = []) {
  const eqs: Array<{ table: string; column: string; value: unknown }> = [];
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const db = {
    from(table: string) {
      const api = {
        select() {
          return api;
        },
        insert(payload: Record<string, unknown>) {
          inserts.push({ table, payload });
          return api;
        },
        update(payload: Record<string, unknown>) {
          updates.push({ table, payload });
          return api;
        },
        eq(column: string, value: unknown) {
          eqs.push({ table, column, value });
          return api;
        },
        order() {
          return api;
        },
        limit() {
          return api;
        },
        maybeSingle: async () => ({ data: table === "communities" ? community : null, error: null }),
        single: async () => ({ data: { id: "room-new" }, error: null }),
        then(onFulfilled: (value: { data: unknown; error: null }) => unknown) {
          const data = table === "spaces" ? [{ id: "space-1" }] : table === "rooms" ? rooms : null;
          return Promise.resolve({ data, error: null }).then(onFulfilled);
        },
      };
      return api;
    },
  };
  return { db: db as unknown as SupabaseClient, eqs, inserts, updates };
}

describe("owned community actions", () => {
  it("merges rules without dropping existing settings", () => {
    assert.deepEqual(mergeCommunitySettings({ accent: "orange", rules: "Old" }, "Be kind"), {
      accent: "orange",
      rules: "Be kind",
    });
    assert.equal(slugifyChannelName("Announcements"), "announcements");
  });

  it("updates only a community owned by the signed-in user", async () => {
    const ownedDb = fakeClient(owned);
    const updated = await updateOwnedCommunityDetails(ownedDb.db, "user-1", "community-1", {
      rules: "Be kind",
      category: "Education",
    });
    assert.equal(updated.ok, true);
    assert.equal(ownedDb.eqs.some((item) => item.column === "owner_id" && item.value === "user-1"), true);
    const settings = ownedDb.updates.find((item) => item.table === "communities")?.payload.settings as {
      accent?: string;
      rules?: string;
    };
    assert.equal(settings.accent, "orange");
    assert.equal(settings.rules, "Be kind");
    assert.equal("long_description" in (ownedDb.updates[0]?.payload ?? {}), false);

    const foreign = fakeClient(null);
    const refused = await updateOwnedCommunityDetails(foreign.db, "user-1", "community-2", { rules: "Be kind" });
    assert.equal(refused.ok, false);
    if (!refused.ok) assert.equal(refused.status, 403);
    assert.equal(foreign.updates.length, 0);
  });

  it("adds missing channels idempotently and refuses an unowned community", async () => {
    const db = fakeClient(owned, [{ id: "room-1", slug: "discussion" }]);
    const added = await ensureOwnedCommunityChannels(db.db, db.db, "user-1", "community-1", [
      "Introductions",
      "Announcements",
      "Discussion",
      "Extra",
    ]);
    assert.equal(added.ok, true);
    if (added.ok) assert.deepEqual(added.channels, ["Introductions", "Announcements", "Discussion"]);
    assert.deepEqual(
      db.inserts.map((item) => item.payload.slug),
      ["introductions", "announcements"],
    );
    assert.equal(db.eqs.some((item) => item.column === "owner_id" && item.value === "user-1"), true);

    const foreign = fakeClient(null);
    const refused = await ensureOwnedCommunityChannels(foreign.db, foreign.db, "user-1", "community-2", ["Introductions"]);
    assert.equal(refused.ok, false);
    assert.equal(foreign.inserts.length, 0);
  });
});

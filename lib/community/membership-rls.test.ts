import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = [
  "supabase/migrations/20261006070207_fix_community_memberships_peer_select_recursion.sql",
  "supabase/migrations/20261006070217_grant_private_schema_usage_for_member_helper.sql",
]
  .map((file) => readFileSync(join(root, file), "utf8"))
  .join("\n");

describe("community_memberships peer SELECT is non-recursive", () => {
  it("uses a SECURITY DEFINER helper instead of self-selecting the table", () => {
    assert.match(migration, /SECURITY DEFINER/);
    assert.match(migration, /SET search_path = ''/);
    assert.match(migration, /private\.is_active_community_member/);
    assert.match(migration, /CREATE POLICY memberships_select_active_peers/);
    const policyBlock = migration.slice(
      migration.indexOf("CREATE POLICY memberships_select_active_peers")
    );
    assert.doesNotMatch(
      policyBlock,
      /FROM\s+public\.community_memberships/i
    );
    assert.doesNotMatch(policyBlock, /FROM\s+community_memberships\s+me/i);
  });

  it("does not grant the helper to anon", () => {
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION private\.is_active_community_member\(uuid, uuid\) FROM anon/
    );
  });
});

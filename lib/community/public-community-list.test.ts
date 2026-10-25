import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { toPublicCommunityListItem } from "./public-community-list.ts";

describe("public community list", () => {
  it("keeps directory fields and drops owner identifiers", () => {
    const item = toPublicCommunityListItem(
      {
        id: "c1",
        name: "Design",
        slug: "design",
        owner_id: "user-secret",
        archived_by: "moderator-secret",
        settings: { invite_code: "secret-code", jimvio: { targetMemberCount: 10 } },
        platform_commission_rate: 12,
        member_count: 4,
        post_count: 9,
        is_private: false,
        visibility: "public",
        profiles: { full_name: "Ada", avatar_url: null, username: "ada", email: "ada@example.com", id: "user-secret" },
      },
      { isMember: true, isOwner: false },
    );
    assert.equal(item.name, "Design");
    assert.equal(item.member_count, 4);
    assert.equal(item.is_member, true);
    assert.equal(item.is_owner, false);
    assert.equal(item.profiles && (item.profiles as { full_name: string }).full_name, "Ada");
    const encoded = JSON.stringify(item);
    assert.equal(encoded.includes("user-secret"), false);
    assert.equal(encoded.includes("moderator-secret"), false);
    assert.equal(encoded.includes("secret-code"), false);
    assert.equal(encoded.includes("ada@example.com"), false);
    assert.equal(encoded.includes("platform_commission_rate"), false);
    assert.equal("owner_id" in item, false);
    assert.equal("settings" in item, false);
  });

  it("maps public community API responses through the allowlist", () => {
    const root = join(process.cwd(), "app/api/communities");
    const list = readFileSync(join(root, "route.ts"), "utf8");
    const detail = readFileSync(join(root, "[slug]/route.ts"), "utf8");
    assert.match(list, /toPublicCommunityListItem/);
    assert.match(detail, /toPublicCommunityListItem/);
    assert.equal(detail.includes("community: data"), false);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

/**
 * Regression: hub feed engagement gates must stay aligned.
 * Likes/share/views already use canEngageWithCommunityPost; comments must too
 * so public-community feed posts are not likeable-but-uncommentable due to
 * inactive Space metadata.
 */
describe("hub engagement access alignment", () => {
  it("comments route uses canEngageWithCommunityPost for write access", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/posts/[postId]/comments/route.ts"),
      "utf8",
    );
    assert.match(src, /canEngageWithCommunityPost/);
    assert.doesNotMatch(
      src,
      /const hasAccess = await canEngageWithRoom\(user\.id, post\.room_id\)/,
    );
  });

  it("share route checks membership before mutating share_count for community/repost", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/posts/[postId]/share/route.ts"),
      "utf8",
    );
    const membershipIdx = src.indexOf("You must be a member of that community");
    const ledgerIdx = src.indexOf('from("community_post_shares")');
    const bumpIdx = src.indexOf("share_count: next");
    assert.ok(membershipIdx > 0);
    assert.ok(ledgerIdx > 0);
    assert.ok(membershipIdx < ledgerIdx, "membership denial must precede share ledger insert");
    assert.ok(membershipIdx < bumpIdx, "membership denial must precede share_count bump");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { canEndListedLive, communityVisibilityPatch, requireAdminReason } from "./portal-policy.ts";

describe("admin portal policy", () => {
  it("requires a meaningful reason and a known community visibility", () => {
    assert.equal(requireAdminReason("short").ok, false);
    assert.equal(requireAdminReason("Archive for policy abuse").ok, true);
    assert.equal(communityVisibilityPatch("invite_only").ok, true);
    assert.equal(communityVisibilityPatch("secret").ok, false);
    assert.equal(canEndListedLive("live"), true);
    assert.equal(canEndListedLive("ended"), false);
  });

  it("keeps new admin actions behind platform admin checks and the audit writer", () => {
    const src = readFileSync(new URL("./portal-actions.ts", import.meta.url), "utf8");
    assert.match(src, /assertPlatformAdmin/);
    assert.match(src, /writeAuditEvent/);
    assert.doesNotMatch(src, /payout_account/);
    assert.doesNotMatch(src, /stream_key/);
    assert.match(src, /community_posts/);
    assert.doesNotMatch(src, /status:\s*"paid"/);
  });
});

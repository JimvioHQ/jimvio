import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCommunityWorkspaceSubroute, isHubAuthRequired } from "./hub-auth";
import { communityIsPubliclyDiscoverable } from "./join-policy";

describe("public course routes", () => {
  it("allows guests to browse the global public course catalog", () => {
    assert.equal(isHubAuthRequired("/communities/courses"), false);
  });

  it("allows guests to view public course details without the member workspace shell", () => {
    const path = "/communities/academy/courses/course-123";
    assert.equal(isHubAuthRequired(path), false);
    assert.equal(isCommunityWorkspaceSubroute(path), false);
  });

  it("keeps course learning behind sign-in and inside the workspace", () => {
    const path = "/communities/academy/courses/course-123/learn";
    assert.equal(isHubAuthRequired(path), true);
    assert.equal(isCommunityWorkspaceSubroute(path), true);
  });

  it("keeps the community-specific course management/list area protected", () => {
    assert.equal(isHubAuthRequired("/communities/academy/courses"), true);
  });

  it("does not expose courses from private, invite-only, hidden, or archived communities", () => {
    assert.equal(communityIsPubliclyDiscoverable({ is_private: true }), false);
    assert.equal(communityIsPubliclyDiscoverable({ visibility_mode: "invite_only" }), false);
    assert.equal(communityIsPubliclyDiscoverable({ visibility: "hidden" }), false);
    assert.equal(communityIsPubliclyDiscoverable({ is_active: false }), false);
    assert.equal(communityIsPubliclyDiscoverable({ visibility: "public", is_active: true }), true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCommunityWorkspaceSubroute, isHubAuthRequired } from "./hub-auth";

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
});

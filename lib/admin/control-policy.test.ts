import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  adminPageBounds,
  adminSearchTerm,
  applyCommentOperation,
  applyCommunityOperation,
  applyPostOperation,
  canRemovePlatformAdmin,
  commentIsPubliclyVisible,
  communityIsOperational,
  communityPermanentDeleteAllowed,
  describeCommunityState,
  postIsPubliclyVisible,
  requireDestructiveConfirm,
  ugcLifecycleDecision,
  ugcLifecyclePatch,
} from "./control-policy.ts";

const now = "2026-10-15T12:00:00.000Z";

describe("platform admin control policy", () => {
  it("keeps disable, archive, and restore independent", () => {
    const active = { is_active: true, archived_at: null };
    const disabled = applyCommunityOperation(active, "disable", now, "admin");
    assert.equal(disabled.ok && disabled.patch.is_active, false);
    assert.equal(disabled.ok && disabled.patch.archived_at, undefined);
    assert.equal(communityIsOperational({ is_active: false, archived_at: null }), false);
    assert.equal(describeCommunityState({ is_active: false, archived_at: null }), "Disabled");

    const archived = applyCommunityOperation(active, "archive", now, "admin");
    assert.equal(archived.ok && archived.patch.archived_at, now);
    assert.equal(archived.ok && "is_active" in archived.patch, false);
    assert.equal(communityIsOperational({ is_active: true, archived_at: now }), false);

    const restored = applyCommunityOperation({ is_active: false, archived_at: now }, "restore", now, "admin");
    assert.equal(restored.ok && restored.patch.archived_at, null);
    assert.equal(restored.ok && restored.patch.is_active, undefined);
    assert.equal(describeCommunityState({ is_active: false, archived_at: null }), "Disabled");
    assert.equal(communityPermanentDeleteAllowed({ memberCount: 2, postCount: 1 }).ok, false);
  });

  it("hides, archives, restores, and soft-deletes posts without cascading", () => {
    const published = { is_published: true, archived_at: null, hidden_at: null, deleted_at: null, comments_disabled: false };
    const hidden = applyPostOperation(published, "hide", now);
    assert.equal(hidden.ok && hidden.patch.is_published, false);
    assert.equal(hidden.ok && hidden.patch.hidden_at, now);
    assert.equal(postIsPubliclyVisible({ ...published, ...hidden.patch }), false);

    const archived = applyPostOperation(published, "archive", now);
    assert.equal(archived.ok && Boolean(archived.patch.archived_at), true);
    const restored = applyPostOperation({ ...published, hidden_at: now, archived_at: now, is_published: false }, "restore", now);
    assert.equal(restored.ok && restored.patch.archived_at, null);
    assert.equal(restored.ok && restored.patch.is_published, false);

    assert.equal(requireDestructiveConfirm("delete").ok, false);
    const removed = applyPostOperation(published, "soft_delete", now);
    assert.equal(removed.ok && Boolean(removed.patch.deleted_at), true);
    assert.equal(applyPostOperation({ ...published, deleted_at: now }, "hide", now).ok, false);
    assert.equal(applyPostOperation(published, "disable_comments", now).ok && true, true);
  });

  it("hides and soft-deletes comments and requires a delete confirmation", () => {
    const visible = { is_published: true, deleted_at: null };
    const hidden = applyCommentOperation(visible, "hide", now);
    assert.equal(hidden.ok && hidden.patch.is_published, false);
    assert.equal(commentIsPubliclyVisible({ is_published: false, deleted_at: null }), false);
    const deleted = applyCommentOperation(visible, "soft_delete", now);
    assert.equal(deleted.ok && Boolean(deleted.patch.deleted_at), true);
    assert.equal(applyCommentOperation({ is_published: false, deleted_at: now }, "unhide", now).ok, false);
  });

  it("refuses unfunded resume and never patches funding fields", () => {
    const resume = ugcLifecycleDecision({ action: "resume", status: "paused", escrowHeld: false, adminActivated: false });
    assert.equal(resume.ok, false);
    const funded = ugcLifecycleDecision({ action: "resume", status: "paused", escrowHeld: true, adminActivated: false });
    assert.equal(funded.ok && funded.status, "active");
    assert.equal(funded.ok && funded.touchesFunding, false);
    const patch = ugcLifecyclePatch("paused", now);
    assert.deepEqual(Object.keys(patch).sort(), ["status", "updated_at"]);
    assert.equal(ugcLifecycleDecision({ action: "pause", status: "draft", escrowHeld: false, adminActivated: false }).ok, false);
    assert.equal(ugcLifecycleDecision({ action: "complete", status: "cancelled", escrowHeld: true, adminActivated: true }).ok, false);
    assert.equal(ugcLifecycleDecision({ action: "cancel", status: "active", escrowHeld: true, adminActivated: false }).ok, true);
  });

  it("protects the last platform admin and keeps pages stable", () => {
    assert.equal(canRemovePlatformAdmin({ actorId: "a", targetId: "a", targetIsPlatformAdmin: true, activePlatformAdminCount: 2 }).ok, false);
    assert.equal(canRemovePlatformAdmin({ actorId: "a", targetId: "b", targetIsPlatformAdmin: true, activePlatformAdminCount: 1 }).ok, false);
    assert.equal(canRemovePlatformAdmin({ actorId: "a", targetId: "b", targetIsPlatformAdmin: true, activePlatformAdminCount: 2 }).ok, true);
    assert.deepEqual(adminPageBounds(2, 30), { page: 2, from: 30, to: 59 });
    assert.equal(adminSearchTerm("bad%_name").text, "badname");
    const users = readFileSync(new URL("../actions/admin-users.ts", import.meta.url), "utf8");
    assert.match(users, /Platform admin accounts cannot be suspended/);
    assert.match(users, /Platform admin accounts cannot be deleted/);
    const lifecycle = readFileSync(new URL("../../app/api/admin/ugc/campaigns/[id]/lifecycle/route.ts", import.meta.url), "utf8");
    assert.match(lifecycle, /requirePlatformAdmin/);
    assert.match(lifecycle, /funding_changed: false/);
    assert.doesNotMatch(lifecycle, /from\("ugc_campaign_escrow"\)\s*\.update/);
    assert.doesNotMatch(lifecycle, /from\("ugc_payouts"\)/);
  });
});

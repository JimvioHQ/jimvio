import assert from "node:assert/strict";
import test from "node:test";
import { discussionComposerGate } from "./discussion-composer";
import { resolveChannelPostingAccess } from "./channel-posting";

const discussionRoom = {
  channel_kind: "discussion",
  slug: "discussion",
  room_type: "chat",
};

test("members can post in discussion channels stored with an empty permission config", () => {
  const access = resolveChannelPostingAccess({
    roleInput: {
      userId: "member-1",
      ownerId: "owner-1",
      membership: { role: "member", status: "active", plan_type: "free" },
    },
    permission_config: {},
    behavior_config: {},
    room: discussionRoom,
  });
  assert.equal(access.canPublish, true);
  assert.equal(
    discussionComposerGate({
      userId: "member-1",
      membershipStatus: "active",
      canPublish: access.canPublish,
      isFree: true,
      memberDiscussion: true,
    }).kind,
    "compose"
  );
});

test("announcement channels stay closed for regular members", () => {
  const access = resolveChannelPostingAccess({
    roleInput: {
      userId: "member-1",
      ownerId: "owner-1",
      membership: { role: "member", status: "active", plan_type: "free" },
    },
    permission_config: { postingMode: "admins_moderators" },
    room: { channel_kind: "announcement", slug: "announcements", room_type: "posts" },
  });
  assert.equal(access.canPublish, false);
  const gate = discussionComposerGate({
    userId: "member-1",
    membershipStatus: "active",
    canPublish: access.canPublish,
    isFree: true,
    memberDiscussion: false,
  });
  assert.equal(gate.kind, "restricted");
});

test("moderators keep posting in staff-only channels", () => {
  const access = resolveChannelPostingAccess({
    roleInput: {
      userId: "mod-1",
      ownerId: "owner-1",
      membership: { role: "moderator", status: "active", plan_type: null },
    },
    permission_config: { postingMode: "admins_moderators" },
    room: { channel_kind: "announcement", slug: "announcements", room_type: "posts" },
  });
  assert.equal(access.canPublish, true);
});

test("an explicit admins-only discussion policy is not reopened", () => {
  const access = resolveChannelPostingAccess({
    roleInput: {
      userId: "member-1",
      ownerId: "owner-1",
      membership: { role: "member", status: "active", plan_type: "free" },
    },
    permission_config: { postingMode: "admins_only" },
    room: discussionRoom,
  });
  assert.equal(access.canPublish, false);
});

test("signed-in non-members of a free discussion are asked to join", () => {
  const gate = discussionComposerGate({
    userId: "viewer-1",
    membershipStatus: null,
    canPublish: false,
    isFree: true,
    memberDiscussion: true,
  });
  assert.equal(gate.kind, "join");
});

test("signed-in non-members of a paid discussion are sent to plans", () => {
  const gate = discussionComposerGate({
    userId: "viewer-1",
    membershipStatus: null,
    canPublish: false,
    isFree: false,
    memberDiscussion: true,
  });
  assert.equal(gate.kind, "subscribe");
});

test("guests cannot post", () => {
  const access = resolveChannelPostingAccess({
    roleInput: { userId: null, ownerId: "owner-1", membership: null },
    permission_config: {},
    room: discussionRoom,
  });
  assert.equal(access.canPublish, false);
  assert.equal(
    discussionComposerGate({
      userId: null,
      canPublish: false,
      isFree: true,
      memberDiscussion: true,
    }).kind,
    "sign-in"
  );
});

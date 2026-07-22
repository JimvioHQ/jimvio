/**
 * Reusable permission engine for Community Workspace (Phase 1).
 * Delegates space/room access to existing helpers — never fork auth logic.
 */

import {
  canAccessRoomNav,
  canAccessSpace,
  type MembershipLite,
} from "@/lib/community-workspace-access";
import type {
  ChannelVisibility,
  WorkspacePermissions,
  WorkspaceRole,
} from "./types";

export type PermissionCapability =
  | "channel.read"
  | "channel.write"
  | "channel.manage"
  | "group.manage"
  | "members.view"
  | "members.invite"
  | "pins.manage"
  | "files.upload"
  | "settings.manage";

const ROLE_CAPABILITIES: Record<WorkspaceRole, ReadonlySet<PermissionCapability>> = {
  owner: new Set([
    "channel.read",
    "channel.write",
    "channel.manage",
    "group.manage",
    "members.view",
    "members.invite",
    "pins.manage",
    "files.upload",
    "settings.manage",
  ]),
  admin: new Set([
    "channel.read",
    "channel.write",
    "channel.manage",
    "group.manage",
    "members.view",
    "members.invite",
    "pins.manage",
    "files.upload",
    "settings.manage",
  ]),
  moderator: new Set([
    "channel.read",
    "channel.write",
    "members.view",
    "members.invite",
    "pins.manage",
    "files.upload",
  ]),
  creator: new Set([
    "channel.read",
    "channel.write",
    "members.view",
    "files.upload",
    "pins.manage",
  ]),
  verified: new Set([
    "channel.read",
    "channel.write",
    "members.view",
    "files.upload",
  ]),
  member: new Set(["channel.read", "channel.write", "members.view", "files.upload"]),
  guest: new Set(["channel.read"]),
};

export type ResolveRoleInput = {
  userId: string | null | undefined;
  ownerId: string | null | undefined;
  membership: MembershipLite | null;
  /** Optional profile flags for creator / verified tiers */
  isCreator?: boolean;
  isVerified?: boolean;
};

export function resolveWorkspaceRole(input: ResolveRoleInput): WorkspaceRole {
  const { userId, ownerId, membership, isCreator, isVerified } = input;
  if (!userId) return "guest";
  if (ownerId && userId === ownerId) return "owner";

  const role = membership?.role?.toLowerCase();
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "moderator") return "moderator";

  if (!membership || membership.status !== "active") return "guest";
  if (isCreator) return "creator";
  if (isVerified) return "verified";
  return "member";
}

export function hasCapability(
  role: WorkspaceRole,
  capability: PermissionCapability
): boolean {
  return ROLE_CAPABILITIES[role].has(capability);
}

export function buildPermissions(role: WorkspaceRole): WorkspacePermissions {
  return {
    canRead: hasCapability(role, "channel.read"),
    canWrite: hasCapability(role, "channel.write"),
    canManage: hasCapability(role, "channel.manage"),
    canInvite: hasCapability(role, "members.invite"),
    canModerate:
      hasCapability(role, "channel.manage") || hasCapability(role, "pins.manage"),
    canPin: hasCapability(role, "pins.manage"),
    canUpload: hasCapability(role, "files.upload"),
  };
}

export function visibilityFromAccess(
  accessType: string,
  isLocked: boolean
): ChannelVisibility {
  const t = accessType === "inherit" ? (isLocked ? "members" : "public") : accessType;
  if (t === "premium") return "premium";
  if (t === "private") return "private";
  if (t === "paid" || isLocked) return "members";
  return "public";
}

export function canEnterChannel(args: {
  room: { is_locked: boolean; access_type: string };
  spaceAccessType: string;
  membership: MembershipLite | null;
  ownerId: string | undefined;
  userId: string | undefined;
  spaceId: string;
}): boolean {
  return canAccessRoomNav(
    args.room,
    args.spaceAccessType,
    args.membership,
    args.ownerId,
    args.userId,
    args.spaceId
  );
}

export function canEnterGroup(args: {
  spaceAccessType: string;
  membership: MembershipLite | null;
  ownerId: string | undefined;
  userId: string | undefined;
  spaceId: string;
}): boolean {
  return canAccessSpace(
    args.spaceAccessType,
    args.membership,
    args.ownerId,
    args.userId,
    args.spaceId
  );
}

export {
  canAccessRoomNav,
  canAccessSpace,
  type MembershipLite,
};

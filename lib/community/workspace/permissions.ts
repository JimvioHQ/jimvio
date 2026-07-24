/**
 * Reusable permission engine for Community Workspace.
 * All authorization must resolve through capabilities — never role-name checks in features.
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

/**
 * Canonical capability keys used by the engine.
 * Display aliases (e.g. groups.manage) map onto these via CAPABILITY_ALIASES.
 */
export type PermissionCapability =
  | "channel.read"
  | "channel.write"
  | "channel.manage"
  | "channel.create"
  | "channel.delete"
  | "group.manage"
  | "group.create"
  | "group.delete"
  | "members.view"
  | "members.invite"
  | "members.manage"
  | "members.ban"
  | "members.remove"
  | "members.role"
  | "roles.view"
  | "roles.manage"
  | "pins.manage"
  | "files.upload"
  | "content.manage"
  | "moderation.view"
  | "moderation.manage"
  | "moderation.warn"
  | "moderation.mute"
  | "moderation.suspend"
  | "moderation.ban"
  | "moderation.delete"
  | "settings.view"
  | "settings.manage"
  | "community.view"
  | "community.edit"
  | "knowledge.manage"
  | "commerce.manage"
  | "live.manage"
  | "events.manage"
  | "analytics.view"
  | "analytics.export"
  | "analytics.manage"
  | "intelligence.view"
  | "security.manage"
  | "integrations.manage"
  | "audit.view"
  | "automations.manage";

/** All registered capabilities (single source of truth for catalogs). */
export const ALL_CAPABILITIES = [
  "community.view",
  "community.edit",
  "group.create",
  "group.manage",
  "group.delete",
  "channel.create",
  "channel.read",
  "channel.write",
  "channel.manage",
  "channel.delete",
  "members.view",
  "members.invite",
  "members.manage",
  "members.role",
  "members.ban",
  "members.remove",
  "roles.view",
  "roles.manage",
  "moderation.view",
  "moderation.manage",
  "moderation.warn",
  "moderation.mute",
  "moderation.suspend",
  "moderation.ban",
  "moderation.delete",
  "pins.manage",
  "content.manage",
  "files.upload",
  "knowledge.manage",
  "events.manage",
  "live.manage",
  "commerce.manage",
  "analytics.view",
  "analytics.export",
  "analytics.manage",
  "intelligence.view",
  "security.manage",
  "integrations.manage",
  "automations.manage",
  "settings.view",
  "settings.manage",
  "audit.view",
] as const satisfies readonly PermissionCapability[];

/**
 * Product-facing aliases → engine keys (never invent parallel auth).
 * e.g. UI may show "groups.manage" while engine stores "group.manage".
 */
export const CAPABILITY_ALIASES: Record<string, PermissionCapability> = {
  "groups.create": "group.create",
  "groups.manage": "group.manage",
  "groups.delete": "group.delete",
  "channels.create": "channel.create",
  "channels.manage": "channel.manage",
  "channels.delete": "channel.delete",
  "channels.read": "channel.read",
  "channels.write": "channel.write",
};

export function normalizeCapability(
  raw: string
): PermissionCapability | null {
  const key = raw.trim().toLowerCase();
  if (CAPABILITY_ALIASES[key]) return CAPABILITY_ALIASES[key];
  if ((ALL_CAPABILITIES as readonly string[]).includes(key)) {
    return key as PermissionCapability;
  }
  return null;
}

const ROLE_CAPABILITIES: Record<WorkspaceRole, ReadonlySet<PermissionCapability>> = {
  owner: new Set(ALL_CAPABILITIES),
  admin: new Set([
    "community.view",
    "community.edit",
    "group.create",
    "group.manage",
    "group.delete",
    "channel.create",
    "channel.read",
    "channel.write",
    "channel.manage",
    "channel.delete",
    "members.view",
    "members.invite",
    "members.manage",
    "members.ban",
    "members.remove",
    "members.role",
    "roles.view",
    "roles.manage",
    "moderation.view",
    "moderation.manage",
    "moderation.warn",
    "moderation.mute",
    "moderation.suspend",
    "moderation.ban",
    "moderation.delete",
    "pins.manage",
    "content.manage",
    "files.upload",
    "knowledge.manage",
    "events.manage",
    "live.manage",
    "commerce.manage",
    "analytics.view",
    "analytics.export",
    "analytics.manage",
    "intelligence.view",
    "security.manage",
    "integrations.manage",
    "automations.manage",
    "settings.view",
    "settings.manage",
    "audit.view",
  ]),
  moderator: new Set([
    "community.view",
    "channel.read",
    "channel.write",
    "members.view",
    "members.invite",
    "members.manage",
    "members.ban",
    "roles.view",
    "moderation.view",
    "moderation.manage",
    "moderation.warn",
    "moderation.mute",
    "moderation.suspend",
    "moderation.ban",
    "moderation.delete",
    "pins.manage",
    "content.manage",
    "files.upload",
    "knowledge.manage",
    "events.manage",
    "commerce.manage",
    "live.manage",
    "intelligence.view",
    "analytics.view",
    "analytics.export",
  ]),
  creator: new Set([
    "community.view",
    "channel.read",
    "channel.write",
    "members.view",
    "files.upload",
    "pins.manage",
    "content.manage",
    "knowledge.manage",
    "commerce.manage",
    "live.manage",
    "events.manage",
    "intelligence.view",
    "analytics.view",
  ]),
  mentor: new Set([
    "community.view",
    "channel.read",
    "channel.write",
    "members.view",
    "files.upload",
    "pins.manage",
    "knowledge.manage",
    "intelligence.view",
  ]),
  verified: new Set([
    "community.view",
    "channel.read",
    "channel.write",
    "members.view",
    "files.upload",
    "intelligence.view",
  ]),
  vip: new Set([
    "community.view",
    "channel.read",
    "channel.write",
    "members.view",
    "files.upload",
    "intelligence.view",
  ]),
  member: new Set([
    "community.view",
    "channel.read",
    "channel.write",
    "members.view",
    "files.upload",
    "intelligence.view",
  ]),
  guest: new Set(["community.view", "channel.read"]),
};

export function capabilitiesForRole(
  role: WorkspaceRole
): ReadonlySet<PermissionCapability> {
  return ROLE_CAPABILITIES[role];
}

/**
 * Merge system role capabilities with optional custom-role grants.
 * Custom roles may only *add* capabilities on top of their inheritance base
 * (never silently strip protected owner privileges).
 */
export function resolveEffectiveCapabilities(args: {
  role: WorkspaceRole;
  customCapabilities?: readonly string[] | null;
}): Set<PermissionCapability> {
  const base = new Set(ROLE_CAPABILITIES[args.role]);
  for (const raw of args.customCapabilities ?? []) {
    const cap = normalizeCapability(raw);
    if (cap) base.add(cap);
  }
  return base;
}

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
  if (role === "mentor") return "mentor";
  if (role === "vip") return "vip";
  if (role === "creator") return "creator";
  if (role === "verified") return "verified";

  if (!membership || membership.status !== "active") return "guest";
  if (isCreator) return "creator";
  if (isVerified) return "verified";
  return "member";
}

export function hasCapability(
  role: WorkspaceRole,
  capability: PermissionCapability | string,
  customCapabilities?: readonly string[] | null
): boolean {
  const cap =
    typeof capability === "string"
      ? normalizeCapability(capability)
      : capability;
  if (!cap) return false;
  if (customCapabilities && customCapabilities.length > 0) {
    return resolveEffectiveCapabilities({ role, customCapabilities }).has(cap);
  }
  return ROLE_CAPABILITIES[role].has(cap);
}

export function buildPermissions(role: WorkspaceRole): WorkspacePermissions {
  return {
    canRead: hasCapability(role, "channel.read"),
    canWrite: hasCapability(role, "channel.write"),
    canManage: hasCapability(role, "channel.manage"),
    canInvite: hasCapability(role, "members.invite"),
    canModerate:
      hasCapability(role, "channel.manage") ||
      hasCapability(role, "pins.manage") ||
      hasCapability(role, "moderation.manage"),
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

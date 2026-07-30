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
  /** Product term Space — aliased to group.* / channel.* for checks. */
  | "space.create"
  | "space.manage"
  | "space.delete"
  | "space.read"
  | "space.write"
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
  "space.create",
  "space.manage",
  "space.delete",
  "space.read",
  "space.write",
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
 * Space.* aliases onto group.* / channel.* so both product and legacy grants work.
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
  "spaces.create": "group.create",
  "spaces.manage": "group.manage",
  "spaces.delete": "group.delete",
  "spaces.read": "channel.read",
  "spaces.write": "channel.write",
  "space.create": "group.create",
  "space.manage": "group.manage",
  "space.delete": "group.delete",
  "space.read": "channel.read",
  "space.write": "channel.write",
};

/**
 * Extra satisfaction edges beyond 1:1 aliases.
 * Having space.* in a grant set satisfies the legacy group.* / channel.* check
 * (and the reverse for typed space.* still present in ALL_CAPABILITIES).
 */
const CAPABILITY_EQUIVALENTS: Partial<
  Record<PermissionCapability, readonly PermissionCapability[]>
> = {
  "group.manage": ["space.manage"],
  "channel.manage": ["space.manage"],
  "space.manage": ["group.manage", "channel.manage"],
  "group.create": ["space.create"],
  "channel.create": ["space.create"],
  "space.create": ["group.create", "channel.create"],
  "group.delete": ["space.delete"],
  "channel.delete": ["space.delete"],
  "space.delete": ["group.delete", "channel.delete"],
  "channel.read": ["space.read"],
  "space.read": ["channel.read"],
  "channel.write": ["space.write"],
  "space.write": ["channel.write"],
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
  // Community owner retains owner role even if membership row is missing/stale.
  if (ownerId && userId === ownerId) return "owner";

  // Cancelled / banned / expired memberships must not keep staff capabilities.
  if (!membership || membership.status !== "active") return "guest";

  const role = membership.role?.toLowerCase();
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "moderator") return "moderator";
  if (role === "mentor") return "mentor";
  if (role === "vip") return "vip";
  if (role === "creator") return "creator";
  if (role === "verified") return "verified";

  if (isCreator) return "creator";
  if (isVerified) return "verified";
  return "member";
}

function capabilitySetHas(
  set: ReadonlySet<PermissionCapability>,
  cap: PermissionCapability
): boolean {
  if (set.has(cap)) return true;
  for (const equiv of CAPABILITY_EQUIVALENTS[cap] ?? []) {
    if (set.has(equiv)) return true;
  }
  return false;
}

export function hasCapability(
  role: WorkspaceRole,
  capability: PermissionCapability | string,
  customCapabilities?: readonly string[] | null
): boolean {
  const raw =
    typeof capability === "string"
      ? capability.trim().toLowerCase()
      : capability;

  // space.manage is satisfied by group.manage OR channel.manage (product alias).
  if (raw === "space.manage" || raw === "spaces.manage") {
    const set =
      customCapabilities && customCapabilities.length > 0
        ? resolveEffectiveCapabilities({ role, customCapabilities })
        : ROLE_CAPABILITIES[role];
    return (
      capabilitySetHas(set, "group.manage") ||
      capabilitySetHas(set, "channel.manage") ||
      set.has("space.manage")
    );
  }

  const cap =
    typeof capability === "string"
      ? normalizeCapability(capability)
      : CAPABILITY_ALIASES[capability] ?? capability;
  if (!cap) return false;
  const set =
    customCapabilities && customCapabilities.length > 0
      ? resolveEffectiveCapabilities({ role, customCapabilities })
      : ROLE_CAPABILITIES[role];
  return capabilitySetHas(set, cap);
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

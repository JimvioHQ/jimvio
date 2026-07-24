/**
 * Map DB custom roles + system role projections ↔ Owner Role list items.
 */

import type { WorkspaceRole } from "@/lib/community/workspace/types";
import type { PermissionCapability } from "@/lib/community/workspace/permissions";
import {
  SYSTEM_ROLE_COLORS,
  SYSTEM_ROLE_DESCRIPTIONS,
  SYSTEM_ROLE_ICONS,
  SYSTEM_ROLE_LABELS,
  sanitizeCapabilities,
  systemRoleCapabilities,
} from "./constants";
import type {
  OwnerRoleAuditEntry,
  OwnerRoleListItem,
  OwnerRoleMember,
  RoleVisibility,
  SystemRoleKey,
} from "./types";
import { SYSTEM_ROLE_KEYS } from "./types";

export type CustomRoleRow = {
  id: string;
  community_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  priority: number | null;
  visibility: string | null;
  inherits_from: string | null;
  capabilities: unknown;
  group_ids: string[] | null;
  channel_ids: string[] | null;
  is_default_assignment: boolean | null;
  is_system: boolean | null;
  template_key: string | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const CUSTOM_ROLE_SELECT =
  "id, community_id, name, slug, description, icon, color, priority, visibility, inherits_from, capabilities, group_ids, channel_ids, is_default_assignment, is_system, template_key, archived_at, created_at, updated_at";

/** Narrow service-role rows when generated DB types lag migrations. */
export function asCustomRoleRow(row: unknown): CustomRoleRow {
  return row as CustomRoleRow;
}

function asCaps(raw: unknown): PermissionCapability[] {
  if (Array.isArray(raw)) return sanitizeCapabilities(raw.map(String));
  return [];
}

export function mapCustomRoleRow(
  row: CustomRoleRow,
  memberCount = 0
): OwnerRoleListItem {
  const inherits = (row.inherits_from ?? "member") as WorkspaceRole;
  return {
    id: row.id,
    communityId: row.community_id,
    key: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    priority: row.priority ?? 0,
    visibility: (row.visibility as RoleVisibility) || "staff",
    inheritsFrom: inherits,
    capabilities: asCaps(row.capabilities),
    groupIds: Array.isArray(row.group_ids) ? row.group_ids : [],
    channelIds: Array.isArray(row.channel_ids) ? row.channel_ids : [],
    isSystem: Boolean(row.is_system),
    isProtected: false,
    isDefaultAssignment: Boolean(row.is_default_assignment),
    memberCount,
    templateKey: row.template_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildSystemRoleItems(
  communityId: string,
  counts: Record<string, number>
): OwnerRoleListItem[] {
  return SYSTEM_ROLE_KEYS.map((key, index) => {
    const caps = systemRoleCapabilities(key);
    return {
      id: `system:${key}`,
      communityId,
      key,
      name: SYSTEM_ROLE_LABELS[key],
      description: SYSTEM_ROLE_DESCRIPTIONS[key],
      icon: SYSTEM_ROLE_ICONS[key],
      color: SYSTEM_ROLE_COLORS[key],
      priority: 1000 - index * 10,
      visibility: key === "guest" ? "hidden" : "staff",
      inheritsFrom: key,
      capabilities: caps,
      groupIds: [],
      channelIds: [],
      isSystem: true,
      isProtected: key === "owner",
      isDefaultAssignment: key === "member",
      memberCount: counts[key] ?? 0,
      templateKey: null,
      createdAt: null,
      updatedAt: null,
    };
  });
}

export function mapRoleMember(row: {
  id: string;
  user_id: string;
  subscribed_at: string | null;
  created_at: string | null;
  profiles?:
    | { full_name: string | null; username: string | null; avatar_url: string | null }
    | { full_name: string | null; username: string | null; avatar_url: string | null }[]
    | null;
}): OwnerRoleMember {
  const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    membershipId: row.id,
    userId: row.user_id,
    displayName: p?.full_name?.trim() || p?.username?.trim() || "Member",
    username: p?.username ?? null,
    avatarUrl: p?.avatar_url ?? null,
    assignedAt: row.subscribed_at ?? row.created_at,
  };
}

export function mapAuditRow(row: {
  id: string;
  action: string;
  role_id: string | null;
  role_name: string | null;
  actor_id: string;
  target_user_id: string | null;
  reason: string | null;
  created_at: string;
  actor?:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
  target?:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
}): OwnerRoleAuditEntry {
  const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
  const target = Array.isArray(row.target) ? row.target[0] : row.target;
  return {
    id: row.id,
    action: row.action,
    roleId: row.role_id,
    roleName: row.role_name,
    actorId: row.actor_id,
    actorName: actor?.full_name ?? actor?.username ?? null,
    targetUserId: row.target_user_id,
    targetName: target?.full_name ?? target?.username ?? null,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export function isSystemRoleId(id: string): id is `system:${SystemRoleKey}` {
  return id.startsWith("system:");
}

export function systemKeyFromId(id: string): SystemRoleKey | null {
  if (!isSystemRoleId(id)) return null;
  const key = id.slice("system:".length);
  return (SYSTEM_ROLE_KEYS as readonly string[]).includes(key)
    ? (key as SystemRoleKey)
    : null;
}

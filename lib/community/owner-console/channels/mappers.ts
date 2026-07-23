/**
 * Map DB room rows ↔ Owner Channel list items.
 */

import {
  accessTypeFromVisibility,
  normalizeAutomationConfig,
  normalizeBehaviorConfig,
  normalizePermissionConfig,
  parseChannelKind,
} from "./constants";
import { deriveChannelStatus } from "./auth";
import type {
  ChannelVisibilityMode,
  OwnerChannelListItem,
  OwnerChannelStaffMember,
} from "./types";
import { CHANNEL_VISIBILITY_VALUES } from "./types";

export type RoomManagementRow = {
  id: string;
  community_id: string;
  space_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  emoji?: string | null;
  color?: string | null;
  room_type: string;
  channel_kind?: string | null;
  access_type: string | null;
  visibility?: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  is_locked: boolean | null;
  is_featured?: boolean | null;
  is_pinned?: boolean | null;
  is_hidden?: boolean | null;
  welcome_message?: string | null;
  permission_config?: unknown;
  behavior_config?: unknown;
  automation_config?: unknown;
  tags?: string[] | null;
  last_activity_at?: string | null;
  archived_at?: string | null;
  message_count?: number | null;
  member_count?: number | null;
  pinned_count?: number | null;
  created_at: string | null;
  updated_at: string | null;
  spaces?:
    | { id: string; name: string; slug: string }
    | { id: string; name: string; slug: string }[]
    | null;
};

export const ROOM_SELECT = `
  id, community_id, space_id, name, slug, description, icon, emoji, color,
  room_type, channel_kind, access_type, visibility, sort_order, is_active, is_locked,
  is_featured, is_pinned, is_hidden, welcome_message,
  permission_config, behavior_config, automation_config, tags,
  last_activity_at, archived_at, message_count, member_count, pinned_count,
  created_at, updated_at,
  spaces:space_id(id, name, slug)
`.replace(/\s+/g, " ").trim();

export function asRoomRow(data: unknown): RoomManagementRow {
  return data as RoomManagementRow;
}

export function asRoomRows(data: unknown): RoomManagementRow[] {
  return (Array.isArray(data) ? data : []) as RoomManagementRow[];
}

export function parseVisibility(
  raw: string | null | undefined,
  accessType: string | null
): ChannelVisibilityMode {
  if (raw && (CHANNEL_VISIBILITY_VALUES as readonly string[]).includes(raw)) {
    return raw as ChannelVisibilityMode;
  }
  if (accessType === "free" || accessType === "public") return "public";
  if (accessType === "paid" || accessType === "private") return "private";
  if (accessType === "premium" || accessType === "invite_only") return "invite_only";
  return "members";
}

export function visibilityWriteFields(visibility: ChannelVisibilityMode) {
  return {
    visibility,
    access_type: accessTypeFromVisibility(visibility),
    is_hidden: visibility === "hidden",
  };
}

export function slugifyChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function spaceMeta(row: RoomManagementRow) {
  const s = Array.isArray(row.spaces) ? row.spaces[0] : row.spaces;
  return {
    groupId: row.space_id,
    groupName: s?.name ?? "Group",
    groupSlug: s?.slug ?? "",
  };
}

export function mapRoomToOwnerChannel(
  row: RoomManagementRow,
  staff: OwnerChannelStaffMember[] = []
): OwnerChannelListItem {
  const visibility = parseVisibility(row.visibility, row.access_type);
  const group = spaceMeta(row);
  const kind = parseChannelKind(row.channel_kind, row.room_type);
  return {
    id: row.id,
    communityId: row.community_id,
    groupId: group.groupId,
    groupName: group.groupName,
    groupSlug: group.groupSlug,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    emoji: row.emoji ?? row.icon ?? null,
    color: row.color ?? null,
    kind,
    roomType: row.room_type,
    visibility,
    memberCount: row.member_count ?? 0,
    messageCount: row.message_count ?? 0,
    pinnedCount: row.pinned_count ?? 0,
    lastActivityAt: row.last_activity_at ?? row.updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order ?? 0,
    status: deriveChannelStatus({
      is_active: row.is_active,
      is_hidden: row.is_hidden ?? false,
      is_locked: row.is_locked ?? false,
      archived_at: row.archived_at ?? null,
    }),
    isActive: row.is_active !== false,
    isFeatured: Boolean(row.is_featured),
    isPinned: Boolean(row.is_pinned),
    isHidden: Boolean(row.is_hidden) || visibility === "hidden",
    isLocked: Boolean(row.is_locked),
    tags: Array.isArray(row.tags) ? row.tags : [],
    moderators: staff,
    welcomeMessage: row.welcome_message ?? null,
    permissionConfig: normalizePermissionConfig(row.permission_config),
    behaviorConfig: normalizeBehaviorConfig(row.behavior_config),
    automationConfig: normalizeAutomationConfig(row.automation_config),
  };
}

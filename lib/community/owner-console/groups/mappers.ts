/**
 * Map DB space rows ↔ Owner Group list items.
 */

import { SYSTEM_GROUP_SLUGS } from "@/lib/community/workspace/types";
import {
  accessTypeFromPrivacy,
  normalizeDefaultContent,
  normalizePermissionConfig,
} from "./constants";
import { deriveGroupStatus, isSystemGroupSlug } from "./auth";
import type {
  GroupPrivacyMode,
  OwnerGroupListItem,
  OwnerGroupStaffMember,
} from "./types";
import { GROUP_PRIVACY_VALUES } from "./types";

export type SpaceManagementRow = {
  id: string;
  community_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  cover_url?: string | null;
  banner_url?: string | null;
  privacy?: string | null;
  access_type: string | null;
  member_count: number | null;
  room_count: number | null;
  sort_order: number | null;
  is_active: boolean | null;
  is_featured?: boolean | null;
  is_pinned?: boolean | null;
  is_hidden?: boolean | null;
  is_locked?: boolean | null;
  welcome_message?: string | null;
  rules?: string | null;
  permission_config?: unknown;
  default_content?: unknown;
  last_activity_at?: string | null;
  archived_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const SPACE_SELECT = `
  id, community_id, name, slug, description, icon, color, access_type,
  member_count, room_count, sort_order, is_active, created_at, updated_at,
  cover_url, banner_url, privacy, is_featured, is_pinned, is_hidden, is_locked,
  welcome_message, rules, permission_config, default_content,
  last_activity_at, archived_at
`.replace(/\s+/g, " ").trim();

export { SPACE_SELECT };

export function parsePrivacy(raw: string | null | undefined, accessType: string | null): GroupPrivacyMode {
  if (raw && (GROUP_PRIVACY_VALUES as readonly string[]).includes(raw)) {
    return raw as GroupPrivacyMode;
  }
  if (accessType === "paid" || accessType === "private") return "private";
  if (accessType === "premium" || accessType === "invite_only") return "invite_only";
  return "public";
}

export function mapSpaceToOwnerGroup(
  row: SpaceManagementRow,
  staff: OwnerGroupStaffMember[] = []
): OwnerGroupListItem {
  const privacy = parsePrivacy(row.privacy, row.access_type);
  return {
    id: row.id,
    communityId: row.community_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    coverUrl: row.cover_url ?? null,
    bannerUrl: row.banner_url ?? null,
    color: row.color,
    privacy,
    memberCount: row.member_count ?? 0,
    channelCount: row.room_count ?? 0,
    moderators: staff,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at ?? row.updated_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order ?? 0,
    status: deriveGroupStatus({
      is_active: row.is_active,
      is_hidden: row.is_hidden ?? false,
      is_locked: row.is_locked ?? false,
      archived_at: row.archived_at ?? null,
    }),
    isActive: row.is_active !== false,
    isFeatured: Boolean(row.is_featured),
    isPinned: Boolean(row.is_pinned),
    isHidden: Boolean(row.is_hidden) || privacy === "hidden",
    isLocked: Boolean(row.is_locked),
    isSystem: isSystemGroupSlug(row.slug) ||
      (SYSTEM_GROUP_SLUGS as readonly string[]).includes(row.slug),
    welcomeMessage: row.welcome_message ?? null,
    rules: row.rules ?? null,
    permissionConfig: normalizePermissionConfig(row.permission_config),
    defaultContent: normalizeDefaultContent(row.default_content),
  };
}

export function privacyWriteFields(privacy: GroupPrivacyMode) {
  return {
    privacy,
    access_type: accessTypeFromPrivacy(privacy),
    is_hidden: privacy === "hidden",
  };
}

export function asSpaceRow(data: unknown): SpaceManagementRow {
  return data as SpaceManagementRow;
}

export function asSpaceRows(data: unknown): SpaceManagementRow[] {
  return (Array.isArray(data) ? data : []) as SpaceManagementRow[];
}

export function slugifyGroupName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

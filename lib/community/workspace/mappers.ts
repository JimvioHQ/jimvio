/**
 * Map DB space/room rows → Workspace Space / room view models.
 * Product hierarchy: Community → Spaces (rooms remain internal units).
 */

import type {
  WorkspaceRoomRow,
  WorkspaceSpaceRow,
} from "@/components/community/workspace-context";
import {
  buildPermissions,
  resolveWorkspaceRole,
  visibilityFromAccess,
  type ResolveRoleInput,
} from "./permissions";
import { resolveChannelPostingAccess } from "./channel-posting";
import { isSpaceType, spaceTypeFromRoom, type SpaceType } from "./space-types";
import {
  ROOM_TYPE_TO_CHANNEL,
  SYSTEM_GROUP_SLUGS,
  type ChannelType,
  type GroupPrivacy,
  type WorkspaceChannel,
  type WorkspaceGroup,
  type WorkspaceSpace,
} from "./types";

function channelIconForType(type: ChannelType, name: string): string {
  if (type === "announcement" || /announcement|campaign/i.test(name)) return "📢";
  if (type === "signals" || /signal/i.test(name)) return "📈";
  if (type === "resources" || /resource/i.test(name)) return "📚";
  if (type === "knowledge" || /knowledge|wiki|guide/i.test(name)) return "🧠";
  if (type === "media" || /media|gallery|photo/i.test(name)) return "🎬";
  if (type === "voice" || /voice/i.test(name)) return "🎤";
  if (type === "live" || /live/i.test(name)) return "🔴";
  if (type === "files" || /file/i.test(name)) return "📁";
  if (type === "course") return "🎓";
  if (type === "events") return "📅";
  if (type === "qa") return "❓";
  if (/introduc/i.test(name)) return "👋";
  if (/\bwin(s)?\b/i.test(name)) return "🏆";
  if (/support|help/i.test(name)) return "🛟";
  if (/marketplace|buy|sell/i.test(name)) return "🛒";
  return "💬";
}

function resolveChannelType(room: WorkspaceRoomRow): ChannelType {
  const kind = (room.channel_kind || "").toLowerCase();
  if (kind === "announcement") return "announcement";
  if (kind === "resources") return "resources";
  if (kind === "knowledge") return "knowledge";
  if (kind === "files") return "files";
  if (kind === "media") return "media";
  if (kind === "voice") return "voice";
  if (kind === "live") return "live";
  if (kind === "events") return "events";
  if (kind === "courses") return "course";
  if (kind === "qa") return "qa";
  if (kind === "signals") return "signals";
  if (kind === "support" || kind === "marketplace" || kind === "commerce") {
    return "discussion";
  }
  if (kind === "discussion") return "discussion";

  if (/signal/i.test(room.name)) return "signals";
  if (/knowledge|wiki|guide/i.test(room.name)) return "knowledge";
  if (/media|gallery|photo/i.test(room.name)) return "media";
  if (/file/i.test(room.name) && room.room_type !== "resources") return "files";
  if (/qa|q&a|question/i.test(room.name)) return "qa";
  return ROOM_TYPE_TO_CHANNEL[room.room_type] ?? "discussion";
}

function privacyFromAccess(accessType: string): GroupPrivacy {
  const t = accessType.toLowerCase();
  if (t === "premium") return "premium";
  if (t === "private" || t === "paid") return "private";
  return "public";
}

export function isSystemGroupSlug(slug: string): boolean {
  return (SYSTEM_GROUP_SLUGS as readonly string[]).includes(slug);
}

export function mapRoomToChannel(
  room: WorkspaceRoomRow,
  roleInput: ResolveRoleInput
): WorkspaceChannel {
  const role = resolveWorkspaceRole(roleInput);
  const type = resolveChannelType(room);
  const staffRole = room.channel_staff_role ?? null;
  const posting = resolveChannelPostingAccess({
    roleInput,
    permission_config: room.permission_config,
    behavior_config: room.behavior_config,
    channelStaff: staffRole ? { staffRole } : null,
  });
  const permissions = buildPermissions(role);
  return {
    id: room.id,
    groupId: room.space_id,
    name: room.name,
    slug: room.slug,
    icon: channelIconForType(type, room.name),
    description: null,
    type,
    roomType: room.room_type,
    visibility: visibilityFromAccess(room.access_type, room.is_locked),
    permissions: {
      ...permissions,
      canWrite: permissions.canWrite && posting.canPublish,
    },
    canPublish: posting.canPublish,
    unreadCount: 0,
    memberCount: 0,
    lastActivity: null,
    pinnedCount: 0,
    isLocked: room.is_locked,
    accessType: room.access_type,
    sortOrder: room.sort_order,
  };
}

function resolveSpaceType(space: WorkspaceSpaceRow): SpaceType {
  if (space.space_type && isSpaceType(space.space_type)) {
    return space.space_type;
  }
  const primary = space.rooms[0];
  if (primary) return spaceTypeFromRoom(primary);
  return "discussion";
}

/** Preferred mapper name — Community → Spaces. */
export function mapSpaceToWorkspaceSpace(
  space: WorkspaceSpaceRow,
  roleInput: ResolveRoleInput,
  extras?: Partial<
    Pick<
      WorkspaceSpace,
      | "cover"
      | "description"
      | "color"
      | "rules"
      | "memberCount"
      | "onlineCount"
      | "createdAt"
      | "tags"
      | "featured"
      | "spaceType"
    >
  >
): WorkspaceSpace {
  const role = resolveWorkspaceRole(roleInput);
  return {
    id: space.id,
    name: space.name,
    slug: space.slug,
    icon: space.icon,
    cover: extras?.cover ?? null,
    description: extras?.description ?? null,
    color: extras?.color ?? null,
    privacy: privacyFromAccess(space.access_type),
    rules: extras?.rules ?? null,
    ownerId: roleInput.ownerId ?? null,
    adminIds: [],
    moderatorIds: [],
    memberCount: extras?.memberCount ?? 0,
    onlineCount: extras?.onlineCount ?? 0,
    createdAt: extras?.createdAt ?? null,
    tags: extras?.tags ?? [],
    featured: extras?.featured ?? false,
    permissions: buildPermissions(role),
    spaceType: extras?.spaceType ?? resolveSpaceType(space),
    channels: space.rooms.map((r) => mapRoomToChannel(r, roleInput)),
  };
}

/** @deprecated Use mapSpaceToWorkspaceSpace. */
export function mapSpaceToGroup(
  space: WorkspaceSpaceRow,
  roleInput: ResolveRoleInput,
  extras?: Partial<
    Pick<
      WorkspaceGroup,
      | "cover"
      | "description"
      | "color"
      | "rules"
      | "memberCount"
      | "onlineCount"
      | "createdAt"
      | "tags"
      | "featured"
      | "spaceType"
    >
  >
): WorkspaceGroup {
  return mapSpaceToWorkspaceSpace(space, roleInput, extras);
}
export function mapSpacesToGroups(
  spaces: WorkspaceSpaceRow[],
  roleInput: ResolveRoleInput,
  opts?: { includeSystem?: boolean }
): WorkspaceGroup[] {
  const includeSystem = opts?.includeSystem ?? false;
  return spaces
    .filter((s) => includeSystem || !isSystemGroupSlug(s.slug))
    .map((s) => mapSpaceToGroup(s, roleInput));
}

export function flattenChannels(
  spaces: WorkspaceSpaceRow[],
  roleInput: ResolveRoleInput
): WorkspaceChannel[] {
  return spaces.flatMap((s) => s.rooms.map((r) => mapRoomToChannel(r, roleInput)));
}

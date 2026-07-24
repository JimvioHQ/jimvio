/**
 * Canonical community group/channel URLs — no query params.
 *
 * /communities/[communitySlug]
 * /communities/[communitySlug]/groups/[groupSlug]
 * /communities/[communitySlug]/groups/[groupSlug]/channels/[channelSlug]
 */

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CheckSquare,
  Folder,
  Hash,
  LayoutList,
  MessageCircle,
  Radio,
} from "lucide-react";
import type {
  WorkspaceRoomRow,
  WorkspaceSpaceRow,
} from "@/components/community/workspace-context";

/** Group workspace page. */
export function communityGroupHref(
  communitySlug: string,
  groupSlug: string
): string {
  return `/communities/${encodeURIComponent(communitySlug)}/groups/${encodeURIComponent(groupSlug)}`;
}

/** Channel workspace page (overview-first; Discussion injects ChatRoom). */
export function communityChannelHref(
  communitySlug: string,
  groupSlug: string,
  channelSlug: string
): string {
  return `/communities/${encodeURIComponent(communitySlug)}/groups/${encodeURIComponent(groupSlug)}/channels/${encodeURIComponent(channelSlug)}`;
}

/**
 * Canonical channel URL — preferred name for new call sites.
 * Kept as alias of communityChannelHref for existing imports.
 */
export function communityRoomHref(
  communitySlug: string,
  groupSlug: string,
  channelSlug: string
): string {
  return communityChannelHref(communitySlug, groupSlug, channelSlug);
}

export function resolveSpace(
  spaces: WorkspaceSpaceRow[],
  key: string | null | undefined
): WorkspaceSpaceRow | null {
  if (!key) return null;
  return (
    spaces.find((s) => s.slug === key || s.id === key) ?? null
  );
}

export function resolveRoom(
  space: WorkspaceSpaceRow,
  key: string | null | undefined
): WorkspaceRoomRow | null {
  if (!key) return null;
  return space.rooms.find((r) => r.slug === key || r.id === key) ?? null;
}

export function resolveSpaceAndRoom(
  spaces: WorkspaceSpaceRow[],
  spaceKey: string | null | undefined,
  roomKey: string | null | undefined
): { space: WorkspaceSpaceRow; room: WorkspaceRoomRow } | null {
  if (spaceKey && roomKey) {
    const space = resolveSpace(spaces, spaceKey);
    if (space) {
      const room = resolveRoom(space, roomKey);
      if (room) return { space, room };
    }
  }
  if (roomKey) {
    for (const space of spaces) {
      const room = resolveRoom(space, roomKey);
      if (room) return { space, room };
    }
  }
  return null;
}

/** Build canonical path from resolved space/room (legacy query redirect). */
export function canonicalFromSpaceRoom(
  communitySlug: string,
  space: WorkspaceSpaceRow,
  room?: WorkspaceRoomRow | null
): string {
  if (room) {
    return communityChannelHref(communitySlug, space.slug, room.slug);
  }
  return communityGroupHref(communitySlug, space.slug);
}

export function roomTypeIcon(roomType: string): LucideIcon {
  switch (roomType) {
    case "chat":
      return MessageCircle;
    case "course":
      return BookOpen;
    case "posts":
      return Hash;
    case "resources":
      return Folder;
    case "tasks":
      return CheckSquare;
    case "live":
    case "voice":
      return Radio;
    default:
      return LayoutList;
  }
}

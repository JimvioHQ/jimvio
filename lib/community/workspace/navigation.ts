/**
 * Canonical community group/channel URLs — no query params.
 *
 * /communities/[communitySlug]
 * /communities/[communitySlug]/groups/[groupSlug]
 * /communities/[communitySlug]/channels/[channelSlug]
 *
 * Channels still belong to Groups in the database; the URL no longer nests
 * the parent group slug.
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

/**
 * Canonical channel URL (flat).
 * Parent Group is resolved from the workspace loader by channelSlug.
 */
export function communityChannelHref(
  communitySlug: string,
  channelSlug: string
): string {
  return `/communities/${encodeURIComponent(communitySlug)}/channels/${encodeURIComponent(channelSlug)}`;
}

/**
 * Room → channel URL helper.
 * `groupSlug` is accepted for call-site convenience but ignored in the path
 * (Group remains a DB relationship only).
 */
export function communityRoomHref(
  communitySlug: string,
  _groupSlug: string,
  channelSlug: string
): string {
  return communityChannelHref(communitySlug, channelSlug);
}

/** Legacy nested channel path — used only for permanent redirects. */
export function legacyNestedChannelHref(
  communitySlug: string,
  groupSlug: string,
  channelSlug: string
): string {
  return `/communities/${encodeURIComponent(communitySlug)}/groups/${encodeURIComponent(groupSlug)}/channels/${encodeURIComponent(channelSlug)}`;
}

export function resolveSpace(
  spaces: WorkspaceSpaceRow[],
  key: string | null | undefined
): WorkspaceSpaceRow | null {
  if (!key) return null;
  const needle = key.trim();
  if (!needle) return null;
  // Resolve by public slug first; id match is fallback for internal tools only.
  return (
    spaces.find((s) => s.slug === needle) ??
    spaces.find((s) => s.id === needle) ??
    null
  );
}

export function resolveRoom(
  space: WorkspaceSpaceRow,
  key: string | null | undefined
): WorkspaceRoomRow | null {
  if (!key) return null;
  const needle = key.trim();
  if (!needle) return null;
  return (
    space.rooms.find((r) => r.slug === needle) ??
    space.rooms.find((r) => r.id === needle) ??
    null
  );
}

/**
 * Resolve a channel by slug (or id) across all groups in the community.
 * Optionally constrain to a known group when `spaceKey` is provided.
 */
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
    return communityChannelHref(communitySlug, room.slug);
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

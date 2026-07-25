/**
 * Canonical community Space URLs — no query params.
 *
 * Product hierarchy: Community → Spaces
 *
 * /communities/[communitySlug]
 * /communities/[communitySlug]/spaces/[spaceSlug]
 *
 * Rooms remain the internal realtime/message unit under a Space. Flat URLs
 * resolve a slug as either a Space or a room across the community.
 *
 * Legacy paths (/groups/…, /channels/…) permanently redirect to /spaces/….
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

/** Canonical Space workspace page. */
export function communitySpaceHref(
  communitySlug: string,
  spaceSlug: string
): string {
  return `/communities/${encodeURIComponent(communitySlug)}/spaces/${encodeURIComponent(spaceSlug)}`;
}

/**
 * @deprecated Use communitySpaceHref. Wrapper kept for call-site migration.
 */
export function communityGroupHref(
  communitySlug: string,
  groupSlug: string
): string {
  return communitySpaceHref(communitySlug, groupSlug);
}

/**
 * Canonical room / Space-area URL (flat under /spaces/).
 * Resolves by room slug across the community; parent Space is loader-resolved.
 */
export function communityChannelHref(
  communitySlug: string,
  channelSlug: string
): string {
  return communitySpaceHref(communitySlug, channelSlug);
}

/**
 * Room → Space-area URL helper.
 * `groupSlug` is accepted for call-site convenience but ignored in the path
 * (Space remains a DB relationship only).
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
 * Resolve a room by slug (or id) across all Spaces in the community.
 * Optionally constrain to a known Space when `spaceKey` is provided.
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
  return communitySpaceHref(communitySlug, space.slug);
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

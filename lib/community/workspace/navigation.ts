/**
 * Shared group/channel navigation helpers — single URL shape for room opens.
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

/** Canonical member room URL — always ChannelWorkspace via /room. */
export function communityRoomHref(
  communitySlug: string,
  spaceId: string,
  roomId: string
): string {
  return `/communities/${communitySlug}/room?space=${encodeURIComponent(spaceId)}&room=${encodeURIComponent(roomId)}`;
}

export function communityGroupHref(
  communitySlug: string,
  spaceId: string
): string {
  return `/communities/${communitySlug}?space=${encodeURIComponent(spaceId)}`;
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

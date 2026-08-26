/**
 * Live Collaboration Suite — pure helpers (Phase 6).
 */

import type { Msg } from "@/types";
import type { ChatMessage } from "@/lib/community/hub-live-types";
import { canonicalLiveUrl } from "@/lib/live/live-url";
import type {
  LiveRoomType,
  ScreenShareQuality,
  ScreenShareTarget,
} from "./types";
import { LIVE_ROOM_TYPES } from "./types";

export function isLiveRoomType(v: unknown): v is LiveRoomType {
  return typeof v === "string" && (LIVE_ROOM_TYPES as readonly string[]).includes(v);
}

/** Map live chat rows into Msg shape for room message index sync (no duplicate fetch). */
export function liveChatToMsg(m: ChatMessage, roomId: string): Msg {
  return {
    id: m.id,
    body: m.body,
    sender_id: "live",
    created_at: m.created_at,
    message_type: "text",
    thread_id: null,
    reactions: {},
    profiles: {
      full_name: m.sender_name,
      avatar_url: m.sender_avatar,
      username: null,
    },
    metadata: { live_session_chat: true, room_id: roomId },
  };
}

export function displaySurfaceConstraint(
  target: ScreenShareTarget
): MediaTrackConstraints {
  // Browser picker still decides; preference hints via displaySurface where supported.
  const surface =
    target === "browser_tab"
      ? "browser"
      : target === "window"
        ? "window"
        : "monitor";
  return { displaySurface: surface } as MediaTrackConstraints;
}

export function shareVideoConstraints(
  quality: ScreenShareQuality
): MediaTrackConstraints {
  if (quality === "high") {
    return {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    };
  }
  return {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 24 },
  };
}

export function defaultInviteLink(sessionId: string): string {
  return canonicalLiveUrl(sessionId);
}

/**
 * Stable empty array for Zustand selectors.
 * NEVER use `?? []` inline in useStore selectors — a new [] each call makes
 * Object.is fail → forceStoreRerender → React #185 (Maximum update depth).
 */
// frozen mutable-typed empty list — safe shared fallback for selectors
export const EMPTY_LIVE_LIST: never[] = Object.freeze([]) as unknown as never[];


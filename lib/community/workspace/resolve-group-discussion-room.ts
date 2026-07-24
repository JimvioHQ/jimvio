/**
 * Resolve the Group Discussion chat room from existing channels.
 * Prefer dedicated discussion/general chat rooms; never invent a parallel chat engine.
 * Returns null when missing so the Group page can ensure a Discussion room.
 */

export type DiscussionRoomLite = {
  id: string;
  name: string;
  slug: string;
  room_type: string;
  is_active?: boolean | null;
};

const DISCUSSION_SLUG_RE = /^(discussion|general|chat|lounge)$/i;
const DISCUSSION_NAME_RE = /^(discussion|general|chat|general chat)$/i;

function isActiveRoom(room: DiscussionRoomLite): boolean {
  return room.is_active !== false;
}

function isChatCapable(room: DiscussionRoomLite): boolean {
  const t = (room.room_type || "").toLowerCase();
  return t === "chat" || t === "";
}

/**
 * Pick the Group homepage Discussion room without navigating away from the Group URL.
 * Does not fall back to arbitrary channels — empty Groups ensure a dedicated Discussion room.
 */
export function resolveGroupDiscussionRoom<T extends DiscussionRoomLite>(
  rooms: readonly T[]
): T | null {
  const active = rooms.filter(isActiveRoom);
  if (active.length === 0) return null;

  const bySlug = active.find(
    (r) => isChatCapable(r) && DISCUSSION_SLUG_RE.test(r.slug?.trim() || "")
  );
  if (bySlug) return bySlug;

  const byName = active.find(
    (r) => isChatCapable(r) && DISCUSSION_NAME_RE.test(r.name?.trim() || "")
  );
  if (byName) return byName;

  return null;
}

export const GROUP_DISCUSSION_ROOM_NAME = "Discussion";
export const GROUP_DISCUSSION_ROOM_TYPE = "chat";

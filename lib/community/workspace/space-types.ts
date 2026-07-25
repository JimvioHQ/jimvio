/**
 * Extensible Space product types (Community → Spaces).
 *
 * DB tables remain `spaces` + `rooms`. Product term is Space; rooms stay the
 * internal realtime/message unit. Add new types by extending SPACE_TYPES and
 * the companion maps — no hierarchy refactor required.
 */

/** Canonical Space types — append new entries here to extend the product. */
export const SPACE_TYPES = [
  "discussion",
  "voice",
  "live",
  "course",
  "marketplace",
  "event",
  "ai",
] as const;

export type SpaceType = (typeof SPACE_TYPES)[number];

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  discussion: "Discussion",
  voice: "Voice",
  live: "Live",
  course: "Course",
  marketplace: "Marketplace",
  event: "Event",
  ai: "AI",
};

/**
 * Preferred DB `rooms.room_type` when creating the primary room for a Space.
 * Unknown future Space types should default to "chat" at call sites.
 */
export const SPACE_TYPE_TO_ROOM_TYPE: Record<SpaceType, string> = {
  discussion: "chat",
  voice: "voice",
  live: "live",
  course: "course",
  marketplace: "chat",
  event: "tasks",
  ai: "chat",
};

/** DB `rooms.room_type` → SpaceType (best-effort; unknown → discussion). */
export const ROOM_TYPE_TO_SPACE_TYPE: Record<string, SpaceType> = {
  chat: "discussion",
  posts: "discussion",
  resources: "discussion",
  voice: "voice",
  live: "live",
  course: "course",
  tasks: "event",
  files: "discussion",
  signals: "discussion",
  knowledge: "discussion",
  media: "discussion",
  qa: "discussion",
  feed: "discussion",
};

/** Owner Console / DB `rooms.channel_kind` → SpaceType. */
export const CHANNEL_KIND_TO_SPACE_TYPE: Record<string, SpaceType> = {
  discussion: "discussion",
  announcement: "discussion",
  resources: "discussion",
  knowledge: "discussion",
  files: "discussion",
  media: "discussion",
  voice: "voice",
  live: "live",
  events: "event",
  event: "event",
  courses: "course",
  course: "course",
  qa: "discussion",
  signals: "discussion",
  support: "discussion",
  marketplace: "marketplace",
  commerce: "marketplace",
  ai: "ai",
};

const SPACE_TYPE_SET: ReadonlySet<string> = new Set(SPACE_TYPES);

export function isSpaceType(value: unknown): value is SpaceType {
  return typeof value === "string" && SPACE_TYPE_SET.has(value);
}

/** Resolve SpaceType from a room row (channel_kind preferred, then room_type). */
export function spaceTypeFromRoom(room: {
  room_type?: string | null;
  channel_kind?: string | null;
}): SpaceType {
  const kind = (room.channel_kind || "").toLowerCase().trim();
  if (kind && CHANNEL_KIND_TO_SPACE_TYPE[kind]) {
    return CHANNEL_KIND_TO_SPACE_TYPE[kind];
  }
  const roomType = (room.room_type || "").toLowerCase().trim();
  if (roomType && ROOM_TYPE_TO_SPACE_TYPE[roomType]) {
    return ROOM_TYPE_TO_SPACE_TYPE[roomType];
  }
  return "discussion";
}

export function roomTypeForSpaceType(spaceType: SpaceType): string {
  return SPACE_TYPE_TO_ROOM_TYPE[spaceType] ?? "chat";
}

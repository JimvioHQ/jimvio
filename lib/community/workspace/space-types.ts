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
  "announcement",
  "resources",
  "qa",
  "event",
  "voice",
  "live",
  "course",
  "marketplace",
  "ai",
] as const;

export type SpaceType = (typeof SPACE_TYPES)[number];

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  discussion: "Discussion",
  announcement: "Announcement",
  resources: "Resources",
  qa: "Q&A",
  event: "Events",
  voice: "Voice",
  live: "Live",
  course: "Course",
  marketplace: "Marketplace",
  ai: "AI",
};

/**
 * Preferred DB `rooms.room_type` when creating the primary room for a Space.
 * Unknown future Space types should default to "chat" at call sites.
 */
export const SPACE_TYPE_TO_ROOM_TYPE: Record<SpaceType, string> = {
  discussion: "chat",
  announcement: "posts",
  resources: "resources",
  qa: "qa",
  event: "tasks",
  voice: "voice",
  live: "live",
  course: "course",
  marketplace: "chat",
  ai: "chat",
};

/** Preferred channel_kind for primary room. */
export const SPACE_TYPE_TO_CHANNEL_KIND: Record<SpaceType, string> = {
  discussion: "discussion",
  announcement: "announcement",
  resources: "resources",
  qa: "qa",
  event: "events",
  voice: "voice",
  live: "live",
  course: "courses",
  marketplace: "marketplace",
  ai: "ai",
};

/** DB `rooms.room_type` → SpaceType (best-effort; unknown → discussion). */
export const ROOM_TYPE_TO_SPACE_TYPE: Record<string, SpaceType> = {
  chat: "discussion",
  posts: "announcement",
  resources: "resources",
  voice: "voice",
  live: "live",
  course: "course",
  tasks: "event",
  files: "resources",
  signals: "discussion",
  knowledge: "resources",
  media: "resources",
  qa: "qa",
  feed: "discussion",
};

/** Owner Console / DB `rooms.channel_kind` → SpaceType. */
export const CHANNEL_KIND_TO_SPACE_TYPE: Record<string, SpaceType> = {
  discussion: "discussion",
  announcement: "announcement",
  resources: "resources",
  knowledge: "resources",
  files: "resources",
  media: "resources",
  voice: "voice",
  live: "live",
  events: "event",
  event: "event",
  courses: "course",
  course: "course",
  qa: "qa",
  signals: "discussion",
  support: "discussion",
  marketplace: "marketplace",
  commerce: "marketplace",
  ai: "ai",
};

/** Types where only staff should post by default (broadcast / curated). */
export const STAFF_POSTING_SPACE_TYPES: ReadonlySet<SpaceType> = new Set([
  "announcement",
  "resources",
]);

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

export function channelKindForSpaceType(spaceType: SpaceType): string {
  return SPACE_TYPE_TO_CHANNEL_KIND[spaceType] ?? "discussion";
}

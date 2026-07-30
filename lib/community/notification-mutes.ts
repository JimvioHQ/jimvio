/**
 * Community notification mute helpers.
 * Schema: community_memberships.notification_mutes jsonb
 * Shape: { community?: boolean, spaces?: uuid[], rooms?: uuid[] }
 */

export type NotificationMutes = {
  community?: boolean;
  spaces?: string[];
  rooms?: string[];
};

export function parseNotificationMutes(raw: unknown): NotificationMutes {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const spaces = Array.isArray(obj.spaces)
    ? obj.spaces.filter((id): id is string => typeof id === "string")
    : undefined;
  const rooms = Array.isArray(obj.rooms)
    ? obj.rooms.filter((id): id is string => typeof id === "string")
    : undefined;
  return {
    community: obj.community === true,
    spaces,
    rooms,
  };
}

export function isCommunityMuted(mutes: NotificationMutes): boolean {
  return mutes.community === true;
}

export function isSpaceMuted(mutes: NotificationMutes, spaceId: string | null | undefined): boolean {
  if (isCommunityMuted(mutes)) return true;
  if (!spaceId || !mutes.spaces?.length) return false;
  return mutes.spaces.includes(spaceId);
}

export function isRoomMuted(mutes: NotificationMutes, roomId: string | null | undefined): boolean {
  if (isCommunityMuted(mutes)) return true;
  if (!roomId || !mutes.rooms?.length) return false;
  return mutes.rooms.includes(roomId);
}

/** Toggle community-wide mute while preserving spaces/rooms arrays. */
export function withCommunityMute(existing: unknown, muted: boolean): NotificationMutes {
  const parsed = parseNotificationMutes(existing);
  return {
    ...parsed,
    community: muted,
    spaces: parsed.spaces ?? [],
    rooms: parsed.rooms ?? [],
  };
}

/** Toggle a space id in the spaces mute list. */
export function withSpaceMute(
  existing: unknown,
  spaceId: string,
  muted: boolean
): NotificationMutes {
  const parsed = parseNotificationMutes(existing);
  const set = new Set(parsed.spaces ?? []);
  if (muted) set.add(spaceId);
  else set.delete(spaceId);
  return {
    ...parsed,
    community: parsed.community === true,
    spaces: [...set],
    rooms: parsed.rooms ?? [],
  };
}

/** Toggle a room id in the rooms mute list. */
export function withRoomMute(
  existing: unknown,
  roomId: string,
  muted: boolean
): NotificationMutes {
  const parsed = parseNotificationMutes(existing);
  const set = new Set(parsed.rooms ?? []);
  if (muted) set.add(roomId);
  else set.delete(roomId);
  return {
    ...parsed,
    community: parsed.community === true,
    spaces: parsed.spaces ?? [],
    rooms: [...set],
  };
}

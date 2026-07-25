export type MuteTargetKind = "space" | "room";

export type NotificationMutes = {
  spaces: string[];
  rooms: string[];
};

export function normalizeNotificationMutes(raw: unknown): NotificationMutes {
  if (!raw || typeof raw !== "object") {
    return { spaces: [], rooms: [] };
  }
  const obj = raw as Record<string, unknown>;
  const spaces = Array.isArray(obj.spaces)
    ? obj.spaces.map(String).filter(Boolean)
    : [];
  const rooms = Array.isArray(obj.rooms)
    ? obj.rooms.map(String).filter(Boolean)
    : [];
  return { spaces, rooms };
}

export function isTargetMuted(
  mutes: NotificationMutes,
  kind: MuteTargetKind,
  targetId: string
): boolean {
  const id = String(targetId);
  return kind === "space"
    ? mutes.spaces.includes(id)
    : mutes.rooms.includes(id);
}

export function toggleMuteTarget(
  mutes: NotificationMutes,
  kind: MuteTargetKind,
  targetId: string,
  muted: boolean
): NotificationMutes {
  const id = String(targetId);
  const key = kind === "space" ? "spaces" : "rooms";
  const set = new Set(mutes[key].map(String));
  if (muted) set.add(id);
  else set.delete(id);
  return {
    ...mutes,
    [key]: Array.from(set),
  };
}

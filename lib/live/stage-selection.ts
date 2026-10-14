/**
 * Room-wide main-stage selection.
 * LiveKit allows one screen-share video track per participant and this client
 * subscribes to each of them. Selecting a stage source only changes which
 * existing track is featured. It does not restart capture.
 */

export type StageSourceKind = "default" | "participant" | "screen" | "camera";

export type RoomStageFocus = {
  identity: string | null;
  owner: string | null;
  kind: StageSourceKind;
  version: number;
};

export function canControlRoomStage(role: string | null | undefined): boolean {
  return role === "host" || role === "cohost";
}

export function readStageFocus(settings: unknown): RoomStageFocus | null {
  if (!settings || typeof settings !== "object") return null;
  const focus = (settings as { stage_focus?: unknown }).stage_focus;
  if (!focus || typeof focus !== "object") return null;
  const record = focus as { identity?: unknown; owner?: unknown; kind?: unknown; version?: unknown };
  const identity = typeof record.identity === "string" && record.identity.trim() ? record.identity.trim() : null;
  const kind: StageSourceKind =
    record.kind === "screen" || record.kind === "participant" || record.kind === "camera" || record.kind === "default"
      ? record.kind
      : "default";
  const version = Number(record.version);
  return {
    identity,
    owner: typeof record.owner === "string" && record.owner.trim() ? record.owner.trim() : identity,
    kind: identity ? kind : "default",
    version: Number.isFinite(version) && version > 0 ? version : 0,
  };
}

/** Newer host selections win. Equal versions keep the current selection. */
export function mergeStageFocus(
  current: RoomStageFocus | null,
  incoming: RoomStageFocus | null,
): RoomStageFocus | null {
  if (!incoming) return current;
  if (!current) return incoming;
  if (incoming.version < current.version) return current;
  if (incoming.version === current.version) return current;
  return incoming;
}

export function mergeLiveSessionSettings(prev: unknown, next: unknown): Record<string, unknown> {
  const previous = prev && typeof prev === "object" ? (prev as Record<string, unknown>) : {};
  const incoming = next && typeof next === "object" ? (next as Record<string, unknown>) : {};
  const focus = mergeStageFocus(readStageFocus(previous), readStageFocus(incoming));
  return {
    ...previous,
    ...incoming,
    ...(focus
      ? {
          stage_focus: {
            identity: focus.identity,
            owner: focus.owner,
            kind: focus.kind,
            version: focus.version,
          },
        }
      : {}),
  };
}

export function nextStageFocus(input: {
  previous: RoomStageFocus | null;
  identity: string | null;
  kind?: StageSourceKind;
}): RoomStageFocus {
  const identity = input.identity?.trim() || null;
  const requested = input.kind ?? (identity ? "participant" : "default");
  const kind: StageSourceKind = !identity
    ? "default"
    : requested === "screen"
      ? "screen"
      : requested === "camera" || requested === "participant"
        ? "participant"
        : "default";
  return {
    identity,
    owner: identity,
    kind,
    version: (input.previous?.version ?? 0) + 1,
  };
}

export type ResolvedStageSource = {
  identity: string | null;
  kind: "screen" | "camera";
  /** True when the requested screen was already gone and a fallback was chosen. */
  fellBack: boolean;
};

/**
 * Host-selected screen stays featured only while that share is still live.
 * An explicit participant pin replaces the screen for every viewer.
 * A new participant share never replaces the current selection by itself.
 * A stopped screen selection falls back to the host screen, then the host camera.
 * Active-speaker audio is not an input and cannot override this result.
 */
export function resolveStageSource(input: {
  focus: RoomStageFocus | null;
  hostIdentity?: string | null;
  screenIdentities: string[];
  hostSharing: boolean;
}): ResolvedStageSource {
  const screens = new Set(input.screenIdentities.filter(Boolean));
  const hostIdentity = input.hostIdentity ?? null;
  const focus = input.focus;
  if (
    focus &&
    (focus.kind === "participant" || focus.kind === "camera") &&
    focus.identity
  ) {
    return { identity: focus.identity, kind: "camera", fellBack: false };
  }
  const requestedScreen =
    focus?.kind === "screen" && focus.identity && screens.has(focus.identity)
      ? focus.identity
      : null;
  if (requestedScreen) {
    return { identity: requestedScreen, kind: "screen", fellBack: false };
  }
  const requestedMissing =
    focus?.kind === "screen" && Boolean(focus.identity) && !requestedScreen;
  if (input.hostSharing && hostIdentity && screens.has(hostIdentity)) {
    return { identity: hostIdentity, kind: "screen", fellBack: requestedMissing };
  }
  return { identity: hostIdentity, kind: "camera", fellBack: requestedMissing };
}

export function dedupeByIdentity<T extends { identity: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!item.identity || seen.has(item.identity)) continue;
    seen.add(item.identity);
    out.push(item);
  }
  return out;
}

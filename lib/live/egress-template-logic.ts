/**
 * Pure helpers for the LiveKit room-composite egress template.
 * Keeps screen-share selection / start-signal policy testable without Chrome.
 */

export type EgressPubSnapshot = {
  identity: string;
  name: string;
  source: "camera" | "screen" | "unknown" | "audio";
  kind: "video" | "audio" | "other";
  subscribed: boolean;
  hasTrack: boolean;
  framesDecoded: number;
};

export type EgressTile =
  | {
      key: string;
      kind: "video";
      identity: string;
      name: string;
      screen: boolean;
    }
  | {
      key: string;
      kind: "avatar";
      identity: string;
      name: string;
    };

/** Build speaker tiles: screen share first, then other video, then avatar fallbacks. */
export function buildEgressTiles(pubs: EgressPubSnapshot[]): EgressTile[] {
  const byIdentity = new Map<string, EgressPubSnapshot[]>();
  for (const p of pubs) {
    const list = byIdentity.get(p.identity) ?? [];
    list.push(p);
    byIdentity.set(p.identity, list);
  }

  const tiles: EgressTile[] = [];
  for (const [identity, list] of byIdentity) {
    const name = list[0]?.name || identity;
    const videos = list.filter(
      (p) =>
        p.kind === "video" &&
        p.subscribed &&
        p.hasTrack &&
        (p.source === "camera" || p.source === "screen" || p.source === "unknown")
    );
    const screenPubs = list.filter((p) => p.kind === "video" && p.source === "screen");
    const hasScreenPublication = screenPubs.length > 0;

    for (const v of videos) {
      tiles.push({
        key: `${identity}:${v.source}:${v.subscribed ? "sub" : "pub"}`,
        kind: "video",
        identity,
        name,
        screen: v.source === "screen",
      });
    }

    // If screen share is published but not yet subscribed, do NOT fall back to
    // a permanent avatar tile for that identity — waiters handle start timing.
    if (videos.length === 0 && !hasScreenPublication) {
      tiles.push({
        key: `avatar:${identity}`,
        kind: "avatar",
        identity,
        name,
      });
    }
  }

  tiles.sort((a, b) => {
    const rank = (t: EgressTile) =>
      t.kind === "video" && t.screen ? 0 : t.kind === "video" ? 1 : 2;
    return rank(a) - rank(b);
  });
  return tiles;
}

export type StartSignalDecision = {
  shouldStart: boolean;
  reason: string;
};

/**
 * Mirror LiveKit default template start policy, with an extra rule:
 * if a screen-share publication exists, prefer waiting for its decoded frames
 * before START_RECORDING so the composite does not bake in avatar-only.
 */
export function decideEgressStartSignal(input: {
  elapsedMs: number;
  pubs: EgressPubSnapshot[];
  frameDecodeTimeoutMs?: number;
  avatarGraceMs?: number;
}): StartSignalDecision {
  const frameTimeout = input.frameDecodeTimeoutMs ?? 8_000;
  const avatarGrace = input.avatarGraceMs ?? 500;
  const pubs = input.pubs;
  const elapsed = input.elapsedMs;

  let hasVideoPublication = false;
  let hasScreenPublication = false;
  let hasSubscribedTrack = false;
  let hasDecodedFrames = false;
  let hasScreenDecoded = false;

  for (const p of pubs) {
    if (p.subscribed && p.hasTrack) hasSubscribedTrack = true;
    if (p.kind !== "video") continue;
    if (p.source === "camera" || p.source === "screen" || p.source === "unknown") {
      hasVideoPublication = true;
    }
    if (p.source === "screen") {
      hasScreenPublication = true;
      if (p.framesDecoded > 0) hasScreenDecoded = true;
    }
    if (p.framesDecoded > 0) hasDecodedFrames = true;
  }

  if (hasScreenPublication && hasScreenDecoded) {
    return { shouldStart: true, reason: "screen_frames_decoded" };
  }
  if (!hasScreenPublication && hasDecodedFrames) {
    return { shouldStart: true, reason: "video_frames_decoded" };
  }
  if (hasScreenPublication && !hasScreenDecoded && elapsed < frameTimeout) {
    return { shouldStart: false, reason: "wait_screen_frames" };
  }
  if (hasVideoPublication && !hasDecodedFrames && elapsed < frameTimeout) {
    return { shouldStart: false, reason: "wait_video_frames" };
  }
  if (!hasVideoPublication && elapsed >= avatarGrace) {
    return { shouldStart: true, reason: "avatar_only_ready" };
  }
  if (elapsed >= frameTimeout && (hasSubscribedTrack || !hasVideoPublication)) {
    return { shouldStart: true, reason: "frame_timeout" };
  }
  return { shouldStart: false, reason: "waiting" };
}

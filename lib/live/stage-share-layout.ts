/**
 * Stage composition for LiveKit screen share.
 * Each participant can publish one screen track. Those tracks stay available
 * as previews until the host promotes one. A new share does not replace the
 * host's current main-stage source.
 */

import {
  dedupeByIdentity,
  resolveStageSource,
  type RoomStageFocus,
} from "@/lib/live/stage-selection";

export type StageShareCandidate = {
  identity: string;
  role?: string | null;
  screenStream: MediaStream | null;
  cameraStream: MediaStream | null;
};

export type StageScreenPreview = {
  identity: string;
  stream: MediaStream;
  onStage: boolean;
};

export type StageShareSelection = {
  stageStream: MediaStream | null;
  /** Participant whose screen owns the main stage, or null when the stage is a camera. */
  activeScreenShareIdentity: string | null;
  stageKind: "screen" | "camera";
  screenShares: StageScreenPreview[];
};

export function selectStageShareLayout(input: {
  remotes: StageShareCandidate[];
  hostIdentity?: string | null;
  stageFocus?: RoomStageFocus | null;
  localSharing?: boolean;
  localScreen?: MediaStream | null;
  localCamera?: MediaStream | null;
  localIdentity?: string | null;
  preferLocalCamera?: boolean;
}): StageShareSelection {
  const {
    remotes,
    hostIdentity = null,
    stageFocus = null,
    localSharing = false,
    localScreen = null,
    localCamera = null,
    localIdentity = null,
    preferLocalCamera = false,
  } = input;

  const screenItems = dedupeByIdentity([
    ...remotes
      .filter((remote) => remote.screenStream)
      .map((remote) => ({ identity: remote.identity, stream: remote.screenStream as MediaStream })),
    ...(localSharing && localScreen && localIdentity
      ? [{ identity: localIdentity, stream: localScreen }]
      : []),
  ]);
  const screenByIdentity = new Map(screenItems.map((item) => [item.identity, item.stream]));
  const hostSharing = Boolean(hostIdentity && screenByIdentity.has(hostIdentity));
  const resolved = resolveStageSource({
    focus: stageFocus,
    hostIdentity,
    screenIdentities: [...screenByIdentity.keys()],
    hostSharing,
  });

  const screenShares = screenItems.map((item) => ({
    identity: item.identity,
    stream: item.stream,
    onStage: resolved.kind === "screen" && resolved.identity === item.identity,
  }));

  if (resolved.kind === "screen" && resolved.identity) {
    const stream = screenByIdentity.get(resolved.identity) ?? null;
    if (stream) {
      return {
        stageStream: stream,
        activeScreenShareIdentity: resolved.identity,
        stageKind: "screen",
        screenShares,
      };
    }
  }

  const cameraFor = (identity: string | null): MediaStream | null => {
    if (!identity) return null;
    if (identity === localIdentity && localCamera) return localCamera;
    return remotes.find((remote) => remote.identity === identity)?.cameraStream ?? null;
  };

  const pinnedIdentity =
    (stageFocus?.kind === "participant" || stageFocus?.kind === "camera") && stageFocus.identity
      ? stageFocus.identity
      : null;
  if (pinnedIdentity) {
    const pinnedCamera = cameraFor(pinnedIdentity);
    const stillPresent =
      pinnedIdentity === localIdentity ||
      remotes.some((remote) => remote.identity === pinnedIdentity);
    if (pinnedCamera || stillPresent) {
      return {
        stageStream: pinnedCamera,
        activeScreenShareIdentity: null,
        stageKind: "camera",
        screenShares,
      };
    }
    const hostScreen = hostIdentity ? screenByIdentity.get(hostIdentity) : null;
    if (hostScreen && hostIdentity) {
      return {
        stageStream: hostScreen,
        activeScreenShareIdentity: hostIdentity,
        stageKind: "screen",
        screenShares: screenShares.map((share) => ({
          ...share,
          onStage: share.identity === hostIdentity,
        })),
      };
    }
  }
  if (preferLocalCamera && localCamera) {
    return {
      stageStream: localCamera,
      activeScreenShareIdentity: null,
      stageKind: "camera",
      screenShares,
    };
  }
  const hostCamera =
    cameraFor(hostIdentity) ??
    remotes.find((remote) => remote.role === "host" && remote.cameraStream)?.cameraStream ??
    remotes.find((remote) => remote.role === "cohost" && remote.cameraStream)?.cameraStream ??
    localCamera ??
    null;
  return {
    stageStream: hostCamera,
    activeScreenShareIdentity: null,
    stageKind: "camera",
    screenShares,
  };
}

/** PIP should receive camera only — screen tracks render in the share strip and main stage. */
export function pipStreamForParticipant(input: {
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  sharing: boolean;
}): MediaStream | null {
  void input.screenStream;
  void input.sharing;
  return input.cameraStream;
}

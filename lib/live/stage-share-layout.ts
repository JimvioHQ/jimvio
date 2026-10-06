/**
 * Pure stage composition helpers for screen-share + sharer PIP behavior.
 * Kept separate from LiveKit transport so layout rules are unit-testable.
 */

export type StageShareCandidate = {
  identity: string;
  role?: string | null;
  screenStream: MediaStream | null;
  cameraStream: MediaStream | null;
};

export type StageShareSelection = {
  stageStream: MediaStream | null;
  /** Participant whose screen owns the main stage (null when camera/host stage). */
  activeScreenShareIdentity: string | null;
};

/**
 * SCREEN SHARE > CAMERA.
 * When anyone is sharing, their screen is the dominant stage. Cameras never
 * replace an active screen share (sharer camera belongs in PIP).
 */
export function selectStageShareLayout(input: {
  remotes: StageShareCandidate[];
  hostIdentity?: string | null;
  stagePinIdentity?: string | null;
  localSharing?: boolean;
  localPreview?: MediaStream | null;
  localIdentity?: string | null;
  preferLocalStage?: boolean;
  lastRemoteScreenIdentity?: string | null;
}): StageShareSelection {
  const {
    remotes,
    hostIdentity = null,
    stagePinIdentity = null,
    localSharing = false,
    localPreview = null,
    localIdentity = null,
    preferLocalStage = false,
    lastRemoteScreenIdentity = null,
  } = input;

  const pinned = stagePinIdentity
    ? remotes.find((r) => r.identity === stagePinIdentity) ?? null
    : null;
  const hostRemote = hostIdentity
    ? remotes.find((r) => r.identity === hostIdentity) ?? null
    : null;

  const remoteScreens = remotes.filter((r) => r.screenStream);
  let remoteScreen: StageShareCandidate | null = null;
  if (pinned?.screenStream) remoteScreen = pinned;
  else if (lastRemoteScreenIdentity) {
    remoteScreen =
      remoteScreens.find((r) => r.identity === lastRemoteScreenIdentity) ?? null;
  }
  if (!remoteScreen) {
    remoteScreen =
      remoteScreens.find(
        (r) => r.identity === hostIdentity || r.role === "host"
      ) ??
      remoteScreens.find((r) => r.role === "cohost") ??
      remoteScreens[0] ??
      null;
  }

  const localScreen = localSharing && localPreview ? localPreview : null;

  if (remoteScreen?.screenStream && localScreen) {
    if (
      lastRemoteScreenIdentity &&
      remoteScreen.identity === lastRemoteScreenIdentity
    ) {
      return {
        stageStream: remoteScreen.screenStream,
        activeScreenShareIdentity: remoteScreen.identity,
      };
    }
    if (preferLocalStage) {
      return {
        stageStream: localScreen,
        activeScreenShareIdentity: localIdentity,
      };
    }
    return {
      stageStream: remoteScreen.screenStream,
      activeScreenShareIdentity: remoteScreen.identity,
    };
  }

  if (remoteScreen?.screenStream) {
    return {
      stageStream: remoteScreen.screenStream,
      activeScreenShareIdentity: remoteScreen.identity,
    };
  }

  if (localScreen) {
    return {
      stageStream: localScreen,
      activeScreenShareIdentity: localIdentity,
    };
  }

  // No screen share — cameras / pin / host preview.
  if (pinned?.cameraStream) {
    return { stageStream: pinned.cameraStream, activeScreenShareIdentity: null };
  }
  if (preferLocalStage && localPreview) {
    return { stageStream: localPreview, activeScreenShareIdentity: null };
  }
  const hostCam =
    hostRemote?.cameraStream ??
    remotes.find((r) => r.role === "host" && r.cameraStream)?.cameraStream ??
    remotes.find((r) => r.role === "cohost" && r.cameraStream)?.cameraStream ??
    localPreview ??
    null;
  return { stageStream: hostCam, activeScreenShareIdentity: null };
}

/** PIP should receive camera only — never the screen track. */
export function pipStreamForParticipant(input: {
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  sharing: boolean;
}): MediaStream | null {
  void input.screenStream;
  void input.sharing;
  return input.cameraStream;
}

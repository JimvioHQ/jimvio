/**
 * Live session participant capability policy (stored in live_sessions.settings.participants).
 * Defaults are permissive — Host must explicitly disable a capability.
 */

export type LiveParticipantPermissions = {
  allowAudio: boolean;
  allowVideo: boolean;
  allowScreenShare: boolean;
  allowRecording: boolean;
};

export const DEFAULT_PARTICIPANT_PERMISSIONS: LiveParticipantPermissions = {
  allowAudio: true,
  allowVideo: true,
  allowScreenShare: true,
  allowRecording: true,
};

type RawParticipants = {
  allow_audio?: unknown;
  allow_video?: unknown;
  allow_screen_share?: unknown;
  allow_recording?: unknown;
  allowParticipantAudio?: unknown;
  allowParticipantVideo?: unknown;
  allowParticipantScreenShare?: unknown;
  allowParticipantRecording?: unknown;
};

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

/** Parse participant permissions from session.settings (JSON). */
export function parseParticipantPermissions(
  settings: Record<string, unknown> | null | undefined
): LiveParticipantPermissions {
  const raw = (settings?.participants ?? null) as RawParticipants | null;
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PARTICIPANT_PERMISSIONS };
  }
  return {
    allowAudio: asBool(
      raw.allow_audio ?? raw.allowParticipantAudio,
      DEFAULT_PARTICIPANT_PERMISSIONS.allowAudio
    ),
    allowVideo: asBool(
      raw.allow_video ?? raw.allowParticipantVideo,
      DEFAULT_PARTICIPANT_PERMISSIONS.allowVideo
    ),
    allowScreenShare: asBool(
      raw.allow_screen_share ?? raw.allowParticipantScreenShare,
      DEFAULT_PARTICIPANT_PERMISSIONS.allowScreenShare
    ),
    allowRecording: asBool(
      raw.allow_recording ?? raw.allowParticipantRecording,
      DEFAULT_PARTICIPANT_PERMISSIONS.allowRecording
    ),
  };
}

/** Serialize for live_sessions.settings.participants. */
export function serializeParticipantPermissions(
  perms: LiveParticipantPermissions
): Record<string, boolean> {
  return {
    allow_audio: perms.allowAudio,
    allow_video: perms.allowVideo,
    allow_screen_share: perms.allowScreenShare,
    allow_recording: perms.allowRecording,
  };
}

export function mergeParticipantPermissions(
  current: LiveParticipantPermissions,
  patch: Partial<LiveParticipantPermissions>
): LiveParticipantPermissions {
  return {
    allowAudio:
      typeof patch.allowAudio === "boolean" ? patch.allowAudio : current.allowAudio,
    allowVideo:
      typeof patch.allowVideo === "boolean" ? patch.allowVideo : current.allowVideo,
    allowScreenShare:
      typeof patch.allowScreenShare === "boolean"
        ? patch.allowScreenShare
        : current.allowScreenShare,
    allowRecording:
      typeof patch.allowRecording === "boolean"
        ? patch.allowRecording
        : current.allowRecording,
  };
}

/** True when joiners should receive LiveKit publish grants (speaker role). */
export function participantMediaPublishAllowed(
  perms: LiveParticipantPermissions
): boolean {
  return perms.allowAudio || perms.allowVideo || perms.allowScreenShare;
}

export function permissionDeniedReason(
  kind: "audio" | "video" | "screen" | "recording",
  perms: LiveParticipantPermissions
): string | null {
  if (kind === "audio" && !perms.allowAudio) {
    return "Microphone is disabled by the host.";
  }
  if (kind === "video" && !perms.allowVideo) {
    return "Camera is disabled by the host.";
  }
  if (kind === "screen" && !perms.allowScreenShare) {
    return "Screen sharing is disabled by the host.";
  }
  if (kind === "recording" && !perms.allowRecording) {
    return "Recording is disabled by the host.";
  }
  return null;
}

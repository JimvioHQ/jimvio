/** Live Studio stage roles — server + client permission matrix. */

export type LiveStageRole = "host" | "cohost" | "speaker" | "moderator" | "viewer";

export type LiveParticipantStatus =
  | "joined"
  | "requested"
  | "invited"
  | "rejected"
  | "left"
  | "removed";

export type LiveSessionStatus = "scheduled" | "live" | "ended" | "cancelled";

/** Community membership roles that may create / host a live session. */
export const COMMUNITY_STAFF_ROLES = new Set(["owner", "admin", "moderator"]);

const PUBLISH_AV = new Set<LiveStageRole>(["host", "cohost", "speaker"]);
const HOST_CONTROLS = new Set<LiveStageRole>(["host", "cohost"]);
const MOD_CONTROLS = new Set<LiveStageRole>(["host", "cohost", "moderator"]);

export function canPublishAv(role: LiveStageRole): boolean {
  return PUBLISH_AV.has(role);
}

export function canShareScreen(role: LiveStageRole): boolean {
  return HOST_CONTROLS.has(role) || role === "speaker";
}

/**
 * Local recording policy.
 * Default: Everyone / Guest (any joined stage role) may record when the session allows it.
 * Host may disable via session participant permissions (allowRecording=false).
 */
export function canRecord(
  role: LiveStageRole,
  opts?: { allowParticipantRecording?: boolean }
): boolean {
  if (opts?.allowParticipantRecording === false) return false;
  // Host/cohost always may record when session allows (or no session policy).
  if (HOST_CONTROLS.has(role)) return true;
  // Speakers, moderators, and joined participants (viewer role in DB = watching participant).
  return (
    role === "speaker" ||
    role === "moderator" ||
    role === "viewer"
  );
}

/** LiveKit Egress (cloud room composition) remains host/co-host only. */
export function canStartCloudEgress(role: LiveStageRole): boolean {
  return HOST_CONTROLS.has(role);
}

export function canEndLive(role: LiveStageRole): boolean {
  return role === "host";
}

export function canInviteSpeaker(role: LiveStageRole): boolean {
  return HOST_CONTROLS.has(role);
}

export function canAcceptSpeaker(role: LiveStageRole): boolean {
  return HOST_CONTROLS.has(role);
}

export function canRejectSpeaker(role: LiveStageRole): boolean {
  return HOST_CONTROLS.has(role);
}

export function canRemoveSpeaker(role: LiveStageRole): boolean {
  return HOST_CONTROLS.has(role);
}

export function canMuteParticipant(role: LiveStageRole): boolean {
  return MOD_CONTROLS.has(role);
}

export function canLaunchPoll(role: LiveStageRole): boolean {
  return MOD_CONTROLS.has(role);
}

export function canModerateChat(role: LiveStageRole): boolean {
  return MOD_CONTROLS.has(role);
}

export function canChangeRoles(role: LiveStageRole): boolean {
  return role === "host";
}

export function isCreatorControlRole(role: LiveStageRole): boolean {
  return HOST_CONTROLS.has(role) || role === "moderator" || role === "speaker";
}

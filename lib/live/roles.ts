/** Live Studio stage roles — server + client permission matrix. */

export type LiveStageRole = "host" | "cohost" | "speaker" | "moderator" | "viewer";

export type LiveParticipantStatus =
  | "joined"
  | "requested"
  | "invited"
  | "rejected"
  | "left"
  | "removed";

export type LiveSessionStatus = "scheduled" | "live" | "ended";

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

export function canRecord(role: LiveStageRole): boolean {
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

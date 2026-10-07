/**
 * Control dock activity modes — share mode must keep the FULL live dock.
 * Only the Share control flips to Stop Share; Invite/People/Chat/etc. stay.
 */
export type LiveDockActivity = "live" | "share" | "present";

export type LiveDockControlId =
  | "mic"
  | "cam"
  | "chat"
  | "share"
  | "stopShare"
  | "invite"
  | "people"
  | "record"
  | "streamTo"
  | "react"
  | "polls"
  | "qa"
  | "more"
  | "annotate"
  | "laser"
  | "fullscreen"
  | "copyLink"
  | "end"
  | "leave";

/**
 * Desktop live dock order (reference):
 * Mute → Start Video → Share Screen → Fullscreen → Invite → Participants →
 * Record → Chat → Stream To → More → End
 *
 * Screen-share activity uses the same dock; share becomes stopShare.
 */
export function desktopDockControls(
  activity: LiveDockActivity,
  opts?: { canEnd?: boolean; canPublish?: boolean; sharing?: boolean }
): LiveDockControlId[] {
  const canEnd = opts?.canEnd !== false;
  const endOrLeave: LiveDockControlId = canEnd ? "end" : "leave";
  const sharing = Boolean(opts?.sharing) || activity === "share";

  if (activity === "present") {
    return ["mic", "cam", "record", endOrLeave];
  }

  const shareControl: LiveDockControlId = sharing ? "stopShare" : "share";

  const base: LiveDockControlId[] = [
    "mic",
    "cam",
    shareControl,
    "fullscreen",
    "invite",
    "people",
    "record",
    "chat",
    "streamTo",
    "more",
    endOrLeave,
  ];

  if (opts?.canPublish === false) {
    return base.filter((id) => id !== "share" && id !== "stopShare");
  }
  return base;
}

/**
 * Mobile dock (latest reference): icon-first single row.
 * Mute → Camera → Share → Participants → Chat → Stream To → More
 * End lives in the mobile header, not the dock.
 */
export function mobileDockControls(opts: {
  canPublish: boolean;
  isHost: boolean;
  sharing?: boolean;
}): LiveDockControlId[] {
  const share: LiveDockControlId = opts.canPublish
    ? opts.sharing
      ? "stopShare"
      : "share"
    : "copyLink";

  return ["mic", "cam", share, "people", "chat", "streamTo", "more"];
}

export function dockKeepsAvDuringShare(activity: LiveDockActivity): boolean {
  const controls = desktopDockControls(activity, { sharing: activity === "share" });
  return controls.includes("mic") && controls.includes("cam");
}

/** Assert mobile order starts with Audio then Video. */
export function mobileDockAvFirst(controls: LiveDockControlId[]): boolean {
  return controls[0] === "mic" && controls[1] === "cam";
}

/** Full collaboration controls remain available while screen sharing. */
export function dockKeepsCollabDuringShare(activity: LiveDockActivity): boolean {
  const controls = desktopDockControls(activity, { sharing: true });
  return (
    controls.includes("invite") &&
    controls.includes("people") &&
    controls.includes("chat") &&
    controls.includes("streamTo") &&
    controls.includes("more") &&
    (controls.includes("stopShare") || controls.includes("share"))
  );
}

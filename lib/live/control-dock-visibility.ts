/**
 * Control dock activity modes — share mode must keep mic/cam controls.
 */
export type LiveDockActivity = "live" | "share" | "present";

export type LiveDockControlId =
  | "mic"
  | "cam"
  | "chat"
  | "share"
  | "stopShare"
  | "invite"
  | "record"
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

/** Primary controls always visible for publishers on desktop during live or share. */
export function desktopDockControls(
  activity: LiveDockActivity,
  opts?: { canEnd?: boolean }
): LiveDockControlId[] {
  const canEnd = opts?.canEnd !== false;
  const endOrLeave: LiveDockControlId = canEnd ? "end" : "leave";

  if (activity === "share") {
    return [
      "mic",
      "cam",
      "stopShare",
      "fullscreen",
      "record",
      "copyLink",
      endOrLeave,
    ];
  }

  if (activity === "present") {
    return ["mic", "cam", "record", endOrLeave];
  }

  return [
    "mic",
    "cam",
    "chat",
    "share",
    "copyLink",
    "invite",
    "record",
    endOrLeave,
  ];
}

/**
 * Mobile dock control order (product contract):
 * Audio → Video → Chat → Share → More → Leave/End
 *
 * Mic/Cam stay first and visible for everyone on mobile (disabled when the
 * role cannot publish). Screen-share never hides A/V. Chat is the primary
 * bottom action (reactions remain available via secondary controls).
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
  const endOrLeave: LiveDockControlId = opts.isHost ? "end" : "leave";

  return ["mic", "cam", "chat", share, "more", endOrLeave];
}

export function dockKeepsAvDuringShare(activity: LiveDockActivity): boolean {
  const controls = desktopDockControls(activity);
  return controls.includes("mic") && controls.includes("cam");
}

/** Assert mobile order starts with Audio then Video. */
export function mobileDockAvFirst(controls: LiveDockControlId[]): boolean {
  return controls[0] === "mic" && controls[1] === "cam";
}

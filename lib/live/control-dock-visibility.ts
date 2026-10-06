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
 * Mute → Start Video → Share Screen → Invite → Participants →
 * Record → Chat → Stream To → More → End
 */
export function desktopDockControls(
  activity: LiveDockActivity,
  opts?: { canEnd?: boolean; canPublish?: boolean }
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

  const base: LiveDockControlId[] = [
    "mic",
    "cam",
    "share",
    "invite",
    "people",
    "record",
    "chat",
    "streamTo",
    "more",
    endOrLeave,
  ];

  if (opts?.canPublish === false) {
    return base.filter((id) => id !== "share").concat([]);
  }
  return base;
}

/**
 * Mobile dock control order (reference two-row dock):
 * Mute → Start Video → Share Screen → Invite → Participants →
 * Record → Chat → Stream To → More → End
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

  return [
    "mic",
    "cam",
    share,
    "invite",
    "people",
    "record",
    "chat",
    "streamTo",
    "more",
    endOrLeave,
  ];
}

export function dockKeepsAvDuringShare(activity: LiveDockActivity): boolean {
  const controls = desktopDockControls(activity);
  return controls.includes("mic") && controls.includes("cam");
}

/** Assert mobile order starts with Audio then Video. */
export function mobileDockAvFirst(controls: LiveDockControlId[]): boolean {
  return controls[0] === "mic" && controls[1] === "cam";
}

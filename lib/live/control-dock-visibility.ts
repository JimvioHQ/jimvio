/**
 * Control dock activity modes — share mode must keep mic/cam controls.
 */
export type LiveDockActivity = "live" | "share" | "present";

export type LiveDockControlId =
  | "mic"
  | "cam"
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
      "annotate",
      "laser",
      "fullscreen",
      "record",
      "copyLink",
      "more",
      endOrLeave,
    ];
  }

  if (activity === "present") {
    return ["mic", "cam", "polls", "record", "more", endOrLeave];
  }

  return [
    "mic",
    "cam",
    "share",
    "copyLink",
    "invite",
    "record",
    "react",
    "polls",
    "qa",
    "more",
    endOrLeave,
  ];
}

/** Mobile dock always keeps mic/cam for publishers, including while sharing. */
export function mobileDockControls(opts: {
  canPublish: boolean;
  isHost: boolean;
  sharing?: boolean;
}): LiveDockControlId[] {
  if (!opts.canPublish) {
    return ["react", "copyLink", "more", "leave"];
  }
  const share: LiveDockControlId = opts.sharing ? "stopShare" : "share";
  return [
    "mic",
    "cam",
    share,
    "more",
    opts.isHost ? "end" : "leave",
  ];
}

export function dockKeepsAvDuringShare(activity: LiveDockActivity): boolean {
  const controls = desktopDockControls(activity);
  return controls.includes("mic") && controls.includes("cam");
}

/**
 * Store Builder editor chrome — breakpoint + overlay rules.
 * Pure functions so layout behavior can be unit-tested without React.
 */

export type EditorBreakpoint = "desktop" | "tablet" | "mobile";

export function editorBreakpointFromWidth(width: number): EditorBreakpoint {
  if (width < 768) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

/** Panels overlay the canvas instead of occupying grid columns. */
export function editorUsesOverlayPanels(bp: EditorBreakpoint): boolean {
  return bp !== "desktop";
}

/** Mobile editor: drawers are bottom sheets; tablet: side drawers. */
export function editorDrawerPlacement(
  bp: EditorBreakpoint,
  side: "left" | "right"
): "sheet" | "start" | "end" {
  if (bp === "mobile") return "sheet";
  return side === "left" ? "start" : "end";
}

export type ToolbarDensity = "full" | "compact" | "minimal";

export function editorToolbarDensity(
  bp: EditorBreakpoint,
  focusMode: boolean
): ToolbarDensity {
  if (focusMode) return "minimal";
  if (bp === "mobile") return "minimal";
  if (bp === "tablet") return "compact";
  return "full";
}

/**
 * Only one overlay drawer may be open at a time (tablet/mobile).
 * Desktop may keep both docked columns.
 */
export function constrainOverlayDrawers(state: {
  leftOpen: boolean;
  rightOpen: boolean;
  editorBp: EditorBreakpoint;
  prefer: "left" | "right";
}): { leftOpen: boolean; rightOpen: boolean } {
  if (!editorUsesOverlayPanels(state.editorBp)) {
    return { leftOpen: state.leftOpen, rightOpen: state.rightOpen };
  }
  if (state.leftOpen && state.rightOpen) {
    if (state.prefer === "right") return { leftOpen: false, rightOpen: true };
    return { leftOpen: true, rightOpen: false };
  }
  return { leftOpen: state.leftOpen, rightOpen: state.rightOpen };
}

export function builderShouldHideCommerceNav(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] || pathname;
  return path === "/commerce/builder" || path.startsWith("/commerce/builder/");
}

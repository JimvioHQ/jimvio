/**
 * Store Builder 3.0 — panel open/close + layout width helpers.
 * Pure functions for unit tests (no React).
 */

export type BuilderPanelId =
  | "design"
  | "sections"
  | "navigation"
  | "theme"
  | "pages"
  | "seo"
  | "policies"
  | "settings"
  | "media"
  | "issues";

export type BuilderPanelState = {
  leftOpen: boolean;
  rightOpen: boolean;
  activePanel: BuilderPanelId;
  leftMode: "tree" | "panels";
};

/** Toggle a nav item: open if closed/different; close left if same tree panel already open. */
export function toggleBuilderNav(
  state: BuilderPanelState,
  next: BuilderPanelId
): BuilderPanelState {
  if (next === "issues") {
    return { ...state, rightOpen: true, activePanel: "issues" };
  }
  if (next === "sections") {
    if (state.leftOpen && state.leftMode === "tree" && state.activePanel === "sections") {
      return { ...state, leftOpen: false };
    }
    return {
      ...state,
      leftOpen: true,
      leftMode: "tree",
      activePanel: "sections",
      rightOpen: state.rightOpen || Boolean(state.activePanel),
    };
  }
  if (state.leftOpen && state.leftMode === "panels" && state.activePanel === next) {
    return { ...state, leftOpen: false };
  }
  return {
    ...state,
    leftOpen: true,
    leftMode: "panels",
    activePanel: next,
    rightOpen: true,
  };
}

export function closeLeftPanel(state: BuilderPanelState): BuilderPanelState {
  return { ...state, leftOpen: false };
}

export function closeRightPanel(state: BuilderPanelState): BuilderPanelState {
  return { ...state, rightOpen: false };
}

export function openInspectorForSection(
  state: BuilderPanelState
): BuilderPanelState {
  return {
    ...state,
    rightOpen: true,
    activePanel: "sections",
    leftMode: state.leftOpen ? state.leftMode : "tree",
  };
}

/** Grid template that releases width when panels close. */
export function builderWorkspaceGrid(state: {
  leftOpen: boolean;
  rightOpen: boolean;
  focusMode: boolean;
}): string {
  if (state.focusMode) return "minmax(0,1fr)";
  const left = state.leftOpen ? "minmax(220px,280px)" : "0px";
  const right = state.rightOpen ? "minmax(280px,340px)" : "0px";
  return `${left} minmax(0,1fr) ${right}`;
}

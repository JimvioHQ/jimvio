/**
 * Store Builder panel open/close + layout width helpers.
 * Pure functions for unit tests (no React).
 */

import {
  constrainOverlayDrawers,
  editorUsesOverlayPanels,
  type EditorBreakpoint,
} from "./editor-chrome";

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
  next: BuilderPanelId,
  editorBp: EditorBreakpoint = "desktop"
): BuilderPanelState {
  if (next === "issues") {
    const drawers = constrainOverlayDrawers({
      leftOpen: state.leftOpen,
      rightOpen: true,
      editorBp,
      prefer: "right",
    });
    return { ...state, ...drawers, activePanel: "issues" };
  }
  if (next === "sections") {
    if (state.leftOpen && state.leftMode === "tree" && state.activePanel === "sections") {
      return { ...state, leftOpen: false };
    }
    const drawers = constrainOverlayDrawers({
      leftOpen: true,
      rightOpen: state.rightOpen,
      editorBp,
      prefer: "left",
    });
    return {
      ...state,
      ...drawers,
      leftMode: "tree",
      activePanel: "sections",
    };
  }
  if (state.leftOpen && state.leftMode === "panels" && state.activePanel === next) {
    return { ...state, leftOpen: false };
  }
  const drawers = constrainOverlayDrawers({
    leftOpen: true,
    rightOpen: true,
    editorBp,
    prefer: "right",
  });
  return {
    ...state,
    ...drawers,
    leftMode: "panels",
    activePanel: next,
  };
}

export function closeLeftPanel(state: BuilderPanelState): BuilderPanelState {
  return { ...state, leftOpen: false };
}

export function closeRightPanel(state: BuilderPanelState): BuilderPanelState {
  return { ...state, rightOpen: false };
}

export function openInspectorForSection(
  state: BuilderPanelState,
  editorBp: EditorBreakpoint = "desktop"
): BuilderPanelState {
  const drawers = constrainOverlayDrawers({
    leftOpen: false,
    rightOpen: true,
    editorBp,
    prefer: "right",
  });
  return {
    ...state,
    ...drawers,
    activePanel: "sections",
    leftMode: "tree",
  };
}

/** Close both sidebars so the preview canvas uses the full workspace width. */
export function collapsePanelsForCanvas(
  state: BuilderPanelState
): BuilderPanelState {
  return { ...state, leftOpen: false, rightOpen: false };
}

/**
 * Grid template that releases width when panels close.
 * Overlay breakpoints always give the canvas a single column.
 */
export function builderWorkspaceGrid(state: {
  leftOpen: boolean;
  rightOpen: boolean;
  focusMode: boolean;
  editorBp?: EditorBreakpoint;
}): string {
  if (state.focusMode) return "minmax(0,1fr)";
  if (state.editorBp && editorUsesOverlayPanels(state.editorBp)) {
    return "minmax(0,1fr)";
  }
  const left = state.leftOpen ? "minmax(220px,260px)" : "0fr";
  const right = state.rightOpen ? "minmax(300px,340px)" : "0fr";
  return `${left} minmax(0,1fr) ${right}`;
}

export function defaultRightPanelOpen(): boolean {
  return false;
}

/** Left-rail groups for Store Builder — progressive disclosure over a flat panel list. */
export const BUILDER_NAV_GROUPS: Array<{
  id: string;
  label: string;
  items: Array<{ id: BuilderPanelId; label: string; hint?: string }>;
}> = [
  {
    id: "store",
    label: "Store",
    items: [
      { id: "settings", label: "Overview", hint: "Store identity basics" },
      { id: "media", label: "Brand", hint: "Logo & favicon" },
      { id: "theme", label: "Identity", hint: "Presets & tokens" },
    ],
  },
  {
    id: "design",
    label: "Design",
    items: [{ id: "design", label: "Colors & layout", hint: "Typography, cards, spacing" }],
  },
  {
    id: "sections",
    label: "Sections",
    items: [{ id: "sections", label: "Homepage", hint: "Add, reorder, hide" }],
  },
  {
    id: "navigation",
    label: "Navigation",
    items: [{ id: "navigation", label: "Menus", hint: "Header & footer links" }],
  },
  {
    id: "pages",
    label: "Pages",
    items: [
      { id: "pages", label: "Content pages", hint: "About, contact, custom" },
      { id: "policies", label: "Policies", hint: "Legal templates" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { id: "design", label: "Product grid", hint: "Columns & card ratio" },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    items: [{ id: "seo", label: "Search & social", hint: "Title, description, index" }],
  },
];

export type BuilderEscapeTarget =
  | "picker"
  | "more"
  | "focus"
  | "right"
  | "left"
  | "selection"
  | null;

/** Predictable Escape order: overlays → inspector → tree → selection. */
export function nextBuilderEscapeAction(state: {
  pickerOpen: boolean;
  moreOpen: boolean;
  focusMode: boolean;
  rightOpen: boolean;
  leftOpen: boolean;
  selectedId: string | null;
}): BuilderEscapeTarget {
  if (state.pickerOpen) return "picker";
  if (state.moreOpen) return "more";
  if (state.focusMode) return "focus";
  if (state.rightOpen) return "right";
  if (state.leftOpen) return "left";
  if (state.selectedId) return "selection";
  return null;
}

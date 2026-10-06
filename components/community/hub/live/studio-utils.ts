"use client";

import {
  DEFAULT_DRAWER,
  MODE_KEY,
  DRAWER_KEY,
  DRAWER_STATE_VERSION,
  VALID_LEFT_PANELS,
  VALID_RIGHT_TABS,
  type DrawerState,
  type LeftPanel,
  type RightTab,
  type StudioMode,
} from "./studio-types";

function isRightTab(v: unknown): v is RightTab {
  return typeof v === "string" && (VALID_RIGHT_TABS as readonly string[]).includes(v);
}

function isLeftPanel(v: unknown): v is LeftPanel {
  return typeof v === "string" && (VALID_LEFT_PANELS as readonly string[]).includes(v);
}

export function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function readMode(): StudioMode {
  if (typeof window === "undefined") return "creator";
  const v = window.localStorage.getItem(MODE_KEY);
  if (v === "minimal" || v === "creator" || v === "studio") return v;
  return "creator";
}

export function writeMode(mode: StudioMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function readDrawerState(): DrawerState {
  if (typeof window === "undefined") return DEFAULT_DRAWER;
  try {
    const raw = window.localStorage.getItem(DRAWER_KEY);
    if (!raw) return DEFAULT_DRAWER;
    const parsed = JSON.parse(raw) as Partial<DrawerState> & { version?: number };
    // Version mismatch or corrupt shape → safe defaults (never mount unknown tabs).
    if (parsed.version !== DRAWER_STATE_VERSION) {
      writeDrawerState(DEFAULT_DRAWER);
      return { ...DEFAULT_DRAWER };
    }
    let rightTab: RightTab =
      parsed.rightTab === "clips"
        ? "chat"
        : isRightTab(parsed.rightTab)
          ? parsed.rightTab
          : DEFAULT_DRAWER.rightTab;
    const leftPanelRaw: LeftPanel = isLeftPanel(parsed.leftPanel)
      ? parsed.leftPanel
      : DEFAULT_DRAWER.leftPanel;
    // Never restore Settings as the default landing panel.
    const leftPanel: LeftPanel =
      leftPanelRaw === "settings" ? "none" : leftPanelRaw;
    const rightWidth =
      typeof parsed.rightWidth === "number" &&
      parsed.rightWidth >= 240 &&
      parsed.rightWidth <= 560
        ? parsed.rightWidth
        : DEFAULT_DRAWER.rightWidth;
    const rightOpen = false;
    const chatScroll =
      typeof parsed.chatScroll === "number" && Number.isFinite(parsed.chatScroll)
        ? Math.max(0, parsed.chatScroll)
        : DEFAULT_DRAWER.chatScroll;
    return {
      ...DEFAULT_DRAWER,
      rightTab,
      rightOpen,
      rightWidth,
      leftPanel,
      chatScroll,
      panelScrolls: {
        ...DEFAULT_DRAWER.panelScrolls,
        ...(parsed.panelScrolls && typeof parsed.panelScrolls === "object"
          ? parsed.panelScrolls
          : {}),
      },
    };
  } catch {
    try {
      writeDrawerState(DEFAULT_DRAWER);
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_DRAWER };
  }
}

export function writeDrawerState(state: DrawerState) {
  try {
    window.localStorage.setItem(
      DRAWER_KEY,
      JSON.stringify({ ...state, version: DRAWER_STATE_VERSION })
    );
  } catch {
    /* ignore */
  }
}

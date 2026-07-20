"use client";

import {
  DEFAULT_DRAWER,
  MODE_KEY,
  DRAWER_KEY,
  type DrawerState,
  type StudioMode,
} from "./studio-types";

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
    const parsed = JSON.parse(raw) as Partial<DrawerState>;
    return {
      ...DEFAULT_DRAWER,
      ...parsed,
      panelScrolls: { ...DEFAULT_DRAWER.panelScrolls, ...parsed.panelScrolls },
    };
  } catch {
    return DEFAULT_DRAWER;
  }
}

export function writeDrawerState(state: DrawerState) {
  try {
    window.localStorage.setItem(DRAWER_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

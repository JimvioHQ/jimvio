import { create } from "zustand";
import {
  loadOsFavorites,
  loadOsMode,
  OS_NOTIFICATIONS_SCAFFOLD,
  OS_SIDEBAR_COLLAPSED_KEY,
  saveOsFavorites,
  saveOsMode,
} from "@/lib/jimvio-os/config";
import { normalizeWorkspaceMode } from "@/lib/jimvio-os/workspaces";
import type { OsNotification, OsWorkspaceMode } from "@/lib/jimvio-os/types";

export type OsPanel = "none" | "notifications" | "activity";

const OS_FRAME_SIDEBAR_COLLAPSED_KEY = "jimvio-os-frame-sidebar-collapsed-v1";

interface JimvioOsStore {
  isOpen: boolean;
  sidebarCollapsed: boolean;
  /** Collapse state for the persistent Creator OS frame sidebar (independent of the ⌘. overlay). */
  frameSidebarCollapsed: boolean;
  activePanel: OsPanel;
  workspaceMode: OsWorkspaceMode;
  favorites: string[];
  notifications: OsNotification[];
  hydrated: boolean;
  /** Global Quick Create (+) menu open state — shared between OsTopbar and the floating OsQuickCreate FAB. */
  quickCreateOpen: boolean;
  openOs: () => void;
  closeOs: () => void;
  toggleOs: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setFrameSidebarCollapsed: (collapsed: boolean) => void;
  toggleFrameSidebarCollapsed: () => void;
  setActivePanel: (panel: OsPanel) => void;
  setWorkspaceMode: (mode: OsWorkspaceMode) => void;
  toggleFavorite: (navId: string) => void;
  hydrate: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  archiveNotification: (id: string) => void;
  openQuickCreate: () => void;
  closeQuickCreate: () => void;
  toggleQuickCreate: () => void;
}

function loadSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(OS_SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function persistSidebarCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OS_SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch { /* silent */ }
}

function loadFrameSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(OS_FRAME_SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function persistFrameSidebarCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OS_FRAME_SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch { /* silent */ }
}

export const useJimvioOsStore = create<JimvioOsStore>((set, get) => ({
  isOpen: false,
  sidebarCollapsed: false,
  frameSidebarCollapsed: false,
  activePanel: "none",
  workspaceMode: "seller",
  favorites: ["home", "products", "analytics"],
  notifications: OS_NOTIFICATIONS_SCAFFOLD,
  hydrated: false,
  quickCreateOpen: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({
      favorites: loadOsFavorites(),
      workspaceMode: loadOsMode(),
      sidebarCollapsed: loadSidebarCollapsed(),
      frameSidebarCollapsed: loadFrameSidebarCollapsed(),
      hydrated: true,
    });
  },

  openOs: () => set({ isOpen: true }),
  closeOs: () => set({ isOpen: false, activePanel: "none" }),
  toggleOs: () => set((s) => ({ isOpen: !s.isOpen, activePanel: s.isOpen ? "none" : s.activePanel })),

  setSidebarCollapsed: (collapsed) => {
    persistSidebarCollapsed(collapsed);
    set({ sidebarCollapsed: collapsed });
  },

  toggleSidebarCollapsed: () => {
    const next = !get().sidebarCollapsed;
    persistSidebarCollapsed(next);
    set({ sidebarCollapsed: next });
  },

  setFrameSidebarCollapsed: (collapsed) => {
    persistFrameSidebarCollapsed(collapsed);
    set({ frameSidebarCollapsed: collapsed });
  },

  toggleFrameSidebarCollapsed: () => {
    const next = !get().frameSidebarCollapsed;
    persistFrameSidebarCollapsed(next);
    set({ frameSidebarCollapsed: next });
  },

  setActivePanel: (panel) => set({ activePanel: panel }),

  openQuickCreate: () => set({ quickCreateOpen: true }),
  closeQuickCreate: () => set({ quickCreateOpen: false }),
  toggleQuickCreate: () => set((s) => ({ quickCreateOpen: !s.quickCreateOpen })),

  setWorkspaceMode: (mode) => {
    const normalized = normalizeWorkspaceMode(mode);
    saveOsMode(normalized);
    set({ workspaceMode: normalized });
  },

  toggleFavorite: (navId) => {
    const current = get().favorites;
    const next = current.includes(navId)
      ? current.filter((id) => id !== navId)
      : [...current, navId];
    saveOsFavorites(next);
    set({ favorites: next });
  },

  markNotificationRead: (id) => {
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    });
  },

  markAllNotificationsRead: () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    });
  },

  archiveNotification: (id) => {
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, archived: true, read: true } : n,
      ),
    });
  },
}));

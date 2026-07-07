import { create } from "zustand";
import {
  loadOsFavorites,
  loadOsMode,
  OS_NOTIFICATIONS_SCAFFOLD,
  OS_SIDEBAR_COLLAPSED_KEY,
  saveOsFavorites,
  saveOsMode,
} from "@/lib/jimvio-os/config";
import type { OsNotification, OsWorkspaceMode } from "@/lib/jimvio-os/types";

export type OsPanel = "none" | "notifications" | "activity";

interface JimvioOsStore {
  isOpen: boolean;
  sidebarCollapsed: boolean;
  activePanel: OsPanel;
  workspaceMode: OsWorkspaceMode;
  favorites: string[];
  notifications: OsNotification[];
  hydrated: boolean;
  openOs: () => void;
  closeOs: () => void;
  toggleOs: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setActivePanel: (panel: OsPanel) => void;
  setWorkspaceMode: (mode: OsWorkspaceMode) => void;
  toggleFavorite: (navId: string) => void;
  hydrate: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  archiveNotification: (id: string) => void;
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

export const useJimvioOsStore = create<JimvioOsStore>((set, get) => ({
  isOpen: false,
  sidebarCollapsed: false,
  activePanel: "none",
  workspaceMode: "seller",
  favorites: ["home", "products", "analytics"],
  notifications: OS_NOTIFICATIONS_SCAFFOLD,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({
      favorites: loadOsFavorites(),
      workspaceMode: loadOsMode(),
      sidebarCollapsed: loadSidebarCollapsed(),
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

  setActivePanel: (panel) => set({ activePanel: panel }),

  setWorkspaceMode: (mode) => {
    saveOsMode(mode);
    set({ workspaceMode: mode });
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

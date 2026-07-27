"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type OwnerConsoleUiState = {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  expandedSections: string[];
  navQuery: string;
  selectedCommunityId: string | null;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarMobileOpen: (v: boolean) => void;
  toggleNavSection: (id: string) => void;
  setNavQuery: (q: string) => void;
  setSelectedCommunityId: (id: string | null) => void;
};

export const useOwnerConsoleUiStore = create<OwnerConsoleUiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      expandedSections: [
        "community",
        "content",
        "commerce",
        "engagement",
        "settings",
      ],
      navQuery: "",
      selectedCommunityId: null,
      setSidebarCollapsed(v) {
        set({ sidebarCollapsed: v });
      },
      toggleSidebarCollapsed() {
        set({ sidebarCollapsed: !get().sidebarCollapsed });
      },
      setSidebarMobileOpen(v) {
        set({ sidebarMobileOpen: v });
      },
      toggleNavSection(id) {
        const cur = get().expandedSections;
        set({
          expandedSections: cur.includes(id)
            ? cur.filter((x) => x !== id)
            : [...cur, id],
        });
      },
      setNavQuery(q) {
        set({ navQuery: q });
      },
      setSelectedCommunityId(id) {
        set({ selectedCommunityId: id });
      },
    }),
    {
      name: "jimvio-owner-console-ui-v1",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        expandedSections: s.expandedSections,
        selectedCommunityId: s.selectedCommunityId,
      }),
    }
  )
);

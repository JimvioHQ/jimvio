import { create } from "zustand";
import { loadSuperAppMode, saveSuperAppMode } from "@/lib/jimvio-super-app/config";
import type { SuperAppPanel, SuperAppWorkspaceMode, SuperAppContext } from "@/lib/jimvio-super-app/types";

interface SuperAppStore {
  activePanel: SuperAppPanel;
  workspaceMode: SuperAppWorkspaceMode;
  context: SuperAppContext;
  hydrated: boolean;
  hydrate: () => void;
  setActivePanel: (panel: SuperAppPanel) => void;
  closePanel: () => void;
  togglePanel: (panel: Exclude<SuperAppPanel, "none">) => void;
  setWorkspaceMode: (mode: SuperAppWorkspaceMode) => void;
  setContext: (context: SuperAppContext) => void;
}

export const useSuperAppStore = create<SuperAppStore>((set, get) => ({
  activePanel: "none",
  workspaceMode: "buyer",
  context: "default" as SuperAppContext,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ workspaceMode: loadSuperAppMode(), hydrated: true });
  },

  setActivePanel: (panel) => set({ activePanel: panel }),

  closePanel: () => set({ activePanel: "none" }),

  togglePanel: (panel) => {
    set({ activePanel: get().activePanel === panel ? "none" : panel });
  },

  setWorkspaceMode: (mode) => {
    saveSuperAppMode(mode);
    set({ workspaceMode: mode });
  },

  setContext: (context) => set({ context }),
}));

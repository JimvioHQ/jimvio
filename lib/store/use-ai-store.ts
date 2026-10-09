import { create } from "zustand";

export type CopilotPanelMode = "minimized" | "docked" | "expanded";

export type CopilotPageContext =
  | "home"
  | "marketplace"
  | "product"
  | "cart"
  | "checkout"
  | "communities"
  | "affiliate"
  | "seller-dashboard"
  | "general";

export type CopilotStatus = "idle" | "thinking" | "streaming" | "ready" | "offline";

interface AIStore {
  isAssistantOpen: boolean;
  panelMode: CopilotPanelMode;
  initialQuery: string;
  earnGuideToken: number;
  status: CopilotStatus;
  pageContext: CopilotPageContext;
  pathname: string;
  openAssistant: (query?: string) => void;
  openEarningGuide: () => void;
  closeAssistant: () => void;
  setPanelMode: (mode: CopilotPanelMode) => void;
  toggleMinimize: () => void;
  toggleExpand: () => void;
  setPageContext: (context: CopilotPageContext, pathname?: string) => void;
  setStatus: (status: CopilotStatus) => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  isAssistantOpen: false,
  panelMode: "docked",
  initialQuery: "",
  earnGuideToken: 0,
  status: "ready",
  pageContext: "general",
  pathname: "/",
  openAssistant: (query = "") =>
    set({
      isAssistantOpen: true,
      panelMode: get().panelMode === "minimized" ? "docked" : get().panelMode,
      initialQuery: query,
      status: "ready",
    }),
  openEarningGuide: () =>
    set({
      isAssistantOpen: true,
      panelMode: get().panelMode === "minimized" ? "docked" : get().panelMode,
      initialQuery: "",
      earnGuideToken: Date.now(),
      status: "ready",
    }),
  closeAssistant: () =>
    set({
      isAssistantOpen: false,
      initialQuery: "",
      status: "ready",
    }),
  setPanelMode: (mode) => set({ panelMode: mode }),
  toggleMinimize: () => {
    const { panelMode, isAssistantOpen } = get();
    if (!isAssistantOpen) {
      set({ isAssistantOpen: true, panelMode: "minimized" });
      return;
    }
    set({ panelMode: panelMode === "minimized" ? "docked" : "minimized" });
  },
  toggleExpand: () => {
    const { panelMode } = get();
    set({ panelMode: panelMode === "expanded" ? "docked" : "expanded" });
  },
  setPageContext: (context, pathname) =>
    set((state) => ({
      pageContext: context,
      pathname: pathname ?? state.pathname,
    })),
  setStatus: (status) => set({ status }),
}));

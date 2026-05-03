import { create } from "zustand";

interface AIStore {
  isAssistantOpen: boolean;
  initialQuery: string;
  openAssistant: (query?: string) => void;
  closeAssistant: () => void;
}

export const useAIStore = create<AIStore>((set) => ({
  isAssistantOpen: false,
  initialQuery: "",
  openAssistant: (query = "") => set({ isAssistantOpen: true, initialQuery: query }),
  closeAssistant: () => set({ isAssistantOpen: false, initialQuery: "" }),
}));

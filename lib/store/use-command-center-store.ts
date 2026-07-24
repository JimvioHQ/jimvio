import { create } from "zustand";

export type CommandCenterFilter =
  | "all"
  | "products"
  | "communities"
  | "campaigns"
  | "commands"
  | "ai"
  | "members"
  | "content";

interface CommandCenterStore {
  isOpen: boolean;
  query: string;
  filter: CommandCenterFilter;
  activeIndex: number;
  openCommandCenter: (options?: { query?: string; filter?: CommandCenterFilter }) => void;
  closeCommandCenter: () => void;
  toggleCommandCenter: () => void;
  setQuery: (query: string) => void;
  setFilter: (filter: CommandCenterFilter) => void;
  setActiveIndex: (index: number) => void;
  resetSelection: () => void;
}

export const useCommandCenterStore = create<CommandCenterStore>((set, get) => ({
  isOpen: false,
  query: "",
  filter: "all",
  activeIndex: 0,
  openCommandCenter: (options) =>
    set({
      isOpen: true,
      query: options?.query ?? "",
      filter: options?.filter ?? "all",
      activeIndex: 0,
    }),
  closeCommandCenter: () =>
    set({
      isOpen: false,
      query: "",
      filter: "all",
      activeIndex: 0,
    }),
  toggleCommandCenter: () => {
    const { isOpen } = get();
    if (isOpen) {
      set({ isOpen: false, query: "", filter: "all", activeIndex: 0 });
    } else {
      set({ isOpen: true, activeIndex: 0 });
    }
  },
  setQuery: (query) => set({ query, activeIndex: 0 }),
  setFilter: (filter) => set({ filter, activeIndex: 0 }),
  setActiveIndex: (activeIndex) => set({ activeIndex }),
  resetSelection: () => set({ activeIndex: 0 }),
}));

import { create } from "zustand";
import {
  DEFAULT_WORKSPACE_LAYOUT,
  loadWorkspaceLayout,
  saveWorkspaceLayout,
} from "@/lib/jimvio-workspace/config";
import type { WorkspaceWidgetLayout, WorkspaceWidgetSize } from "@/lib/jimvio-workspace/types";

interface WorkspaceStore {
  layout: WorkspaceWidgetLayout[];
  editMode: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setEditMode: (editMode: boolean) => void;
  toggleEditMode: () => void;
  resetLayout: () => void;
  toggleHidden: (instanceId: string) => void;
  togglePinned: (instanceId: string) => void;
  resizeWidget: (instanceId: string, colSpan: WorkspaceWidgetSize) => void;
  moveWidget: (sourceId: string, targetId: string) => void;
  reorderWidget: (instanceId: string, direction: "up" | "down") => void;
}

function sortLayout(layout: WorkspaceWidgetLayout[]): WorkspaceWidgetLayout[] {
  return [...layout].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
}

function persist(layout: WorkspaceWidgetLayout[]) {
  saveWorkspaceLayout(layout);
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  layout: DEFAULT_WORKSPACE_LAYOUT,
  editMode: false,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ layout: loadWorkspaceLayout(), hydrated: true });
  },

  setEditMode: (editMode) => set({ editMode }),

  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),

  resetLayout: () => {
    const layout = DEFAULT_WORKSPACE_LAYOUT.map((w) => ({ ...w }));
    persist(layout);
    set({ layout });
  },

  toggleHidden: (instanceId) => {
    const layout = get().layout.map((w) =>
      w.instanceId === instanceId ? { ...w, hidden: !w.hidden } : w,
    );
    persist(layout);
    set({ layout });
  },

  togglePinned: (instanceId) => {
    const layout = sortLayout(
      get().layout.map((w) =>
        w.instanceId === instanceId ? { ...w, pinned: !w.pinned } : w,
      ),
    );
    persist(layout);
    set({ layout });
  },

  resizeWidget: (instanceId, colSpan) => {
    const layout = get().layout.map((w) =>
      w.instanceId === instanceId ? { ...w, colSpan } : w,
    );
    persist(layout);
    set({ layout });
  },

  moveWidget: (sourceId, targetId) => {
    if (sourceId === targetId) return;
    const layout = [...get().layout];
    const source = layout.find((w) => w.instanceId === sourceId);
    const target = layout.find((w) => w.instanceId === targetId);
    if (!source || !target) return;

    const next = layout.map((w) => {
      if (w.instanceId === sourceId) {
        return { ...w, row: target.row, col: target.col };
      }
      if (w.instanceId === targetId) {
        return { ...w, row: source.row, col: source.col };
      }
      return w;
    });

    persist(sortLayout(next));
    set({ layout: sortLayout(next) });
  },

  reorderWidget: (instanceId, direction) => {
    const sorted = sortLayout(get().layout);
    const index = sorted.findIndex((w) => w.instanceId === instanceId);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const a = sorted[index];
    const b = sorted[swapIndex];
    const next = get().layout.map((w) => {
      if (w.instanceId === a.instanceId) return { ...w, row: b.row, col: b.col };
      if (w.instanceId === b.instanceId) return { ...w, row: a.row, col: a.col };
      return w;
    });

    persist(sortLayout(next));
    set({ layout: sortLayout(next) });
  },
}));

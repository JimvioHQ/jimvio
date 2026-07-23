"use client";

/**
 * Intelligence store — caches snapshots + dismissed automations.
 * Does not duplicate phase stores; only references derived output.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IntelligenceSnapshot } from "./types";
import {
  buildIntelligenceSnapshot,
  type IntelligenceInput,
} from "./derive";

type IntelligenceState = {
  snapshots: Record<string, IntelligenceSnapshot>;
  dismissedAutomationIds: string[];
  putSnapshot: (snapshot: IntelligenceSnapshot) => void;
  refreshFromInput: (input: IntelligenceInput) => IntelligenceSnapshot;
  dismissAutomation: (id: string) => void;
  isDismissed: (id: string) => boolean;
  getSnapshot: (communityId: string) => IntelligenceSnapshot | null;
};

export const useIntelligenceStore = create<IntelligenceState>()(
  persist(
    (set, get) => ({
      snapshots: {},
      dismissedAutomationIds: [],

      putSnapshot(snapshot) {
        set((s) => ({
          snapshots: { ...s.snapshots, [snapshot.communityId]: snapshot },
        }));
      },

      refreshFromInput(input) {
        const snapshot = buildIntelligenceSnapshot(input);
        get().putSnapshot(snapshot);
        return snapshot;
      },

      dismissAutomation(id) {
        set((s) => ({
          dismissedAutomationIds: s.dismissedAutomationIds.includes(id)
            ? s.dismissedAutomationIds
            : [...s.dismissedAutomationIds, id],
        }));
      },

      isDismissed(id) {
        return get().dismissedAutomationIds.includes(id);
      },

      getSnapshot(communityId) {
        return get().snapshots[communityId] ?? null;
      },
    }),
    {
      name: "jimvio-intelligence-v1",
      partialize: (s) => ({
        snapshots: s.snapshots,
        dismissedAutomationIds: s.dismissedAutomationIds,
      }),
    }
  )
);

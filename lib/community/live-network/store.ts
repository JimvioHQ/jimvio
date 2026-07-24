/**
 * Live session UI store — additive controls for the Live Commerce Network shell.
 * Does not replace LiveKit media plane or hub-live studio state.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LiveStudioControls, LiveStudioLayout } from "./types";
import { getLiveMediaProvider } from "./providers";

type LiveNetworkState = {
  controlsByCommunity: Record<string, LiveStudioControls>;
  stageRequests: Record<string, string[]>;
  ensureControls: (communityId: string) => LiveStudioControls;
  patchControls: (communityId: string, patch: Partial<LiveStudioControls>) => void;
  setLayout: (communityId: string, layout: LiveStudioLayout) => void;
  tickLive: (communityId: string) => void;
  addStageRequest: (communityId: string, name: string) => void;
  clearStageRequest: (communityId: string, name: string) => void;
};

export const useLiveNetworkStore = create<LiveNetworkState>()(
  persist(
    (set, get) => ({
      controlsByCommunity: {},
      stageRequests: {},
      ensureControls(communityId) {
        const existing = get().controlsByCommunity[communityId];
        if (existing) return existing;
        const next = getLiveMediaProvider().getStudioDefaults();
        set((s) => ({
          controlsByCommunity: {
            ...s.controlsByCommunity,
            [communityId]: next,
          },
        }));
        return next;
      },
      patchControls(communityId, patch) {
        const current =
          get().controlsByCommunity[communityId] ??
          getLiveMediaProvider().getStudioDefaults();
        set((s) => ({
          controlsByCommunity: {
            ...s.controlsByCommunity,
            [communityId]: { ...current, ...patch },
          },
        }));
      },
      setLayout(communityId, layout) {
        get().patchControls(communityId, { layout });
      },
      tickLive(communityId) {
        const current =
          get().controlsByCommunity[communityId] ??
          getLiveMediaProvider().getStudioDefaults();
        set((s) => ({
          controlsByCommunity: {
            ...s.controlsByCommunity,
            [communityId]: {
              ...current,
              liveSeconds: current.liveSeconds + 1,
            },
          },
        }));
      },
      addStageRequest(communityId, name) {
        set((s) => {
          const list = s.stageRequests[communityId] ?? [];
          if (list.includes(name)) return s;
          return {
            stageRequests: {
              ...s.stageRequests,
              [communityId]: [...list, name],
            },
          };
        });
      },
      clearStageRequest(communityId, name) {
        set((s) => ({
          stageRequests: {
            ...s.stageRequests,
            [communityId]: (s.stageRequests[communityId] ?? []).filter(
              (n) => n !== name
            ),
          },
        }));
      },
    }),
    {
      name: "jimvio-live-network-v1",
      partialize: (s) => ({
        controlsByCommunity: s.controlsByCommunity,
        stageRequests: s.stageRequests,
      }),
    }
  )
);

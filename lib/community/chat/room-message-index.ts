"use client";

/**
 * Shared room message index — synced from useChatRoom so Channel tabs
 * (Files / Media / Pinned) reuse the live message store without duplicate fetches.
 */

import { create } from "zustand";
import type { Msg } from "@/types";
import {
  extractFileItems,
  extractMediaItems,
  extractPinned,
  extractThreads,
} from "@/lib/community/chat/message-experience";

type RoomSlice = {
  messages: Msg[];
  updatedAt: number;
};

type RoomMessageIndex = {
  byRoom: Record<string, RoomSlice>;
  sync: (roomId: string, messages: Msg[]) => void;
  clear: (roomId: string) => void;
  get: (roomId: string) => Msg[];
};

export const useRoomMessageIndex = create<RoomMessageIndex>((set, get) => ({
  byRoom: {},
  sync(roomId, messages) {
    if (!roomId) return;
    set((state) => ({
      byRoom: {
        ...state.byRoom,
        [roomId]: { messages, updatedAt: Date.now() },
      },
    }));
  },
  clear(roomId) {
    set((state) => {
      const next = { ...state.byRoom };
      delete next[roomId];
      return { byRoom: next };
    });
  },
  get(roomId) {
    return get().byRoom[roomId]?.messages ?? [];
  },
}));

export function selectPinned(roomId: string): Msg[] {
  return extractPinned(useRoomMessageIndex.getState().get(roomId));
}

export function selectFiles(roomId: string) {
  return extractFileItems(useRoomMessageIndex.getState().get(roomId));
}

export function selectMedia(roomId: string) {
  return extractMediaItems(useRoomMessageIndex.getState().get(roomId));
}

export function selectThreads(roomId: string): Msg[] {
  return extractThreads(useRoomMessageIndex.getState().get(roomId));
}

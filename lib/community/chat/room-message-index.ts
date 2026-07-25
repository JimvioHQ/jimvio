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
  /** Cross-tab request: Threads panel → ChatRoom openThread */
  openThreadRequest: string | null;
  convertThreadRequest: string | null;
  /** Channel / Space header search → ChatRoom MessageSearchBar */
  searchRequestAt: number | null;
  /** Space header call buttons → ChatRoom WebRTC */
  callRequest: { type: "audio" | "video"; at: number } | null;
  requestOpenThread: (messageId: string) => void;
  requestConvertThread: (messageId: string) => void;
  requestSearch: () => void;
  requestCall: (type: "audio" | "video") => void;
  clearOpenThreadRequest: () => void;
  clearConvertThreadRequest: () => void;
  clearSearchRequest: () => void;
  clearCallRequest: () => void;
};

export const useRoomMessageIndex = create<RoomMessageIndex>((set, get) => ({
  byRoom: {},
  openThreadRequest: null,
  convertThreadRequest: null,
  searchRequestAt: null,
  callRequest: null,
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
  requestOpenThread(messageId) {
    set({ openThreadRequest: messageId });
  },
  requestConvertThread(messageId) {
    set({ convertThreadRequest: messageId });
  },
  requestSearch() {
    set({ searchRequestAt: Date.now() });
  },
  requestCall(type) {
    set({ callRequest: { type, at: Date.now() } });
  },
  clearOpenThreadRequest() {
    set({ openThreadRequest: null });
  },
  clearConvertThreadRequest() {
    set({ convertThreadRequest: null });
  },
  clearSearchRequest() {
    set({ searchRequestAt: null });
  },
  clearCallRequest() {
    set({ callRequest: null });
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

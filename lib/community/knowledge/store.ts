"use client";

/**
 * Collaboration overlay store — knowledge cards, answer picks, thread meta, file meta.
 * References message IDs from useRoomMessageIndex; does NOT duplicate the message store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnswerMark,
  AnswerPick,
  FileAssetMeta,
  FileCategory,
  KnowledgeCard,
  KnowledgeKind,
  ThreadMeta,
} from "./types";
import { knowledgeFromMessage, knowledgeFromThread } from "./derive";
import type { Msg } from "@/types";

type CollaborationState = {
  cards: KnowledgeCard[];
  answers: AnswerMark[];
  threads: ThreadMeta[];
  files: FileAssetMeta[];
  addCard: (card: KnowledgeCard) => void;
  removeCard: (id: string) => void;
  convertMessage: (args: {
    message: Msg;
    roomId: string;
    kind: KnowledgeKind;
    userId: string | null;
    userName: string | null;
    communityId?: string | null;
    title?: string;
  }) => KnowledgeCard;
  convertThread: (args: {
    root: Msg;
    replies: Msg[];
    roomId: string;
    kind: KnowledgeKind;
    userId: string | null;
    userName: string | null;
    communityId?: string | null;
    title?: string;
  }) => KnowledgeCard;
  markAnswer: (args: {
    messageId: string;
    roomId: string;
    pick: AnswerPick;
    markedBy: string | null;
  }) => void;
  clearAnswer: (messageId: string) => void;
  upsertThreadMeta: (
    threadId: string,
    roomId: string,
    patch: Partial<Omit<ThreadMeta, "threadId" | "roomId">>
  ) => void;
  upsertFileMeta: (
    key: string,
    roomId: string,
    messageId: string,
    url: string,
    patch: Partial<
      Pick<
        FileAssetMeta,
        | "description"
        | "category"
        | "tags"
        | "relatedCourseIds"
        | "relatedProductIds"
        | "relatedEventIds"
      >
    >
  ) => void;
  cardsForRoom: (roomId: string) => KnowledgeCard[];
  answersForRoom: (roomId: string) => AnswerMark[];
  threadsForRoom: (roomId: string) => ThreadMeta[];
  getAnswer: (messageId: string) => AnswerMark | undefined;
  getThreadMeta: (threadId: string) => ThreadMeta | undefined;
  getFileMeta: (key: string) => FileAssetMeta | undefined;
};

export const useCollaborationStore = create<CollaborationState>()(
  persist(
    (set, get) => ({
      cards: [],
      answers: [],
      threads: [],
      files: [],

      addCard(card) {
        set((s) => ({ cards: [card, ...s.cards] }));
      },

      removeCard(id) {
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
      },

      convertMessage({ message, roomId, kind, userId, userName, communityId, title }) {
        const card = knowledgeFromMessage(message, roomId, kind, {
          title,
          createdBy: userId,
          createdByName: userName,
          communityId,
        });
        get().addCard(card);
        return card;
      },

      convertThread({
        root,
        replies,
        roomId,
        kind,
        userId,
        userName,
        communityId,
        title,
      }) {
        const card = knowledgeFromThread(root, replies, roomId, kind, {
          title,
          createdBy: userId,
          createdByName: userName,
          communityId,
        });
        get().addCard(card);
        return card;
      },

      markAnswer({ messageId, roomId, pick, markedBy }) {
        const mark: AnswerMark = {
          messageId,
          roomId,
          pick,
          markedAt: new Date().toISOString(),
          markedBy,
        };
        set((s) => ({
          answers: [...s.answers.filter((a) => a.messageId !== messageId), mark],
        }));
      },

      clearAnswer(messageId) {
        set((s) => ({
          answers: s.answers.filter((a) => a.messageId !== messageId),
        }));
      },

      upsertThreadMeta(threadId, roomId, patch) {
        const now = new Date().toISOString();
        set((s) => {
          const existing = s.threads.find((t) => t.threadId === threadId);
          const next: ThreadMeta = {
            threadId,
            roomId,
            solved: existing?.solved ?? false,
            featured: existing?.featured ?? false,
            pinned: existing?.pinned ?? false,
            verifiedAnswerId: existing?.verifiedAnswerId ?? null,
            summary: existing?.summary ?? null,
            updatedAt: now,
            ...patch,
          };
          return {
            threads: [
              ...s.threads.filter((t) => t.threadId !== threadId),
              next,
            ],
          };
        });
      },

      upsertFileMeta(key, roomId, messageId, url, patch) {
        const now = new Date().toISOString();
        set((s) => {
          const existing = s.files.find((f) => f.key === key);
          const next: FileAssetMeta = {
            key,
            roomId,
            messageId,
            url,
            description: existing?.description ?? "",
            category: (existing?.category ?? "general") as FileCategory,
            tags: existing?.tags ?? [],
            relatedCourseIds: existing?.relatedCourseIds ?? [],
            relatedProductIds: existing?.relatedProductIds ?? [],
            relatedEventIds: existing?.relatedEventIds ?? [],
            updatedAt: now,
            ...patch,
          };
          return {
            files: [...s.files.filter((f) => f.key !== key), next],
          };
        });
      },

      cardsForRoom(roomId) {
        return get().cards.filter((c) => c.roomId === roomId);
      },
      answersForRoom(roomId) {
        return get().answers.filter((a) => a.roomId === roomId);
      },
      threadsForRoom(roomId) {
        return get().threads.filter((t) => t.roomId === roomId);
      },
      getAnswer(messageId) {
        return get().answers.find((a) => a.messageId === messageId);
      },
      getThreadMeta(threadId) {
        return get().threads.find((t) => t.threadId === threadId);
      },
      getFileMeta(key) {
        return get().files.find((f) => f.key === key);
      },
    }),
    {
      name: "jimvio-collaboration-knowledge-v1",
      partialize: (s) => ({
        cards: s.cards,
        answers: s.answers,
        threads: s.threads,
        files: s.files,
      }),
    }
  )
);

"use client";

/**
 * Live Collaboration store — whiteboard, notes, reactions, polls, Q&A, recordings.
 * Does not own LiveKit media or ChatRoom message transport.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  LiveCreatorToolsState,
  LiveKnowledgeCapture,
  LivePoll,
  LiveQaItem,
  LiveReaction,
  LiveRecordingMeta,
  LiveRoomType,
  LiveSharedNotes,
  ScreenShareQuality,
  ScreenShareTarget,
  WhiteboardStroke,
  WhiteboardTool,
} from "./types";
import { defaultInviteLink } from "./helpers";

type LiveCollabState = {
  roomTypeBySession: Record<string, LiveRoomType>;
  presenterMode: boolean;
  shareTarget: ScreenShareTarget;
  shareQuality: ScreenShareQuality;
  whiteboardTool: WhiteboardTool;
  strokesBySession: Record<string, WhiteboardStroke[]>;
  notesBySession: Record<string, LiveSharedNotes>;
  reactions: LiveReaction[];
  handRaisedUserIds: string[];
  pollsBySession: Record<string, LivePoll[]>;
  qaBySession: Record<string, LiveQaItem[]>;
  recordingsBySession: Record<string, LiveRecordingMeta[]>;
  knowledgeBySession: Record<string, LiveKnowledgeCapture>;
  toolsBySession: Record<string, LiveCreatorToolsState>;

  setRoomType: (sessionId: string, type: LiveRoomType) => void;
  setPresenterMode: (on: boolean) => void;
  setSharePrefs: (target: ScreenShareTarget, quality: ScreenShareQuality) => void;
  setWhiteboardTool: (tool: WhiteboardTool) => void;
  addStroke: (sessionId: string, stroke: WhiteboardStroke) => void;
  clearWhiteboard: (sessionId: string) => void;
  updateNotes: (args: {
    sessionId: string;
    body: string;
    authorId: string | null;
    authorName: string | null;
  }) => void;
  addReaction: (reaction: LiveReaction) => void;
  toggleHand: (userId: string) => void;
  addPoll: (poll: LivePoll) => void;
  votePoll: (sessionId: string, pollId: string, optionId: string) => void;
  addQa: (item: LiveQaItem) => void;
  upvoteQa: (sessionId: string, id: string) => void;
  answerQa: (sessionId: string, id: string) => void;
  upsertRecording: (meta: LiveRecordingMeta) => void;
  addBookmark: (sessionId: string, recordingId: string, label: string, atSec: number) => void;
  updateKnowledge: (
    sessionId: string,
    patch: Partial<Omit<LiveKnowledgeCapture, "sessionId">>
  ) => void;
  ensureTools: (sessionId: string) => LiveCreatorToolsState;
  setWaitingRoom: (sessionId: string, enabled: boolean) => void;
  addCohost: (sessionId: string, userId: string) => void;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useLiveCollabStore = create<LiveCollabState>()(
  persist(
    (set, get) => ({
      roomTypeBySession: {},
      presenterMode: false,
      shareTarget: "entire_screen",
      shareQuality: "high",
      whiteboardTool: "draw",
      strokesBySession: {},
      notesBySession: {},
      reactions: [],
      handRaisedUserIds: [],
      pollsBySession: {},
      qaBySession: {},
      recordingsBySession: {},
      knowledgeBySession: {},
      toolsBySession: {},

      setRoomType(sessionId, type) {
        set((s) => ({
          roomTypeBySession: { ...s.roomTypeBySession, [sessionId]: type },
        }));
      },

      setPresenterMode(on) {
        set({ presenterMode: on });
      },

      setSharePrefs(target, quality) {
        set({ shareTarget: target, shareQuality: quality });
      },

      setWhiteboardTool(tool) {
        set({ whiteboardTool: tool });
      },

      addStroke(sessionId, stroke) {
        set((s) => ({
          strokesBySession: {
            ...s.strokesBySession,
            [sessionId]: [...(s.strokesBySession[sessionId] ?? []), stroke],
          },
        }));
      },

      clearWhiteboard(sessionId) {
        set((s) => ({
          strokesBySession: { ...s.strokesBySession, [sessionId]: [] },
        }));
      },

      updateNotes({ sessionId, body, authorId, authorName }) {
        const prev = get().notesBySession[sessionId];
        const version = {
          id: uid("ver"),
          body,
          authorId,
          authorName,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          notesBySession: {
            ...s.notesBySession,
            [sessionId]: {
              sessionId,
              body,
              versions: [...(prev?.versions ?? []).slice(-19), version],
              updatedAt: version.createdAt,
            },
          },
        }));
      },

      addReaction(reaction) {
        set((s) => ({
          reactions: [...s.reactions.slice(-80), reaction],
        }));
      },

      toggleHand(userId) {
        set((s) => ({
          handRaisedUserIds: s.handRaisedUserIds.includes(userId)
            ? s.handRaisedUserIds.filter((id) => id !== userId)
            : [...s.handRaisedUserIds, userId],
        }));
      },

      addPoll(poll) {
        set((s) => ({
          pollsBySession: {
            ...s.pollsBySession,
            [poll.sessionId]: [poll, ...(s.pollsBySession[poll.sessionId] ?? [])],
          },
        }));
      },

      votePoll(sessionId, pollId, optionId) {
        set((s) => ({
          pollsBySession: {
            ...s.pollsBySession,
            [sessionId]: (s.pollsBySession[sessionId] ?? []).map((p) =>
              p.id !== pollId
                ? p
                : {
                    ...p,
                    options: p.options.map((o) =>
                      o.id === optionId ? { ...o, votes: o.votes + 1 } : o
                    ),
                  }
            ),
          },
        }));
      },

      addQa(item) {
        set((s) => ({
          qaBySession: {
            ...s.qaBySession,
            [item.sessionId]: [item, ...(s.qaBySession[item.sessionId] ?? [])],
          },
        }));
      },

      upvoteQa(sessionId, id) {
        set((s) => ({
          qaBySession: {
            ...s.qaBySession,
            [sessionId]: (s.qaBySession[sessionId] ?? []).map((q) =>
              q.id === id ? { ...q, upvotes: q.upvotes + 1 } : q
            ),
          },
        }));
      },

      answerQa(sessionId, id) {
        set((s) => ({
          qaBySession: {
            ...s.qaBySession,
            [sessionId]: (s.qaBySession[sessionId] ?? []).map((q) =>
              q.id === id ? { ...q, answered: true } : q
            ),
          },
        }));
      },

      upsertRecording(meta) {
        set((s) => {
          const list = s.recordingsBySession[meta.sessionId] ?? [];
          const idx = list.findIndex((r) => r.id === meta.id);
          const next =
            idx >= 0
              ? list.map((r, i) => (i === idx ? meta : r))
              : [meta, ...list];
          return {
            recordingsBySession: {
              ...s.recordingsBySession,
              [meta.sessionId]: next,
            },
          };
        });
      },

      addBookmark(sessionId, recordingId, label, atSec) {
        set((s) => ({
          recordingsBySession: {
            ...s.recordingsBySession,
            [sessionId]: (s.recordingsBySession[sessionId] ?? []).map((r) =>
              r.id !== recordingId
                ? r
                : {
                    ...r,
                    bookmarks: [
                      ...r.bookmarks,
                      { id: uid("bm"), label, atSec },
                    ],
                  }
            ),
          },
        }));
      },

      updateKnowledge(sessionId, patch) {
        const prev = get().knowledgeBySession[sessionId] ?? {
          sessionId,
          summary: "",
          keyDecisions: [],
          actionItems: [],
          resources: [],
          knowledgeCardIds: [],
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          knowledgeBySession: {
            ...s.knowledgeBySession,
            [sessionId]: {
              ...prev,
              ...patch,
              sessionId,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },

      ensureTools(sessionId) {
        const existing = get().toolsBySession[sessionId];
        if (existing) return existing;
        const tools: LiveCreatorToolsState = {
          sessionId,
          cohostIds: [],
          moderatorIds: [],
          guestSpeakerIds: [],
          waitingRoomEnabled: false,
          waitingUserIds: [],
          inviteLink: defaultInviteLink(sessionId),
        };
        set((s) => ({
          toolsBySession: { ...s.toolsBySession, [sessionId]: tools },
        }));
        return tools;
      },

      setWaitingRoom(sessionId, enabled) {
        get().ensureTools(sessionId);
        set((s) => ({
          toolsBySession: {
            ...s.toolsBySession,
            [sessionId]: {
              ...s.toolsBySession[sessionId]!,
              waitingRoomEnabled: enabled,
            },
          },
        }));
      },

      addCohost(sessionId, userId) {
        get().ensureTools(sessionId);
        set((s) => {
          const t = s.toolsBySession[sessionId]!;
          if (t.cohostIds.includes(userId)) return s;
          return {
            toolsBySession: {
              ...s.toolsBySession,
              [sessionId]: {
                ...t,
                cohostIds: [...t.cohostIds, userId],
              },
            },
          };
        });
      },
    }),
    {
      name: "jimvio-live-collab-v1",
      partialize: (s) => ({
        roomTypeBySession: s.roomTypeBySession,
        strokesBySession: s.strokesBySession,
        notesBySession: s.notesBySession,
        pollsBySession: s.pollsBySession,
        qaBySession: s.qaBySession,
        recordingsBySession: s.recordingsBySession,
        knowledgeBySession: s.knowledgeBySession,
        toolsBySession: s.toolsBySession,
        shareTarget: s.shareTarget,
        shareQuality: s.shareQuality,
      }),
    }
  )
);

export function createStroke(args: {
  tool: WhiteboardTool;
  color: string;
  points: { x: number; y: number }[];
  text?: string;
  authorId: string | null;
  authorName: string | null;
}): WhiteboardStroke {
  return {
    id: uid("stroke"),
    tool: args.tool,
    color: args.color,
    points: args.points,
    text: args.text,
    authorId: args.authorId,
    authorName: args.authorName,
    createdAt: new Date().toISOString(),
  };
}

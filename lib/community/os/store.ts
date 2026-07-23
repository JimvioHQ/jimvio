"use client";

/**
 * Creator OS store — tasks & events (collaboration objects).
 * References message IDs; does not duplicate chat message store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Msg } from "@/types";
import type {
  CollaborationEvent,
  CollaborationTask,
  TaskPriority,
  TaskStatus,
} from "./types";

type CreatorOSState = {
  tasks: CollaborationTask[];
  events: CollaborationEvent[];
  addTask: (task: CollaborationTask) => void;
  updateTask: (
    id: string,
    patch: Partial<
      Pick<
        CollaborationTask,
        "status" | "priority" | "assigneeId" | "assigneeName" | "dueDate" | "title" | "body"
      >
    >
  ) => void;
  removeTask: (id: string) => void;
  convertMessageToTask: (args: {
    message: Msg;
    roomId: string;
    communityId?: string | null;
    groupId?: string | null;
    userId: string | null;
    title?: string;
    priority?: TaskPriority;
    dueDate?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
  }) => CollaborationTask;
  addEvent: (event: CollaborationEvent) => void;
  toggleRsvp: (eventId: string, userId: string) => void;
  tasksForRoom: (roomId: string) => CollaborationTask[];
  tasksForCommunity: (communityId: string) => CollaborationTask[];
  eventsForRoom: (roomId: string) => CollaborationEvent[];
  eventsForCommunity: (communityId: string) => CollaborationEvent[];
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useCreatorOSStore = create<CreatorOSState>()(
  persist(
    (set, get) => ({
      tasks: [],
      events: [],

      addTask(task) {
        set((s) => ({ tasks: [task, ...s.tasks] }));
      },

      updateTask(id, patch) {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, ...patch, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      removeTask(id) {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      convertMessageToTask({
        message,
        roomId,
        communityId,
        groupId,
        userId,
        title,
        priority,
        dueDate,
        assigneeId,
        assigneeName,
      }) {
        const now = new Date().toISOString();
        const task: CollaborationTask = {
          id: uid("task"),
          communityId: communityId ?? null,
          roomId,
          groupId: groupId ?? null,
          title:
            title?.trim() ||
            (message.body || "").trim().split("\n")[0]?.slice(0, 80) ||
            "Untitled task",
          body: (message.body || "").trim(),
          status: assigneeId ? "assigned" : "todo",
          priority: priority ?? "medium",
          assigneeId: assigneeId ?? null,
          assigneeName: assigneeName ?? null,
          dueDate: dueDate ?? null,
          sourceMessageId: message.id,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        };
        get().addTask(task);
        return task;
      },

      addEvent(event) {
        set((s) => ({ events: [event, ...s.events] }));
      },

      toggleRsvp(eventId, userId) {
        set((s) => ({
          events: s.events.map((e) => {
            if (e.id !== eventId) return e;
            const has = e.rsvpUserIds.includes(userId);
            const rsvpUserIds = has
              ? e.rsvpUserIds.filter((id) => id !== userId)
              : [...e.rsvpUserIds, userId];
            return {
              ...e,
              rsvpUserIds,
              rsvpCount: rsvpUserIds.length,
            };
          }),
        }));
      },

      tasksForRoom(roomId) {
        return get().tasks.filter((t) => t.roomId === roomId);
      },
      tasksForCommunity(communityId) {
        return get().tasks.filter((t) => t.communityId === communityId);
      },
      eventsForRoom(roomId) {
        return get().events.filter((e) => e.roomId === roomId);
      },
      eventsForCommunity(communityId) {
        return get().events.filter((e) => e.communityId === communityId);
      },
    }),
    {
      name: "jimvio-creator-os-v1",
      partialize: (s) => ({ tasks: s.tasks, events: s.events }),
    }
  )
);

export function createEventFromDraft(args: {
  title: string;
  description?: string;
  startsAt: string;
  communityId?: string | null;
  roomId?: string | null;
  groupId?: string | null;
  speakers?: string[];
  createdBy?: string | null;
}): CollaborationEvent {
  const now = new Date().toISOString();
  return {
    id: uid("evt"),
    communityId: args.communityId ?? null,
    roomId: args.roomId ?? null,
    groupId: args.groupId ?? null,
    title: args.title,
    description: args.description ?? "",
    startsAt: args.startsAt,
    endsAt: null,
    location: null,
    speakers: args.speakers ?? [],
    rsvpCount: 0,
    rsvpUserIds: [],
    recordingUrl: null,
    sourceMessageId: null,
    createdBy: args.createdBy ?? null,
    createdAt: now,
  };
}

export type { TaskStatus, TaskPriority };

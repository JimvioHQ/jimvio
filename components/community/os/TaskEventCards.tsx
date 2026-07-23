"use client";

import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  User,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollaborationEvent, CollaborationTask, TaskStatus } from "@/lib/community/os";
import { useCreatorOSStore } from "@/lib/community/os";

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  completed: "Completed",
  assigned: "Assigned",
};

export function TaskCard({
  task,
  canManage,
  onJump,
}: {
  task: CollaborationTask;
  canManage?: boolean;
  onJump?: (messageId: string) => void;
}) {
  const updateTask = useCreatorOSStore((s) => s.updateTask);

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
        "transition-shadow hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={
            task.status === "completed" ? "Mark incomplete" : "Mark complete"
          }
          disabled={!canManage}
          onClick={() =>
            updateTask(task.id, {
              status: task.status === "completed" ? "todo" : "completed",
            })
          }
          className="mt-0.5 text-[var(--color-accent)] disabled:opacity-40"
        >
          {task.status === "completed" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-sm font-semibold text-[var(--color-text-primary)]",
              task.status === "completed" && "line-through opacity-60"
            )}
          >
            {task.title}
          </h3>
          {task.body && (
            <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">
              {task.body}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            <span className="rounded-sm bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[var(--color-text-muted)]">
              {STATUS_LABEL[task.status]}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5",
                task.priority === "urgent" || task.priority === "high"
                  ? "bg-red-500/10 text-red-600"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
              )}
            >
              <Flag className="h-3 w-3" />
              {task.priority}
            </span>
            {task.assigneeName && (
              <span className="inline-flex items-center gap-0.5 text-[var(--color-text-muted)]">
                <User className="h-3 w-3" />
                {task.assigneeName}
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-0.5 text-[var(--color-text-muted)]">
                <Clock className="h-3 w-3" />
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
          </div>
          {canManage && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(["todo", "in_progress", "assigned", "completed"] as TaskStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateTask(task.id, { status: st })}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize",
                      task.status === st
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                    )}
                  >
                    {STATUS_LABEL[st]}
                  </button>
                )
              )}
            </div>
          )}
          {task.sourceMessageId && onJump && (
            <button
              type="button"
              onClick={() => onJump(task.sourceMessageId!)}
              className="mt-2 text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              Jump to source
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function EventCard({
  event,
  userId,
  canManage,
}: {
  event: CollaborationEvent;
  userId?: string | null;
  canManage?: boolean;
}) {
  const toggleRsvp = useCreatorOSStore((s) => s.toggleRsvp);
  const going = userId ? event.rsvpUserIds.includes(userId) : false;

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {event.title}
          </h3>
          {event.description && (
            <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">
              {event.description}
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">
            {format(new Date(event.startsAt), "EEE, MMM d · HH:mm")}
          </p>
          {event.speakers.length > 0 && (
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              Speakers: {event.speakers.join(", ")}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {userId && (
              <button
                type="button"
                onClick={() => toggleRsvp(event.id, userId)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                  going
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
                )}
              >
                {going ? "Going ✓" : "RSVP"}
              </button>
            )}
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {event.rsvpCount} RSVP{event.rsvpCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-muted)] opacity-70">
              <Video className="h-3 w-3" />
              Recording placeholder
            </span>
            {canManage && (
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Reminder · Calendar ready
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

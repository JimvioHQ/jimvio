"use client";

import { useState } from "react";
import { CheckSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Msg } from "@/types";
import {
  TASK_PRIORITIES,
  useCreatorOSStore,
  type TaskPriority,
} from "@/lib/community/os";
import { toast } from "sonner";

export function ConvertToTaskDialog({
  open,
  onClose,
  message,
  roomId,
  communityId,
  groupId,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  message: Msg | null;
  roomId: string;
  communityId?: string | null;
  groupId?: string | null;
  userId: string | null;
}) {
  const convert = useCreatorOSStore((s) => s.convertMessageToTask);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || !message) return null;

  function save() {
    if (!message) return;
    setSaving(true);
    try {
      convert({
        message,
        roomId,
        communityId,
        groupId,
        userId,
        title: title || undefined,
        priority,
        dueDate: dueDate || null,
      });
      toast.success("Task created from message");
      onClose();
      setTitle("");
      setDueDate("");
      setPriority("medium");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Convert to task"
      className="fixed inset-0 z-[10070] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-xl border border-[var(--color-border)]",
          "bg-[var(--color-surface)] p-4 shadow-xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-[var(--color-accent)]" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Convert to Task
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Collaboration object with status, assignee, and due date
            </p>
          </div>
        </div>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Auto from message…"
          className={cn(
            "mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
            "px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
            "text-[var(--color-text-primary)]"
          )}
        />

        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Priority
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {TASK_PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize",
                priority === p
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Due date
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={cn(
            "mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
            "px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
          )}
        />

        <p className="mt-3 line-clamp-3 rounded-md bg-[var(--color-surface-secondary)] p-2 text-[12px] text-[var(--color-text-secondary)]">
          {(message.body || "").trim() || "(attachment)"}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-white",
              "bg-[var(--color-accent)] disabled:opacity-50"
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create task
          </button>
        </div>
      </div>
    </div>
  );
}

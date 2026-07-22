"use client";

import { useState } from "react";
import { BookMarked, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Msg } from "@/types";
import {
  KNOWLEDGE_KINDS,
  KNOWLEDGE_KIND_LABELS,
  useCollaborationStore,
  type KnowledgeKind,
} from "@/lib/community/knowledge";
import { toast } from "sonner";

const CONVERT_KINDS: KnowledgeKind[] = [
  "guide",
  "faq",
  "course_note",
  "resource",
  "knowledge_card",
  "tutorial",
  "best_practice",
];

export function ConvertToKnowledgeDialog({
  open,
  onClose,
  message,
  threadReplies,
  roomId,
  communityId,
  userId,
  userName,
  mode = "message",
}: {
  open: boolean;
  onClose: () => void;
  message: Msg | null;
  threadReplies?: Msg[];
  roomId: string;
  communityId?: string | null;
  userId: string | null;
  userName: string | null;
  mode?: "message" | "thread" | "discussion";
}) {
  const convertMessage = useCollaborationStore((s) => s.convertMessage);
  const convertThread = useCollaborationStore((s) => s.convertThread);
  const [kind, setKind] = useState<KnowledgeKind>("guide");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || !message) return null;

  async function save() {
    if (!message) return;
    setSaving(true);
    try {
      if (mode === "thread" && threadReplies) {
        convertThread({
          root: message,
          replies: threadReplies,
          roomId,
          kind,
          userId,
          userName,
          communityId,
          title: title || undefined,
        });
      } else {
        convertMessage({
          message,
          roomId,
          kind,
          userId,
          userName,
          communityId,
          title: title || undefined,
        });
      }
      toast.success(`Saved as ${KNOWLEDGE_KIND_LABELS[kind]}`);
      onClose();
      setTitle("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Convert to knowledge"
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
          <BookMarked className="h-5 w-5 text-[var(--color-accent)]" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Convert to Knowledge
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Preserve this {mode} as lasting community value
            </p>
          </div>
        </div>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Type
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CONVERT_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                kind === k
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
              )}
            >
              {KNOWLEDGE_KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Title (optional)
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
            onClick={() => void save()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-white",
              "bg-[var(--color-accent)] disabled:opacity-50"
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save to Knowledge
          </button>
        </div>

        {/* Keep kinds list referenced for tree-shake safety in smoke tests */}
        <span className="sr-only">{KNOWLEDGE_KINDS.join(",")}</span>
      </div>
    </div>
  );
}

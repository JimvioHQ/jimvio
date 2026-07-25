"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  FileQuestion,
  Languages,
  Loader2,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Msg } from "@/types";
import { displayName } from "@/lib/community/chat/message-experience";

export type MessageAiAction =
  | "summarize"
  | "explain"
  | "translate"
  | "rewrite"
  | "faq"
  | "course_notes"
  | "knowledge";

const ACTIONS: {
  id: MessageAiAction;
  label: string;
  icon: typeof Sparkles;
  hint: string;
}[] = [
  {
    id: "summarize",
    label: "Summarize",
    icon: Sparkles,
    hint: "Summarize this message in 2–3 bullets.",
  },
  {
    id: "explain",
    label: "Explain",
    icon: BookOpen,
    hint: "Explain this message clearly for a new community member.",
  },
  {
    id: "translate",
    label: "Translate",
    icon: Languages,
    hint: "Translate this message to clear English (keep meaning).",
  },
  {
    id: "rewrite",
    label: "Rewrite",
    icon: PenLine,
    hint: "Rewrite this message more clearly and professionally.",
  },
  {
    id: "faq",
    label: "Turn into FAQ",
    icon: FileQuestion,
    hint: "Turn this into a short FAQ entry (Q + A).",
  },
  {
    id: "course_notes",
    label: "Course Notes",
    icon: BookOpen,
    hint: "Turn this into concise course notes with headings.",
  },
  {
    id: "knowledge",
    label: "Save to Knowledge",
    icon: Sparkles,
    hint: "Extract a knowledge card title + 3 key points from this message.",
  },
];

export function MessageAiPanel({
  open,
  onClose,
  message,
  communityId,
}: {
  open: boolean;
  onClose: () => void;
  message: Msg | null;
  communityId?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<MessageAiAction | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<MessageAiAction | null>(null);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setError(null);
      setActive(null);
      setLoading(false);
      setLastAction(null);
    }
  }, [open]);

  const run = useCallback(
    async (action: MessageAiAction) => {
      if (!message || loading) return;
      if (!communityId) {
        setError("Open a community to use Community Brain.");
        return;
      }
      const meta = ACTIONS.find((a) => a.id === action);
      if (!meta) return;
      setActive(action);
      setLastAction(action);
      setLoading(true);
      setError(null);
      setResult(null);

      const body = (message.body || "").trim() || "(attachment-only message)";
      const prompt = `${meta.hint}\n\nUse community knowledge when helpful. If facts are missing, say unavailable.\n\nMessage from ${displayName(message)}:\n${body.slice(0, 1200)}`;

      try {
        const res = await fetch("/api/c/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            mode:
              action === "summarize"
                ? "summarize"
                : action === "faq"
                  ? "faq"
                  : "ask",
            communityId,
            focus: `Message focus:\n${body.slice(0, 800)}`,
          }),
        });
        const json = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) {
          setError(json.error ?? "AI request failed");
          return;
        }
        setResult(json.text ?? "");
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [message, loading, communityId]
  );

  if (!open || !message) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Message AI"
      className={cn(
        "fixed inset-y-0 right-0 z-[10060] flex w-full max-w-md flex-col",
        "border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            AI on message
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Collaboration intelligence
          </p>
        </div>
        <button
          type="button"
          aria-label="Close AI panel"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-border)] p-3">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          const isActive = active === a.id;
          return (
            <button
              key={a.id}
              type="button"
              disabled={loading}
              onClick={() => void run(a.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                isActive
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                "disabled:opacity-50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {a.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </div>
        )}
        {error && (
          <div className="space-y-1">
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </p>
            {lastAction && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void run(lastAction)}
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {result && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">
            {result}
          </div>
        )}
        {!loading && !result && !error && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Choose an action. Answers stay grounded in community knowledge you can access.
          </p>
        )}
      </div>
    </div>
  );
}

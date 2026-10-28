"use client";

import { useState } from "react";
import { Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import type { PostAssistAction } from "@/lib/ai/post-assist";

/**
 * Inline AI writer for the post composer. Drafts from a short idea, or
 * improves / shortens what the member already wrote. The member reviews the
 * suggestion and chooses to use it — nothing is posted automatically.
 */
export function PostAiAssist({
  body,
  communityName,
  onUse,
  onClose,
}: {
  body: string;
  communityName?: string | null;
  onUse: (text: string) => void;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState<PostAssistAction | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [last, setLast] = useState<PostAssistAction | null>(null);
  const hasText = body.trim().length > 0;

  async function run(action: PostAssistAction) {
    setBusy(action);
    setError("");
    setLast(action);
    try {
      const res = await fetch("/api/ai/post-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: body, topic, communityName }),
      });
      const json = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || !json.text) {
        setError(json.error || "AI Assist could not answer — please try again");
        return;
      }
      setResult(json.text);
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition disabled:opacity-50";

  return (
    <div className="rounded-2xl border border-[#fd5000]/25 bg-[#fd5000]/[0.04] p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-text-primary)]">
          <Sparkles className="h-4 w-4 text-[#fd5000]" /> AI Assist
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI Assist"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, 500))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy && (topic.trim() || hasText)) {
              e.preventDefault();
              void run("draft");
            }
          }}
          placeholder="What is your post about? e.g. my weekly trading recap"
          className="min-h-10 flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/30"
        />
        <button
          type="button"
          disabled={Boolean(busy) || !(topic.trim() || hasText)}
          onClick={() => void run("draft")}
          className={`${btn} bg-[#fd5000] text-white hover:bg-[#e04800]`}
        >
          {busy === "draft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Write draft
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy) || !hasText}
          onClick={() => void run("improve")}
          className={`${btn} border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]`}
          title={hasText ? undefined : "Write something first"}
        >
          {busy === "improve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Improve my text
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || !hasText}
          onClick={() => void run("shorten")}
          className={`${btn} border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]`}
          title={hasText ? undefined : "Write something first"}
        >
          {busy === "shorten" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Make it shorter
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[12px] font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--color-text-primary)]">{result}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onUse(result);
                setResult("");
              }}
              className={`${btn} bg-[var(--color-text-primary)] text-[var(--color-surface)]`}
            >
              Use this
            </button>
            {last ? (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run(last)}
                className={`${btn} border border-[var(--color-border)] text-[var(--color-text-secondary)]`}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Try again
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">AI can make mistakes — check before posting.</p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AiMode = "ask" | "summarize" | "suggest" | "draft" | "faq";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  fallback?: boolean;
};

const MODES: { id: AiMode; label: string }[] = [
  { id: "ask", label: "Ask" },
  { id: "summarize", label: "Summarize" },
  { id: "suggest", label: "Suggest" },
  { id: "draft", label: "Draft" },
  { id: "faq", label: "FAQ" },
];

const STARTERS: { mode: AiMode; label: string; prompt: string }[] = [
  {
    mode: "ask",
    label: "Find resources",
    prompt: "What resources, files, or guides are available that I should know about?",
  },
  {
    mode: "ask",
    label: "Find knowledge",
    prompt: "What knowledge articles or pinned answers are available?",
  },
  {
    mode: "summarize",
    label: "Summarize courses",
    prompt: "Summarize the accessible courses and their lesson outlines.",
  },
  {
    mode: "draft",
    label: "Announcement draft",
    prompt: "Draft a short community announcement based on recent accessible activity.",
  },
  {
    mode: "draft",
    label: "Discussion starter",
    prompt: "Draft a discussion starter that fits this community’s recent topics.",
  },
  {
    mode: "faq",
    label: "FAQ answers",
    prompt: "Generate FAQ answers from community rules, knowledge, and pinned posts.",
  },
];

export function CommunityAiPanel({
  open,
  onClose,
  communityId,
  initialPrompt,
}: {
  open: boolean;
  onClose: () => void;
  communityId?: string | null;
  initialPrompt?: string;
}) {
  const [mode, setMode] = useState<AiMode>("ask");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open || !initialPrompt || seededRef.current) return;
    seededRef.current = true;
    setInput(initialPrompt);
  }, [open, initialPrompt]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (override?: string, overrideMode?: AiMode) => {
      const prompt = (override ?? input).trim();
      if (!prompt || loading) return;

      if (!communityId) {
        setError("Open a community to use Community Brain.");
        return;
      }

      const activeMode = overrideMode ?? mode;
      setError(null);
      setInput("");
      setLastPrompt(prompt);
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        text: prompt,
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await fetch("/api/c/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            mode: activeMode,
            communityId,
          }),
        });
        const json = (await res.json()) as {
          text?: string;
          error?: string;
          fallback?: boolean;
        };
        if (!res.ok) {
          setError(json.error ?? "Something went wrong");
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: json.text ?? "",
            fallback: json.fallback,
          },
        ]);
      } catch {
        setError("Network error — try again");
      } finally {
        setLoading(false);
      }
    },
    [communityId, input, loading, mode]
  );

  if (!open) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[70] flex w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-xl border border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] shadow-xl sm:bottom-6 sm:right-6">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-gradient-to-r from-[#fd5000]/10 to-transparent px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fd5000]/15 text-[#fd5000]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Community Brain</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Answers from your community knowledge
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI panel"
          className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-2 py-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
              mode === m.id
                ? "bg-[#fd5000]/15 text-[#fd5000]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div ref={listRef} className="max-h-[280px] min-h-[140px] space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Bot className="h-8 w-8 text-[#fd5000]/40" />
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {communityId
                ? "Ask about posts, courses, resources, knowledge, rules, and announcements — only content you can access."
                : "Open a community workspace to unlock Community Brain."}
            </p>
            {communityId && (
              <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                {STARTERS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setMode(s.mode);
                      void send(s.prompt, s.mode);
                    }}
                    className="rounded-md bg-[var(--color-surface-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "rounded-lg px-2.5 py-2 text-[12px] leading-relaxed whitespace-pre-wrap",
              m.role === "user"
                ? "ml-6 bg-[#fd5000] text-white"
                : "mr-4 bg-[var(--color-surface-secondary,#f4f4f5)] text-[var(--color-text-primary)]"
            )}
          >
            {m.text}
            {m.fallback && (
              <span className="mt-1 block text-[10px] opacity-70">Offline fallback</span>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#fd5000]" />
            Thinking…
          </div>
        )}
        {error && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-red-500">{error}</p>
            {lastPrompt && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void send(lastPrompt)}
                className="text-[11px] font-semibold text-[#fd5000] hover:underline disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-[var(--color-border)] p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "summarize"
              ? "What should I summarize?"
              : mode === "suggest"
                ? "What kind of ideas?"
                : mode === "draft"
                  ? "Announcement or discussion starter…"
                  : mode === "faq"
                    ? "FAQ topic…"
                    : "Ask your community…"
          }
          disabled={loading || !communityId}
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[#fd5000]/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || !communityId}
          className="shrink-0 rounded-lg bg-[#fd5000] px-3 py-2 text-[12px] font-bold text-white transition hover:bg-[#e04800] disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

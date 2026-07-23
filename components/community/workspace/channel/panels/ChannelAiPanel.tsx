"use client";

import { useCallback, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import { useCollaborationStore } from "@/lib/community/knowledge";

const PROMPTS = [
  {
    id: "summarize",
    label: "Summarize discussions",
    prompt: "Summarize the most important themes and open questions in this channel.",
  },
  {
    id: "resources",
    label: "Recommend resources",
    prompt: "Recommend the best resources, files, and links members should revisit from this channel.",
  },
  {
    id: "related",
    label: "Related knowledge",
    prompt: "Suggest related knowledge cards, FAQs, and guides connected to recent discussion.",
  },
  {
    id: "answers",
    label: "Find previous answers",
    prompt: "Find previous answers and solved threads that address recurring questions here.",
  },
  {
    id: "mentors",
    label: "Suggest mentors",
    prompt: "Suggest which members or creators would be good mentors based on helpful contributions.",
  },
  {
    id: "faq",
    label: "Suggest FAQs",
    prompt: "Suggest 5 FAQ entries we should capture as knowledge from recent discussion.",
  },
  {
    id: "commerce",
    label: "Recommend products",
    prompt: "Recommend products, courses, or services that would help members based on this channel.",
  },
  {
    id: "affiliates",
    label: "Affiliate opportunities",
    prompt: "Suggest affiliate offers or marketplace items worth sharing in this community.",
  },
  {
    id: "bookings",
    label: "Suggest bookings",
    prompt: "Suggest mentorship, consulting, or coaching sessions that fit the topics discussed.",
  },
] as const;

/** Channel-level AI — reuses /api/c/ai, no duplicate AI stack. */
export function ChannelAiPanel({
  roomId,
  communityId,
  channelName,
}: {
  roomId?: string;
  communityId?: string | null;
  channelName?: string;
}) {
  const messages = useRoomMessageIndex((s) =>
    roomId ? (s.byRoom[roomId]?.messages ?? []) : []
  );
  const cards = useCollaborationStore((s) =>
    roomId ? s.cards.filter((c) => c.roomId === roomId) : []
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const run = useCallback(
    async (id: string, prompt: string) => {
      setActive(id);
      setLoading(true);
      setError(null);
      setResult(null);

      const sample = messages
        .slice(-12)
        .map((m) => `- ${(m.body || "").slice(0, 120)}`)
        .join("\n");
      const knowledge = cards
        .slice(0, 6)
        .map((c) => `- [${c.kind}] ${c.title}`)
        .join("\n");

      const full = [
        prompt,
        channelName ? `Channel: #${channelName}` : "",
        sample ? `\nRecent messages:\n${sample}` : "",
        knowledge ? `\nExisting knowledge:\n${knowledge}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const res = await fetch("/api/c/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: full.slice(0, 2000),
            mode: id === "summarize" ? "summarize" : "suggest",
            ...(communityId ? { communityId } : {}),
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
    [messages, cards, channelName, communityId]
  );

  if (!roomId) {
    return (
      <ChannelEmptyState
        icon={Bot}
        title="Channel AI"
        description="Warm Discussion first so AI can use live collaboration context."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--color-border)] px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
          <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
          Channel AI
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Turn conversation into searchable, reusable knowledge
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROMPTS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={loading}
              onClick={() => void run(p.id, p.prompt)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                active === p.id
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]",
                "disabled:opacity-50"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </p>
        )}
        {error && (
          <p className="text-sm text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">
            {result}
          </div>
        )}
        {!loading && !result && !error && (
          <ChannelEmptyState
            icon={Bot}
            title="Ask the channel"
            description="Summarize themes, draft FAQs, or spot knowledge gaps — grounded in this channel’s live messages."
            className="py-8"
          />
        )}
      </div>
    </div>
  );
}

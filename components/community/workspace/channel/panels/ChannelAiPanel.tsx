"use client";

import { useCallback, useMemo, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import { useCollaborationStore } from "@/lib/community/knowledge";
import {
  buildIntelligenceSnapshot,
  formatIntelligenceContext,
} from "@/lib/community/intelligence";
import { useCreatorOSStore } from "@/lib/community/os";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import { RecommendationRail } from "@/components/community/intelligence";

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
  {
    id: "intelligence",
    label: "Platform intelligence",
    prompt:
      "Using the intelligence snapshot, recommend communities, groups, courses, products, events, lives, and creators members should engage with next.",
  },
  {
    id: "automate",
    label: "Suggest automations",
    prompt:
      "Suggest FAQs, knowledge cards, guides, learning paths, tasks, events, and community improvements to automate.",
  },
  {
    id: "moderation",
    label: "Moderation insights",
    prompt:
      "Flag potential moderation needs and trust improvements based on discussion tone and unanswered questions.",
  },
  {
    id: "learning",
    label: "Learning path",
    prompt:
      "Propose a short learning path from this channel’s knowledge and courses.",
  },
] as const;

/** Channel-level AI — reuses /api/c/ai + Intelligence Platform snapshot. */
export function ChannelAiPanel({
  roomId,
  communityId,
  channelName,
}: {
  roomId?: string;
  communityId?: string | null;
  channelName?: string;
}) {
  const messages = useRoomMessageIndex(
    useShallow((s) => (roomId ? (s.byRoom[roomId]?.messages ?? []) : []))
  );
  const cards = useCollaborationStore(
    useShallow((s) =>
      roomId ? s.cards.filter((c) => c.roomId === roomId) : []
    )
  );
  const tasks = useCreatorOSStore(
    useShallow((s) =>
      communityId ? s.tasks.filter((t) => t.communityId === communityId) : []
    )
  );
  const events = useCreatorOSStore(
    useShallow((s) =>
      communityId ? s.events.filter((e) => e.communityId === communityId) : []
    )
  );
  const commerceItems = useCreatorCommerceStore(
    useShallow((s) =>
      communityId ? s.itemsForCommunity(communityId) : []
    )
  );
  const localRecs = useMemo(() => {
    if (!communityId) return [];
    return buildIntelligenceSnapshot({
      communityId,
      messages,
      knowledgeCards: cards,
      tasks,
      events,
      commerceItems,
    }).recommendations.slice(0, 4);
  }, [communityId, messages, cards, tasks, events, commerceItems]);
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
      const intel =
        communityId
          ? formatIntelligenceContext(
              buildIntelligenceSnapshot({
                communityId,
                messages,
                knowledgeCards: cards,
                tasks,
                events,
                commerceItems,
              })
            )
          : "";

      const full = [
        prompt,
        channelName ? `Channel: #${channelName}` : "",
        sample ? `\nRecent messages:\n${sample}` : "",
        knowledge ? `\nExisting knowledge:\n${knowledge}` : "",
        intel ? `\n${intel}` : "",
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
    [messages, cards, channelName, communityId, tasks, events, commerceItems]
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
          Channel Intelligence
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          AI connected to messages, knowledge, commerce, and creator OS — not a
          separate chatbot.
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
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {localRecs.length > 0 && !result && !loading && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Local recommendations
            </p>
            <RecommendationRail recommendations={localRecs} />
          </div>
        )}
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
        {!loading && !result && !error && localRecs.length === 0 && (
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

"use client";

import { useCallback, useMemo, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
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

const EMPTY_AI_LIST: never[] = Object.freeze([]) as unknown as never[];

const PROMPTS = [
  {
    id: "summarize",
    mode: "summarize" as const,
    label: "Summarize discussions",
    prompt: "Summarize the most important themes and open questions in this channel.",
  },
  {
    id: "resources",
    mode: "ask" as const,
    label: "Find resources",
    prompt: "Find resources, files, and links members should use from this community.",
  },
  {
    id: "knowledge",
    mode: "ask" as const,
    label: "Find knowledge",
    prompt: "Find knowledge articles, FAQs, and pinned answers related to this channel.",
  },
  {
    id: "answers",
    mode: "ask" as const,
    label: "Find previous answers",
    prompt: "Find previous answers and solved threads that address recurring questions here.",
  },
  {
    id: "mentors",
    mode: "suggest" as const,
    label: "Suggest mentors",
    prompt: "Suggest which members or creators would be good mentors based on helpful contributions in accessible context only.",
  },
  {
    id: "courses",
    mode: "summarize" as const,
    label: "Summarize courses",
    prompt: "Summarize accessible courses and lesson outlines relevant here.",
  },
  {
    id: "draft",
    mode: "draft" as const,
    label: "Discussion starter",
    prompt: "Draft a discussion starter grounded in this channel’s accessible context.",
  },
  {
    id: "announce",
    mode: "draft" as const,
    label: "Announcement draft",
    prompt: "Draft a short announcement based on accessible community activity.",
  },
  {
    id: "faq",
    mode: "faq" as const,
    label: "FAQ answers",
    prompt: "Suggest FAQ entries answered only from accessible community knowledge.",
  },
  {
    id: "commerce",
    mode: "suggest" as const,
    label: "Recommend products",
    prompt: "Recommend products, courses, or services that would help members based on accessible community context only. If none exist, say unavailable.",
  },
  {
    id: "learning",
    mode: "suggest" as const,
    label: "Learning path",
    prompt: "Suggest a short learning path from accessible courses and resources.",
  },
  {
    id: "intelligence",
    mode: "suggest" as const,
    label: "Platform intelligence",
    prompt:
      "Using accessible community context, recommend groups, courses, resources, and knowledge members should engage with next. If unavailable, say so.",
  },
] as const;

/** Channel-level AI — reuses /api/c/ai + permission-filtered Community Brain. */
export function ChannelAiPanel({
  roomId,
  communityId,
  channelName,
}: {
  roomId?: string;
  communityId?: string | null;
  channelName?: string;
}) {
  // Select stable store slices, then derive — never allocate (`[]` / `.filter()`)
  // inside Zustand selectors (forceStoreRerender → React #185).
  const messagesRaw = useRoomMessageIndex((s) =>
    roomId ? s.byRoom[roomId]?.messages : undefined
  );
  const allCards = useCollaborationStore((s) => s.cards);
  const allTasks = useCreatorOSStore((s) => s.tasks);
  const allEvents = useCreatorOSStore((s) => s.events);
  const communityItemsRaw = useCreatorCommerceStore((s) => s.communityItems);

  const messages = useMemo(
    () => messagesRaw ?? EMPTY_AI_LIST,
    [messagesRaw]
  );
  const cards = useMemo(
    () => (roomId ? allCards.filter((c) => c.roomId === roomId) : EMPTY_AI_LIST),
    [allCards, roomId]
  );
  const tasks = useMemo(
    () =>
      communityId
        ? allTasks.filter((t) => t.communityId === communityId)
        : EMPTY_AI_LIST,
    [allTasks, communityId]
  );
  const events = useMemo(
    () =>
      communityId
        ? allEvents.filter((e) => e.communityId === communityId)
        : EMPTY_AI_LIST,
    [allEvents, communityId]
  );
  const commerceItems = useMemo(
    () =>
      communityId
        ? communityItemsRaw.filter((i) => i.communityId === communityId)
        : EMPTY_AI_LIST,
    [communityId, communityItemsRaw]
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
  const [lastRun, setLastRun] = useState<{
    id: string;
    prompt: string;
    mode: "ask" | "summarize" | "suggest" | "draft" | "faq";
  } | null>(null);

  const run = useCallback(
    async (
      id: string,
      prompt: string,
      mode: "ask" | "summarize" | "suggest" | "draft" | "faq"
    ) => {
      if (!communityId) {
        setError("Community context required");
        return;
      }
      setActive(id);
      setLoading(true);
      setError(null);
      setResult(null);
      setLastRun({ id, prompt, mode });

      // Lightweight untrusted focus only — authoritative facts come from the server brain.
      const sample = messages
        .slice(-8)
        .map((m) => `- ${(m.body || "").slice(0, 100)}`)
        .join("\n");
      const knowledge = cards
        .slice(0, 4)
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
            ).slice(0, 800)
          : "";

      const focus = [
        channelName ? `Channel: #${channelName}` : "",
        sample ? `Recent messages:\n${sample}` : "",
        knowledge ? `Local knowledge cards:\n${knowledge}` : "",
        intel ? intel : "",
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 1200);

      try {
        const res = await fetch("/api/c/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            mode,
            communityId,
            ...(roomId ? { roomId } : {}),
            ...(focus ? { focus } : {}),
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
    [messages, cards, channelName, communityId, roomId, tasks, events, commerceItems]
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
          Community Brain
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Permission-aware answers from this community — not a standalone chatbot.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROMPTS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={loading || !communityId}
              onClick={() => void run(p.id, p.prompt, p.mode)}
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
          <div className="space-y-1">
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </p>
            {lastRun && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void run(lastRun.id, lastRun.prompt, lastRun.mode)}
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
        {!loading && !result && !error && localRecs.length === 0 && (
          <ChannelEmptyState
            icon={Bot}
            title="Ask the community"
            description="Summarize discussions, find resources and knowledge, draft announcements, or build FAQs — grounded in content you can access."
            className="py-8"
          />
        )}
      </div>
    </div>
  );
}

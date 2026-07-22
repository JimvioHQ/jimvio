"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import {
  KNOWLEDGE_KIND_LABELS,
  organizeKnowledgeBuckets,
  searchKnowledge,
  useCollaborationStore,
  type KnowledgeKind,
} from "@/lib/community/knowledge";
import { KnowledgeCardView } from "@/components/community/knowledge/KnowledgeCardView";
import { ChannelEmptyState } from "../ChannelEmptyState";

type BucketKey =
  | "faqs"
  | "tutorials"
  | "guides"
  | "bestPractices"
  | "pinnedCollections"
  | "learningPaths"
  | "importantDiscussions"
  | "collections"
  | "cards"
  | "answered"
  | "all"
  | "discovery";

const FILTERS: { id: BucketKey; label: string }[] = [
  { id: "discovery", label: "Discover" },
  { id: "all", label: "All saved" },
  { id: "faqs", label: "FAQs" },
  { id: "tutorials", label: "Tutorials" },
  { id: "guides", label: "Guides" },
  { id: "bestPractices", label: "Best Practices" },
  { id: "pinnedCollections", label: "Pinned" },
  { id: "learningPaths", label: "Learning Paths" },
  { id: "importantDiscussions", label: "Discussions" },
  { id: "answered", label: "Best Answers" },
  { id: "cards", label: "Cards" },
];

export function KnowledgePanel({ roomId }: { roomId?: string }) {
  const messages = useRoomMessageIndex((s) =>
    roomId ? (s.byRoom[roomId]?.messages ?? []) : []
  );
  const cards = useCollaborationStore((s) => s.cards);
  const answers = useCollaborationStore((s) => s.answers);
  const threads = useCollaborationStore((s) => s.threads);
  const [filter, setFilter] = useState<BucketKey>("discovery");
  const [query, setQuery] = useState("");

  const buckets = useMemo(() => {
    if (!roomId) return null;
    return organizeKnowledgeBuckets(roomId, messages, cards, answers, threads);
  }, [roomId, messages, cards, answers, threads]);

  const roomCards = useMemo(
    () => (roomId ? cards.filter((c) => c.roomId === roomId) : []),
    [cards, roomId]
  );

  const list = useMemo(() => {
    if (!buckets || !roomId) return [];
    if (filter === "all") return searchKnowledge(roomCards, query);
    if (filter === "discovery") {
      const trending = [
        ...buckets.answered.slice(0, 3),
        ...buckets.guides.slice(0, 3),
        ...buckets.importantDiscussions.slice(0, 3),
        ...buckets.faqs.slice(0, 2),
        ...roomCards.filter((c) => c.featured).slice(0, 3),
      ];
      const seen = new Set<string>();
      return trending.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
    }
    return searchKnowledge(buckets[filter] ?? [], query);
  }, [buckets, filter, query, roomCards, roomId]);

  if (!roomId) {
    return (
      <ChannelEmptyState
        icon={BookOpen}
        title="Knowledge"
        description="FAQs, guides, course notes, and best answers preserved from conversation."
      />
    );
  }

  const empty =
    roomCards.length === 0 &&
    (buckets?.answered.length ?? 0) === 0 &&
    (buckets?.importantDiscussions.length ?? 0) === 0 &&
    (buckets?.pinnedCollections.length ?? 0) === 0;

  if (empty && filter !== "discovery") {
    return (
      <ChannelEmptyState
        icon={BookOpen}
        title="No knowledge yet"
        description="Moderators can convert messages and threads into Guides, FAQs, Course Notes, and Knowledge Cards."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 border-b border-[var(--color-border)] px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search knowledge…"
            aria-label="Search knowledge"
            className={cn(
              "w-full rounded-lg border-0 bg-[var(--color-surface-secondary)] py-2 pl-10 pr-3 text-sm outline-none",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
              "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            )}
          />
        </div>
        <div
          role="tablist"
          aria-label="Knowledge categories"
          className="flex gap-1 overflow-x-auto scrollbar-hide"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold",
                filter === f.id
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {filter === "discovery" && (
          <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold text-[var(--color-text-muted)]">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            Trending knowledge · popular threads · best answers · updated guides
          </div>
        )}

        {list.length === 0 ? (
          <ChannelEmptyState
            icon={BookOpen}
            title="Nothing here yet"
            description="Convert a message or thread into knowledge to populate this collection."
            className="py-10"
          />
        ) : (
          <ul className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
            {list.map((card) => (
              <li key={card.id}>
                <KnowledgeCardView
                  card={card}
                  onJump={(id) => {
                    if (!id) return;
                    document.getElementById(`msg-${id}`)?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        <p className="sr-only">
          {(Object.keys(KNOWLEDGE_KIND_LABELS) as KnowledgeKind[]).join(",")}
        </p>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import {
  BookOpen,
  Calendar,
  MessageSquare,
  Pin,
  Sparkles,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import {
  extractPinned,
  displayName,
} from "@/lib/community/chat/message-experience";
import {
  organizeKnowledgeBuckets,
  popularThreads,
  recentDiscussions,
  topContributors,
  useCollaborationStore,
} from "@/lib/community/knowledge";
import { KnowledgeCardView } from "@/components/community/knowledge/KnowledgeCardView";
import { ChannelEmptyState } from "../ChannelEmptyState";
import type { WorkspaceChannel } from "@/lib/community/workspace";

function Section({
  title,
  icon: Icon,
  children,
  empty,
}: {
  title: string;
  icon: typeof BookOpen;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Channel Home — overview of discussions, knowledge, pins, contributors. */
export function HomePanel({
  roomId,
  channel,
  onOpenTab,
}: {
  roomId?: string;
  channel: WorkspaceChannel;
  onOpenTab?: (tab: string) => void;
}) {
  const messages = useRoomMessageIndex(
    useShallow((s) => (roomId ? (s.byRoom[roomId]?.messages ?? []) : []))
  );
  const cards = useCollaborationStore(
    useShallow((s) => (roomId ? s.cards.filter((c) => c.roomId === roomId) : []))
  );
  const answers = useCollaborationStore(
    useShallow((s) =>
      roomId ? s.answers.filter((a) => a.roomId === roomId) : []
    )
  );
  const threads = useCollaborationStore(
    useShallow((s) =>
      roomId ? s.threads.filter((t) => t.roomId === roomId) : []
    )
  );

  if (!roomId) {
    return (
      <ChannelEmptyState
        icon={Sparkles}
        title="Channel Home"
        description="Open Discussion once to warm the collaboration index, then return for an overview."
      />
    );
  }

  const buckets = organizeKnowledgeBuckets(
    roomId,
    messages,
    cards,
    answers,
    threads
  );
  const recent = recentDiscussions(messages, 5);
  const featured = [...buckets.guides, ...buckets.faqs, ...cards]
    .slice(0, 4);
  const pinned = extractPinned(messages).slice(0, 4);
  const contributors = topContributors(messages, 5);
  const trending = popularThreads(messages, 4);

  const hasAny =
    recent.length > 0 ||
    featured.length > 0 ||
    pinned.length > 0 ||
    contributors.length > 0;

  if (!hasAny && messages.length === 0) {
    return (
      <ChannelEmptyState
        icon={Sparkles}
        title={`Welcome to #${channel.name}`}
        description="Start a discussion to grow knowledge, threads, and reusable resources for this channel."
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            #{channel.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {channel.description ||
              "Collaboration overview — discussions become lasting knowledge."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["discussion", "Discuss"],
                ["knowledge", "Knowledge"],
                ["threads", "Threads"],
                ["files", "Files"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpenTab?.(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-semibold",
                  "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-text-primary)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <Section
          title="Recent discussions"
          icon={MessageSquare}
          empty={recent.length === 0}
        >
          <ul className="space-y-2">
            {recent.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
              >
                <p className="text-[12px] font-semibold text-[var(--color-accent)]">
                  {displayName(m)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-[var(--color-text-primary)]">
                  {m.body?.trim() || "(attachment)"}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  {formatDistanceToNow(new Date(m.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Featured knowledge"
          icon={BookOpen}
          empty={featured.length === 0}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {featured.map((c) => (
              <KnowledgeCardView key={c.id} card={c} compact />
            ))}
          </div>
        </Section>

        <Section
          title="Pinned resources"
          icon={Pin}
          empty={pinned.length === 0}
        >
          <ul className="space-y-2">
            {pinned.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-2 rounded-md border border-[var(--color-border)] px-3 py-2"
              >
                <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm text-[var(--color-text-primary)]">
                    {m.body?.trim() || "(attachment)"}
                  </p>
                  <a
                    href={`#msg-${m.id}`}
                    className="mt-1 inline-block text-[12px] font-semibold text-[var(--color-accent)]"
                  >
                    Jump
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Popular threads"
          icon={MessageSquare}
          empty={trending.length === 0}
        >
          <ul className="space-y-2">
            {trending.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <span className="font-semibold text-[var(--color-accent)]">
                  {m.reply_count ?? 0} replies
                </span>
                <span className="text-[var(--color-text-muted)]"> · </span>
                <span className="text-[var(--color-text-primary)]">
                  {(m.body || "").slice(0, 80)}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Top contributors"
          icon={Users}
          empty={contributors.length === 0}
        >
          <ul className="flex flex-wrap gap-3">
            {contributors.map((c) => (
              <li key={c.userId} className="flex items-center gap-2">
                <div className="relative h-8 w-8 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                  {c.avatar ? (
                    <Image
                      src={c.avatar}
                      alt=""
                      width={32}
                      height={32}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-[var(--color-accent)]">
                      {c.name[0]}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                    {c.name}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    {c.count} messages
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Upcoming events" icon={Calendar}>
          <p className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-sm text-[var(--color-text-muted)]">
            Channel events will appear here. Create tasks or events linked to
            this space to populate the calendar.
          </p>
        </Section>
      </div>
    </div>
  );
}

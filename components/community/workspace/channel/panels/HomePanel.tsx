"use client";

import Image from "next/image";
import {
  BookOpen,
  FileText,
  FolderOpen,
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
  extractFileItems,
  displayName,
} from "@/lib/community/chat/message-experience";
import {
  organizeKnowledgeBuckets,
  useCollaborationStore,
} from "@/lib/community/knowledge";
import { KnowledgeCardView } from "@/components/community/knowledge/KnowledgeCardView";
import { ChannelEmptyState } from "../ChannelEmptyState";
import type { ChannelTabId, WorkspaceChannel } from "@/lib/community/workspace";
import type { ChannelMemberRow } from "./MembersPanel";

function Section({
  title,
  children,
  action,
  empty,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h3>
        {action}
      </div>
      {empty ? (
        <div className="rounded-2xl bg-[var(--color-surface-secondary)]/50 px-5 py-6 ring-1 ring-[var(--color-border)]/50">
          <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            {emptyTitle}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            {emptyDescription}
          </p>
          {emptyActionLabel && onEmptyAction ? (
            <button
              type="button"
              onClick={onEmptyAction}
              className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90"
            >
              {emptyActionLabel}
            </button>
          ) : null}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/**
 * Channel Overview — landing surface before Discussion (ChatRoom).
 */
export function HomePanel({
  roomId,
  channel,
  members = [],
  onOpenTab,
}: {
  roomId?: string;
  channel: WorkspaceChannel;
  members?: ChannelMemberRow[];
  onOpenTab?: (tab: ChannelTabId | string) => void;
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

  const pinned = extractPinned(messages).slice(0, 4);
  const buckets = roomId
    ? organizeKnowledgeBuckets(roomId, messages, cards, answers, threads)
    : null;
  const knowledge = [
    ...(buckets?.guides ?? []),
    ...(buckets?.faqs ?? []),
    ...cards,
  ].slice(0, 4);
  const fileItems = extractFileItems(messages).slice(0, 4);
  const previewMembers = members.slice(0, 6);

  const about =
    channel.description?.trim() ||
    `A ${channel.type} channel for focused collaboration in this group.`;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
        <header className="space-y-4">
          <div className="flex items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[26px] ring-1 ring-[var(--color-accent)]/15"
              aria-hidden
            >
              {channel.icon ?? "💬"}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
                Channel overview
              </p>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[24px]">
                {channel.name}
              </h2>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                {about}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["discussion", "Open discussion", MessageSquare],
                ["pinned", "Pinned", Pin],
                ["knowledge", "Knowledge", BookOpen],
                ["files", "Files", FolderOpen],
                ["members", "Members", Users],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpenTab?.(id)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold",
                  id === "discussion"
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </header>

        <Section title="About">
          <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            {about}
          </p>
          <p className="mt-2 text-[12px] capitalize text-[var(--color-text-muted)]">
            Type · {channel.type.replace(/_/g, " ")}
            {channel.isLocked ? " · Locked" : ""}
          </p>
        </Section>

        <Section
          title="Pinned"
          empty={pinned.length === 0}
          emptyTitle="No pins yet"
          emptyDescription="Pin important messages so members find them instantly."
          emptyActionLabel="Open discussion"
          onEmptyAction={() => onOpenTab?.("discussion")}
          action={
            pinned.length > 0 ? (
              <button
                type="button"
                onClick={() => onOpenTab?.("pinned")}
                className="text-[12px] font-medium text-[var(--color-accent)] hover:underline"
              >
                View all
              </button>
            ) : null
          }
        >
          <ul className="space-y-2">
            {pinned.map((m) => (
              <li
                key={m.id}
                className="rounded-xl bg-[var(--color-surface-secondary)]/70 px-4 py-3"
              >
                <p className="line-clamp-2 text-[13px] text-[var(--color-text-primary)]">
                  {m.body?.trim() || "(attachment)"}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  {displayName(m)} ·{" "}
                  {formatDistanceToNow(new Date(m.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Resources & Knowledge"
          empty={knowledge.length === 0}
          emptyTitle="No knowledge yet"
          emptyDescription="Convert great answers into guides and FAQs for this channel."
          emptyActionLabel="Browse knowledge"
          onEmptyAction={() => onOpenTab?.("knowledge")}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {knowledge.map((c) => (
              <KnowledgeCardView key={c.id} card={c} compact />
            ))}
          </div>
        </Section>

        <Section
          title="Files"
          empty={fileItems.length === 0}
          emptyTitle="No files yet"
          emptyDescription="Upload your first resource — docs, decks, and shared assets appear here."
          emptyActionLabel="Open files"
          onEmptyAction={() => onOpenTab?.("files")}
        >
          <ul className="space-y-2">
            {fileItems.map((f) => (
              <li
                key={`${f.message.id}-${f.attachment.url}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--color-surface-secondary)]/70"
              >
                <FileText className="h-4 w-4 text-[var(--color-accent)]" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                    {f.attachment.name || "Attachment"}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {displayName(f.message)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Members"
          empty={previewMembers.length === 0}
          emptyTitle="Members will appear here"
          emptyDescription="People active in this community show up once the roster loads."
          emptyActionLabel="View members"
          onEmptyAction={() => onOpenTab?.("members")}
          action={
            previewMembers.length > 0 ? (
              <button
                type="button"
                onClick={() => onOpenTab?.("members")}
                className="text-[12px] font-medium text-[var(--color-accent)] hover:underline"
              >
                Directory
              </button>
            ) : null
          }
        >
          <ul className="flex flex-wrap gap-3">
            {previewMembers.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                  {m.avatarUrl ? (
                    <Image
                      src={m.avatarUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-[var(--color-accent)]">
                      {(m.name || "?").charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {m.name}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <section className="rounded-3xl bg-[var(--color-surface-secondary)]/50 px-6 py-8 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-[var(--color-accent)]" />
          <h3 className="mt-3 text-[16px] font-semibold text-[var(--color-text-primary)]">
            Ready to discuss?
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            Discussion opens the live conversation — same ChatRoom and message
            engine you already use.
          </p>
          <button
            type="button"
            onClick={() => onOpenTab?.("discussion")}
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-[13px] font-semibold text-white transition hover:opacity-90"
          >
            Enter discussion
          </button>
        </section>

        {!roomId && (
          <ChannelEmptyState
            icon={Sparkles}
            title="Warming collaboration index"
            description="Open Discussion once to sync messages, then return for pins, files, and knowledge."
            actionLabel="Open Discussion"
            onAction={() => onOpenTab?.("discussion")}
            className="py-8"
          />
        )}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { CheckCircle2, Pin, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Msg } from "@/types";
import { displayName } from "@/lib/community/chat/message-experience";

/** Compact thread preview under a root message. */
export function ThreadPreview({
  message,
  participants,
  lastReplyAt,
  onOpen,
}: {
  message: Msg;
  participants?: { name: string; avatar?: string | null }[];
  lastReplyAt?: string | null;
  onOpen: () => void;
}) {
  const count = message.reply_count ?? 0;
  if (count <= 0) return null;

  const unread = message.thread_unread_count ?? 0;
  const solved = !!message.thread_solved;
  const pinned = !!message.is_pinned;
  const last =
    lastReplyAt ||
    (typeof message.metadata?.last_reply_at === "string"
      ? message.metadata.last_reply_at
      : null);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open thread with ${count} ${count === 1 ? "reply" : "replies"}`}
      className={cn(
        "mt-1 flex w-full max-w-sm items-center gap-2 rounded-md border border-[var(--color-border)]",
        "bg-[var(--color-surface)] px-2.5 py-2 text-left transition-colors",
        "hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-subtle)]/40"
      )}
    >
      <div className="flex -space-x-1.5">
        {(participants && participants.length > 0
          ? participants.slice(0, 3)
          : [{ name: displayName(message), avatar: message.profiles?.avatar_url }]
        ).map((p, i) => (
          <div
            key={`${p.name}-${i}`}
            className="relative h-5 w-5 overflow-hidden rounded-full border border-[var(--color-surface)] bg-[var(--color-surface-secondary)]"
          >
            {p.avatar ? (
              <Image src={p.avatar} alt="" width={20} height={20} className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[8px] font-bold text-[var(--color-accent)]">
                {p.name[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-[var(--color-accent)]">
          {count} {count === 1 ? "reply" : "replies"}
          {last ? (
            <span className="font-normal text-[var(--color-text-muted)]">
              {" "}
              · {formatDistanceToNow(new Date(last), { addSuffix: true })}
            </span>
          ) : null}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {unread > 0 && (
            <span className="rounded-sm bg-[var(--color-accent)] px-1.5 py-px text-[9px] font-bold text-white">
              {unread} unread
            </span>
          )}
          {solved && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Solved
            </span>
          )}
          {pinned && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--color-accent)]">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
        </div>
      </div>

      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
    </button>
  );
}

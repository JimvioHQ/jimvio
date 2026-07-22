"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  MessageSquare,
  Pin,
  Sparkles,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import {
  displayName,
  extractThreads,
} from "@/lib/community/chat/message-experience";
import { useCollaborationStore } from "@/lib/community/knowledge";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { toast } from "sonner";

/** Threads tab — solved, featured, pinned, summaries, convert to knowledge. */
export function ThreadsPanel({
  roomId,
  canManage,
  onOpenThread,
  onConvertThread,
}: {
  roomId?: string;
  canManage?: boolean;
  onOpenThread?: (messageId: string) => void;
  onConvertThread?: (messageId: string) => void;
}) {
  const messages = useRoomMessageIndex((s) =>
    roomId ? (s.byRoom[roomId]?.messages ?? []) : []
  );
  const threadMeta = useCollaborationStore((s) => s.threads);
  const upsertThreadMeta = useCollaborationStore((s) => s.upsertThreadMeta);
  const [filter, setFilter] = useState<"all" | "solved" | "featured" | "pinned">(
    "all"
  );

  const threads = useMemo(() => {
    const roots = extractThreads(messages);
    return roots
      .map((m) => {
        const meta = threadMeta.find((t) => t.threadId === m.id);
        return { message: m, meta };
      })
      .filter(({ message, meta }) => {
        if (filter === "solved") return !!meta?.solved || !!message.thread_solved;
        if (filter === "featured") return !!meta?.featured;
        if (filter === "pinned") return !!meta?.pinned || !!message.is_pinned;
        return true;
      })
      .sort(
        (a, b) =>
          (b.message.reply_count ?? 0) - (a.message.reply_count ?? 0)
      );
  }, [messages, threadMeta, filter]);

  if (!roomId || (messages.length === 0 && threads.length === 0)) {
    return (
      <ChannelEmptyState
        icon={MessageSquare}
        title="Threads"
        description="Threaded discussions with solved answers and featured knowledge live here. Start a thread from Discussion."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--color-border)] px-3 py-2 scrollbar-hide">
        {(
          [
            ["all", "All"],
            ["solved", "Solved"],
            ["featured", "Featured"],
            ["pinned", "Pinned"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold",
              filter === id
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4" aria-label="Threads">
        {threads.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            No threads match this filter.
          </p>
        ) : (
          threads.map(({ message: m, meta }) => {
            const solved = meta?.solved || m.thread_solved;
            const featured = meta?.featured;
            const pinned = meta?.pinned || m.is_pinned;
            return (
              <li
                key={m.id}
                className={cn(
                  "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
                  "transition-shadow hover:shadow-sm"
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {solved && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Solved
                    </span>
                  )}
                  {featured && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[var(--color-accent)]">
                      <Star className="h-3 w-3" /> Featured
                    </span>
                  )}
                  {pinned && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[var(--color-accent)]">
                      <Pin className="h-3 w-3" /> Pinned
                    </span>
                  )}
                  {meta?.verifiedAnswerId && (
                    <span className="text-[10px] font-bold text-emerald-600">
                      Verified answer
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12px] font-semibold text-[var(--color-accent)]">
                  {displayName(m)} · {m.reply_count ?? 0} replies
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-[var(--color-text-primary)]">
                  {m.body?.trim() || "(attachment)"}
                </p>
                {meta?.summary && (
                  <p className="mt-2 rounded-md bg-[var(--color-surface-secondary)] px-2 py-1.5 text-[12px] text-[var(--color-text-secondary)]">
                    <Sparkles className="mr-1 inline h-3 w-3 text-[var(--color-accent)]" />
                    {meta.summary}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  {formatDistanceToNow(new Date(m.created_at), {
                    addSuffix: true,
                  })}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenThread?.(m.id)}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)]"
                  >
                    Open thread
                  </button>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          upsertThreadMeta(m.id, roomId, {
                            solved: !solved,
                          });
                          toast.success(solved ? "Marked unsolved" : "Marked solved");
                        }}
                        className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                      >
                        {solved ? "Unsolve" : "Solve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          upsertThreadMeta(m.id, roomId, {
                            featured: !featured,
                          });
                        }}
                        className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                      >
                        {featured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          upsertThreadMeta(m.id, roomId, {
                            pinned: !pinned,
                          });
                        }}
                        className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                      >
                        {pinned ? "Unpin" : "Pin thread"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const summary = (m.body || "")
                            .trim()
                            .slice(0, 160);
                          upsertThreadMeta(m.id, roomId, {
                            summary:
                              summary ||
                              `Thread with ${m.reply_count ?? 0} replies`,
                          });
                          toast.success("Thread summary saved");
                        }}
                        className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                      >
                        Summary
                      </button>
                      <button
                        type="button"
                        onClick={() => onConvertThread?.(m.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)]"
                      >
                        <BookOpen className="h-3 w-3" />
                        → Knowledge
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

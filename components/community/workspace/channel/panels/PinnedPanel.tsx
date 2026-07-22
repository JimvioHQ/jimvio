"use client";

import { format } from "date-fns";
import { Pin, ArrowDownToLine } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import { extractPinned, displayName } from "@/lib/community/chat/message-experience";
import { cn } from "@/lib/utils";

/** Pinned collaboration objects for the channel — driven by live chat message index. */
export function PinnedPanel({
  roomId,
  pinnedCount = 0,
}: {
  roomId?: string;
  pinnedCount?: number;
}) {
  const messages = useRoomMessageIndex((s) =>
    roomId ? s.byRoom[roomId]?.messages ?? [] : []
  );
  const pinned = extractPinned(messages);

  if (!roomId || pinned.length === 0) {
    return (
      <ChannelEmptyState
        icon={Pin}
        title={pinnedCount > 0 ? `${pinnedCount} pinned` : "Pinned"}
        description="Important messages pinned by moderators will show up here for quick access. Open Discussion to load the channel first."
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <ul className="mx-auto max-w-2xl space-y-3" aria-label="Pinned messages">
        {pinned.map((m) => (
          <li
            key={m.id}
            className={cn(
              "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
              "transition-shadow hover:shadow-sm"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                <Pin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {displayName(m)}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                  {m.body?.trim() || "(attachment)"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                  <span>
                    Pinned{" "}
                    {format(new Date(m.pinned_at ?? m.created_at), "MMM d, yyyy · HH:mm")}
                  </span>
                  {m.pinned_by && <span>· by moderator</span>}
                </div>
                <a
                  href={`#msg-${m.id}`}
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)]",
                    "hover:underline"
                  )}
                  onClick={() => {
                    // Switch to discussion via hash; ChannelWorkspace keeps discussion mounted when possible
                    document.getElementById(`msg-${m.id}`)?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Jump to message
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

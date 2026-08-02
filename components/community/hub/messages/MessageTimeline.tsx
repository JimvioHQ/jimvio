"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import type { HubChatMessage } from "./types";
import { groupMessagesByDay } from "./utils";

export function MessageTimeline({
  messages,
  loading,
  currentUserId,
  peerName,
  peerAvatar,
  typingName,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onReply,
  onReact,
  onOpenThread,
  onOpenMedia,
}: {
  messages: HubChatMessage[];
  loading?: boolean;
  currentUserId: string | null;
  peerName: string;
  peerAvatar: string | null;
  typingName?: string | null;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  onReply?: (msg: HubChatMessage) => void;
  onReact?: (msg: HubChatMessage, emoji: string) => void;
  onOpenThread?: (msg: HubChatMessage) => void;
  onOpenMedia?: (url: string, kind: "image" | "video") => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const groups = groupMessagesByDay(messages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingName]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el || !hasMore || loadingOlder || !onLoadOlder) return;
    if (el.scrollTop < 80) onLoadOlder();
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 space-y-2.5 overflow-y-auto scroll-smooth bg-gradient-to-b from-[#F7F8FA] to-[#F3F4F6]/80 px-3 py-3 sm:px-5 sm:py-4"
      style={{ scrollbarWidth: "thin" }}
    >
      {loadingOlder && (
        <div className="flex justify-center py-1.5">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        </div>
      )}

      {messages.length === 0 ? (
        <p className="py-12 text-center text-[12px] text-[var(--color-text-muted)]">
          Say hello to start the conversation.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.label + group.day.toISOString()} className="space-y-1.5">
            <div className="flex justify-center py-1.5">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-muted)] shadow-sm">
                {group.label}
              </span>
            </div>
            {group.messages.map((msg, idx) => {
              const mine = !!currentUserId && msg.sender_id === currentUserId;
              const prev = group.messages[idx - 1];
              const showAvatar =
                !mine && (!prev || prev.sender_id !== msg.sender_id);
              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  mine={mine}
                  showAvatar={showAvatar}
                  peerName={msg.sender_name || peerName}
                  peerAvatar={msg.sender_avatar ?? peerAvatar}
                  onReply={onReply}
                  onReact={onReact}
                  onOpenThread={onOpenThread}
                  onOpenMedia={onOpenMedia}
                />
              );
            })}
          </div>
        ))
      )}

      {typingName && (
        <div className="flex items-center gap-2 pl-9 text-[12px] text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-text-secondary)]">
            {typingName} is typing
          </span>
          <span className="inline-flex gap-0.5">
            <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--color-accent,#fd5000)] [animation-delay:0ms]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--color-accent,#fd5000)] [animation-delay:150ms]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--color-accent,#fd5000)] [animation-delay:300ms]" />
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

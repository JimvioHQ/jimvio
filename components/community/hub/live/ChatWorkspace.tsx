"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { CornerDownRight, Pin, Shield, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/community/hub-live-types";
import { formatTime } from "./studio-utils";
import { CHAT_RENDER_CAP, FOCUS_RING, FOCUS_RING_INSET, MOTION_COLORS } from "./studio-ui";

type Enriched = ChatMessage & {
  pinned?: boolean;
  highlight?: boolean;
  replyTo?: string | null;
};

function ChatWorkspaceImpl({
  messages,
  scrollTop,
  onScrollSave,
  chatInput,
  setChatInput,
  onSend,
}: {
  messages: ChatMessage[];
  scrollTop: number;
  onScrollSave: (y: number) => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend?: (body: string) => void | Promise<void>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<Enriched | null>(null);
  const [modOpen, setModOpen] = useState(false);
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const truncated = messages.length > CHAT_RENDER_CAP;
  const windowed = useMemo(
    () => (truncated ? messages.slice(-CHAT_RENDER_CAP) : messages),
    [messages, truncated]
  );

  const enriched: Enriched[] = useMemo(
    () =>
      windowed.map((m, i) => ({
        ...m,
        pinned: i === windowed.length - 1 && m.body.length > 40,
        highlight: m.reaction_count > 2,
        replyTo: i > 0 && i % 5 === 0 ? windowed[i - 1]?.sender_name : null,
      })),
    [windowed]
  );

  const pinned = useMemo(() => enriched.filter((m) => m.pinned), [enriched]);
  const queueCount = Math.min(2, Math.floor(messages.length / 8));

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (scrollTop > 0) el.scrollTop = scrollTop;
    else el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only restore
  }, []);

  useEffect(
    () => () => {
      if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
    },
    []
  );

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = (e.target as HTMLDivElement).scrollTop;
    if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
    scrollSaveTimer.current = setTimeout(() => onScrollSave(y), 120);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" role="region" aria-label="Live chat">
      {pinned.length > 0 && (
        <div className="mx-3 mt-3 border-l-2 border-neutral-300 pl-3" aria-label="Pinned message">
          <p className="mb-0.5 flex items-center gap-1 text-[10px] font-medium tracking-wide text-neutral-400">
            <Pin className="h-2.5 w-2.5" aria-hidden />
            Pinned
          </p>
          {pinned.slice(0, 1).map((m) => (
            <p key={m.id} className="text-[12px] leading-relaxed text-neutral-600">
              <span className="font-medium text-neutral-800">{m.sender_name}</span>
              <span className="text-neutral-400"> — </span>
              {m.body}
            </p>
          ))}
        </div>
      )}

      {queueCount > 0 && (
        <div className="mx-3 mt-2">
          <button
            type="button"
            onClick={() => setModOpen((v) => !v)}
            aria-expanded={modOpen}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
              MOTION_COLORS,
              FOCUS_RING,
              modOpen
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
            )}
          >
            <Shield className="h-3 w-3" strokeWidth={1.6} aria-hidden />
            {queueCount} to review
          </button>
          {modOpen && (
            <div className="mt-2 space-y-1 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
              {messages.slice(0, queueCount).map((m) => (
                <div key={`mod-${m.id}`} className="flex items-center gap-2 px-1 py-1.5">
                  <p className="min-w-0 flex-1 truncate text-[12px] text-neutral-500">{m.body}</p>
                  <button
                    type="button"
                    className={cn("text-[11px] font-medium text-neutral-800", FOCUS_RING)}
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "text-[11px] font-medium text-neutral-400 hover:text-red-500",
                      FOCUS_RING
                    )}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {truncated && (
        <p className="px-4 py-1 text-center text-[10px] text-neutral-400" role="status">
          Showing latest {CHAT_RENDER_CAP} of {messages.length.toLocaleString()} messages
        </p>
      )}

      <div
        ref={listRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-0 overflow-y-auto px-2 py-2 motion-safe:scroll-smooth"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
      >
        {enriched.length === 0 ? (
          <p className="py-14 text-center text-[12px] leading-relaxed text-neutral-400">
            Quiet for now — messages will appear as the room talks.
          </p>
        ) : (
          enriched.map((m) => (
            <div
              key={m.id}
              className="group rounded-lg px-2.5 py-1.5 motion-safe:transition-colors motion-safe:duration-150 hover:bg-neutral-50/80"
            >
              {m.replyTo && (
                <p className="mb-0.5 flex items-center gap-1 text-[10px] text-neutral-400">
                  <CornerDownRight className="h-2.5 w-2.5" aria-hidden />
                  {m.replyTo}
                </p>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-medium tracking-[-0.01em] text-neutral-800">
                  {m.sender_name}
                </span>
                <time
                  className="text-[10px] tabular-nums text-neutral-300"
                  dateTime={m.created_at}
                >
                  {formatTime(m.created_at)}
                </time>
              </div>
              <p className="mt-0.5 text-[13px] leading-[1.45] text-neutral-600">{m.body}</p>
              <div className="mt-0.5 flex h-0 gap-2 overflow-hidden opacity-0 transition-all duration-150 group-hover:h-auto group-hover:opacity-100 group-focus-within:h-auto group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => setReplyTo(m)}
                  className={cn(
                    "py-0.5 text-[10px] font-medium text-neutral-400 hover:text-neutral-700",
                    FOCUS_RING
                  )}
                >
                  Reply
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-3 pb-3 pt-1">
        {replyTo && (
          <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] text-neutral-400">
            <span className="truncate">
              Reply to <span className="text-neutral-600">{replyTo.sender_name}</span>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className={cn("hover:text-neutral-700", FOCUS_RING)}
            >
              Cancel
            </button>
          </div>
        )}
        <form
          className="flex items-center gap-2 rounded-full bg-neutral-50/90 px-3 focus-within:bg-neutral-100/80"
          onSubmit={(e) => {
            e.preventDefault();
            const body = chatInput.trim();
            if (!body) return;
            void Promise.resolve(onSend?.(body)).finally(() => {
              setChatInput("");
              setReplyTo(null);
            });
          }}
        >
          <label className="sr-only" htmlFor="live-chat-input">
            Message the room
          </label>
          <input
            id="live-chat-input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Message…"
            autoComplete="off"
            className={cn(
              "min-w-0 flex-1 bg-transparent py-2.5 text-[13px] outline-none placeholder:text-neutral-400",
              FOCUS_RING_INSET
            )}
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-20",
              MOTION_COLORS,
              FOCUS_RING
            )}
            aria-label="Send message"
          >
            <Send className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}

export const ChatWorkspace = memo(ChatWorkspaceImpl);

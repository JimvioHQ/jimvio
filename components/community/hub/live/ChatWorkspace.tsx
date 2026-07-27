"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, CornerDownRight, Heart, Pin, Shield, Smile, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/community/hub-live-types";
import { HubAvatar } from "../hub-ui";
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
  hostName,
  participantAvatars,
  onSend,
}: {
  messages: ChatMessage[];
  scrollTop: number;
  onScrollSave: (y: number) => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  hostName?: string | null;
  participantAvatars?: { name: string; src: string | null }[];
  onSend?: (
    body: string,
    reply?: { reply_to_id: string; reply_to_body?: string; reply_to_sender?: string }
  ) => void | Promise<void>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<Enriched | null>(null);
  const [modOpen, setModOpen] = useState(false);
  const [filter, setFilter] = useState<"Top" | "Recent">("Top");
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLen = useRef(messages.length);

  const truncated = messages.length > CHAT_RENDER_CAP;
  const windowed = useMemo(
    () => (truncated ? messages.slice(-CHAT_RENDER_CAP) : messages),
    [messages, truncated]
  );

  const enriched: Enriched[] = useMemo(
    () =>
      windowed.map((m) => ({
        ...m,
        pinned: Boolean(m.is_pinned),
        highlight: m.reaction_count > 2,
        replyTo: m.reply_to_sender ?? null,
      })),
    [windowed]
  );

  const pinned = useMemo(() => enriched.filter((m) => m.pinned), [enriched]);
  const queueCount = 0;
  const avatars = (participantAvatars ?? []).slice(0, 6);

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

  useEffect(() => {
    if (messages.length <= prevLen.current) {
      prevLen.current = messages.length;
      return;
    }
    prevLen.current = messages.length;
    if (atBottom) {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      setUnread(0);
    } else {
      setUnread((n) => n + 1);
    }
  }, [messages.length, atBottom]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.target as HTMLDivElement;
    const y = el.scrollTop;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setAtBottom(nearBottom);
    if (nearBottom) setUnread(0);
    if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
    scrollSaveTimer.current = setTimeout(() => onScrollSave(y), 120);
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAtBottom(true);
    setUnread(0);
  };

  const roleFor = (name: string) => {
    if (hostName && name === hostName) return "host" as const;
    return null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white" role="region" aria-label="Live chat">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
        <h2 className="text-[14px] font-semibold tracking-[-0.02em] text-neutral-900">
          Live Chat
        </h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilter((f) => (f === "Top" ? "Recent" : "Top"))}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800",
              FOCUS_RING
            )}
            aria-label={`Sort messages by ${filter}`}
          >
            {filter}
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
        </div>
      </div>

      {avatars.length > 0 && (
        <div className="flex items-center gap-[-4px] px-4 py-2.5" aria-label="Active chatters">
          <div className="flex -space-x-2">
            {avatars.map((a, i) => (
              <HubAvatar
                key={`${a.name}-${i}`}
                name={a.name}
                src={a.src}
                size={28}
                className="ring-2 ring-white"
              />
            ))}
          </div>
        </div>
      )}

      {pinned.length > 0 && (
        <div
          className="mx-3 mt-1 rounded-xl border border-amber-200/60 bg-amber-50/60 px-3 py-2"
          aria-label="Pinned message"
        >
          <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-amber-700/80">
            <Pin className="h-2.5 w-2.5" aria-hidden />
            Pinned
          </p>
          {pinned.slice(0, 1).map((m) => (
            <p key={m.id} className="text-[12px] leading-relaxed text-neutral-700">
              <span className="font-semibold text-neutral-900">{m.sender_name}</span>
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
        </div>
      )}

      {truncated && (
        <p className="px-4 py-1 text-center text-[10px] text-neutral-400" role="status">
          Showing latest {CHAT_RENDER_CAP} of {messages.length.toLocaleString()} messages
        </p>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={listRef}
          onScroll={onScroll}
          className="h-full space-y-0.5 overflow-y-auto px-3 py-2 motion-safe:scroll-smooth"
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
            enriched.map((m) => {
              const role = roleFor(m.sender_name);
              return (
                <div
                  key={m.id}
                  className="group flex gap-2.5 rounded-xl px-2 py-2 motion-safe:transition-colors motion-safe:duration-150 hover:bg-neutral-50/90"
                >
                  <HubAvatar
                    name={m.sender_name}
                    src={m.sender_avatar}
                    size={32}
                    className="mt-0.5 !ring-0"
                  />
                  <div className="min-w-0 flex-1">
                    {m.replyTo && (
                      <p className="mb-0.5 flex items-center gap-1 text-[10px] text-neutral-400">
                        <CornerDownRight className="h-2.5 w-2.5" aria-hidden />
                        {m.replyTo}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-semibold tracking-[-0.01em] text-neutral-900">
                        {m.sender_name}
                      </span>
                      {role === "host" && (
                        <span className="rounded-full bg-accent/15 px-1.5 py-px text-[9px] font-semibold text-accent">
                          Host
                        </span>
                      )}
                      <time
                        className="text-[10px] tabular-nums text-neutral-300"
                        dateTime={m.created_at}
                      >
                        {formatTime(m.created_at)}
                      </time>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-[1.45] text-neutral-600">{m.body}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {m.reaction_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                          <Heart className="h-3 w-3 fill-red-500 text-red-500" aria-hidden />
                          {m.reaction_count}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setReplyTo(m)}
                        className={cn(
                          "text-[10px] font-medium text-neutral-400 opacity-0 hover:text-neutral-700 group-hover:opacity-100 group-focus-within:opacity-100",
                          FOCUS_RING
                        )}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {unread > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            className={cn(
              "absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg",
              MOTION_COLORS,
              FOCUS_RING
            )}
          >
            {unread} new {unread === 1 ? "message" : "messages"}
          </button>
        )}
      </div>

      <div className="border-t border-neutral-100 px-3 pb-3 pt-2">
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
          className="flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 px-2.5 py-1.5 focus-within:border-accent/30 focus-within:bg-white"
          onSubmit={(e) => {
            e.preventDefault();
            const body = chatInput.trim();
            if (!body) return;
            void Promise.resolve(
              onSend?.(
                body,
                replyTo
                  ? {
                      reply_to_id: replyTo.id,
                      reply_to_body: replyTo.body.slice(0, 200),
                      reply_to_sender: replyTo.sender_name,
                    }
                  : undefined
              )
            ).finally(() => {
              setChatInput("");
              setReplyTo(null);
            });
          }}
        >
          <button
            type="button"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-white hover:text-neutral-700",
              FOCUS_RING
            )}
            aria-label="Insert emoji"
            title="Emoji"
            onClick={() => setChatInput(chatInput ? `${chatInput} 👍` : "👍")}
          >
            <Smile className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          </button>
          <label className="sr-only" htmlFor="live-chat-input">
            Message the room
          </label>
          <input
            id="live-chat-input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
            className={cn(
              "min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-neutral-400",
              FOCUS_RING_INSET
            )}
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white disabled:opacity-25",
              MOTION_COLORS,
              FOCUS_RING,
              "hover:bg-accent-hover"
            )}
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </button>
        </form>
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[10px] text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          Slow mode is on
        </p>
      </div>
    </div>
  );
}

export const ChatWorkspace = memo(ChatWorkspaceImpl);

"use client";

import { memo, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  CornerDownRight,
  Heart,
  MoreHorizontal,
  Pin,
  Smile,
  Send,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/community/hub-live-types";
import { HubAvatar } from "../hub-ui";
import { formatTime } from "./studio-utils";
import { CHAT_RENDER_CAP, FOCUS_RING, FOCUS_RING_INSET, MOTION_COLORS } from "./studio-ui";
import { ChatEmojiPickerDialog } from "@/components/community/chat/chat-emoji-picker-dialog";
import type { LiveTypingUser, LiveChatConnectionStatus } from "@/hooks/live/useLiveChat";

type Enriched = ChatMessage & {
  pinned?: boolean;
  replyTo?: string | null;
};

function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const keyboardOverlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(keyboardOverlap > 48 ? keyboardOverlap : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

function chatStatusLabel(status: LiveChatConnectionStatus): string {
  switch (status) {
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected";
    case "reconnecting":
      return "Reconnecting…";
    case "disconnected":
      return "Disconnected";
    case "unavailable":
      return "Unavailable";
    case "idle":
    default:
      return "Waiting for live";
  }
}

function ChatWorkspaceImpl({
  messages,
  scrollTop,
  onScrollSave,
  chatInput,
  setChatInput,
  hostName,
  participantAvatars,
  onSend,
  onReact,
  onPin,
  onDelete,
  onEdit,
  onSendGif,
  onTyping,
  typingUsers = [],
  mentionCandidates = [],
  canModerate = false,
  roomActions = false,
  connected = true,
  connectionStatus,
  queuedCount = 0,
  slowModeSeconds = 0,
  onlineCount,
}: {
  messages: ChatMessage[];
  scrollTop: number;
  onScrollSave: (y: number) => void;
  chatInput: string;
  setChatInput: Dispatch<SetStateAction<string>>;
  hostName?: string | null;
  participantAvatars?: { name: string; src: string | null }[];
  onSend?: (
    body: string,
    reply?: { reply_to_id: string; reply_to_body?: string; reply_to_sender?: string }
  ) => void | Promise<void>;
  onReact?: (messageId: string) => void | Promise<void>;
  onPin?: (messageId: string, pin: boolean) => void | Promise<void>;
  onDelete?: (messageId: string) => void | Promise<void>;
  onEdit?: (messageId: string, body: string) => void | Promise<void>;
  onSendGif?: (url: string, title?: string) => void | Promise<void>;
  onTyping?: () => void;
  typingUsers?: LiveTypingUser[];
  mentionCandidates?: string[];
  canModerate?: boolean;
  roomActions?: boolean;
  connected?: boolean;
  connectionStatus?: LiveChatConnectionStatus;
  queuedCount?: number;
  slowModeSeconds?: number;
  onlineCount?: number;
}) {
  const status: LiveChatConnectionStatus =
    connectionStatus ?? (connected ? "connected" : "reconnecting");
  const statusLabel = chatStatusLabel(status);
  const showStatusBadge = status !== "connected" && status !== "idle";
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [replyTo, setReplyTo] = useState<Enriched | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLen = useRef(messages.length);
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    if (keyboardInset <= 0) return;
    const el = inputRef.current;
    if (!el || document.activeElement !== el) return;
    // Keep the composer visible above the mobile soft keyboard.
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [keyboardInset]);

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
        replyTo: m.reply_to_sender ?? null,
      })),
    [windowed]
  );

  const pinned = useMemo(() => enriched.filter((m) => m.pinned), [enriched]);
  const avatars = (participantAvatars ?? []).slice(0, 6);

  const mentionMatches = useMemo(() => {
    if (!mentionOpen) return [];
    const q = mentionQuery.toLowerCase();
    return mentionCandidates
      .filter((n) => n && (!q || n.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [mentionOpen, mentionQuery, mentionCandidates]);

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

  const handleInputChange = (value: string) => {
    setChatInput(value);
    onTyping?.();
    const at = value.lastIndexOf("@");
    if (at >= 0) {
      const after = value.slice(at + 1);
      if (!/\s/.test(after) && mentionCandidates.length > 0) {
        setMentionOpen(true);
        setMentionQuery(after);
        return;
      }
    }
    setMentionOpen(false);
    setMentionQuery("");
  };

  const insertMention = (name: string) => {
    const at = chatInput.lastIndexOf("@");
    const next =
      at >= 0 ? `${chatInput.slice(0, at)}@${name.replace(/\s+/g, "")} ` : `${chatInput}@${name} `;
    setChatInput(next);
    setMentionOpen(false);
    setMentionQuery("");
    inputRef.current?.focus();
  };

  const typingLabel =
    typingUsers.length === 0
      ? null
      : typingUsers.length === 1
        ? `${typingUsers[0].name} is typing…`
        : `${typingUsers.length} people typing…`;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-white"
      role="region"
      aria-label="Live chat"
      style={
        keyboardInset > 0
          ? { paddingBottom: keyboardInset, transition: "padding-bottom 120ms ease-out" }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900">
            Live Chat
          </h2>
          {onlineCount != null && onlineCount > 0 && (
            <p className="mt-0.5 text-[11px] text-neutral-400">
              {onlineCount.toLocaleString()} online
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showStatusBadge && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                status === "connecting" || status === "reconnecting"
                  ? "bg-amber-50 text-amber-700"
                  : status === "disconnected" || status === "unavailable"
                    ? "bg-neutral-100 text-neutral-600"
                    : "bg-amber-50 text-amber-700"
              )}
              role="status"
            >
              {statusLabel}
            </span>
          )}
          {queuedCount > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {queuedCount} queued
            </span>
          )}
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
              {status === "idle"
                ? "Chat opens when you go live."
                : status === "connecting"
                  ? "Connecting to chat…"
                  : status === "unavailable"
                    ? "Chat is unavailable right now."
                    : (
                      <>
                        No messages yet.
                        <br />
                        Say hello to start the conversation.
                      </>
                    )}
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
                      {roomActions && onReact ? (
                        <button
                          type="button"
                          onClick={() => void onReact(m.id)}
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-red-500",
                            FOCUS_RING
                          )}
                          aria-label="React"
                        >
                          <Heart
                            className={cn(
                              "h-3 w-3",
                              m.reaction_count > 0 && "fill-red-500 text-red-500"
                            )}
                            aria-hidden
                          />
                          {m.reaction_count > 0 ? m.reaction_count : null}
                        </button>
                      ) : (
                        m.reaction_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                            <Heart className="h-3 w-3 fill-red-500 text-red-500" aria-hidden />
                            {m.reaction_count}
                          </span>
                        )
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
                      {roomActions && (canModerate || onDelete || onEdit) && (
                        <div className="relative opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => setMenuId((id) => (id === m.id ? null : m.id))}
                            className={cn("rounded p-0.5 text-neutral-400 hover:text-neutral-700", FOCUS_RING)}
                            aria-label="Message actions"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          {menuId === m.id && (
                            <div className="absolute right-0 z-20 mt-1 min-w-[120px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                              {onEdit && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-neutral-700 hover:bg-neutral-50"
                                  onClick={() => {
                                    setMenuId(null);
                                    const next = window.prompt("Edit message", m.body);
                                    if (next != null && next.trim() && next.trim() !== m.body) {
                                      void onEdit(m.id, next.trim());
                                    }
                                  }}
                                >
                                  Edit
                                </button>
                              )}
                              {canModerate && onPin && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-neutral-700 hover:bg-neutral-50"
                                  onClick={() => {
                                    setMenuId(null);
                                    void onPin(m.id, !m.pinned);
                                  }}
                                >
                                  <Pin className="h-3 w-3" aria-hidden />
                                  {m.pinned ? "Unpin" : "Pin"}
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    setMenuId(null);
                                    void onDelete(m.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" aria-hidden />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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

      <div
        className="border-t border-neutral-100 px-3 pt-2"
        style={{
          paddingBottom: `max(0.75rem, env(safe-area-inset-bottom))`,
        }}
      >
        {typingLabel && (
          <p className="mb-1 px-1 text-[10px] text-neutral-400" aria-live="polite">
            {typingLabel}
          </p>
        )}
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
        <div className="relative">
          {mentionMatches.length > 0 && (
            <ul
              className="absolute bottom-full left-0 z-20 mb-1 max-h-36 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
              role="listbox"
            >
              {mentionMatches.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-50"
                    onClick={() => insertMention(name)}
                  >
                    @{name.replace(/\s+/g, "")}
                  </button>
                </li>
              ))}
            </ul>
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
                setMentionOpen(false);
              });
            }}
          >
            <button
              type="button"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-white hover:text-neutral-700",
                FOCUS_RING
              )}
              aria-label="Emoji and GIFs"
              title="Emoji & GIFs"
              onClick={() => setEmojiOpen(true)}
            >
              <Smile className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            </button>
            <label className="sr-only" htmlFor="live-chat-input">
              Message the room
            </label>
            <input
              ref={inputRef}
              id="live-chat-input"
              value={chatInput}
              onChange={(e) => handleInputChange(e.target.value)}
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
        </div>
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[10px] text-neutral-400">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === "connected"
                ? "bg-emerald-400"
                : status === "connecting" || status === "reconnecting"
                  ? "bg-amber-400"
                  : "bg-neutral-300"
            )}
            aria-hidden
          />
          {slowModeSeconds > 0
            ? `Slow mode ${slowModeSeconds}s`
            : status === "connected"
              ? "Chat connected"
              : statusLabel}
        </p>
      </div>

      <ChatEmojiPickerDialog
        open={emojiOpen}
        onOpenChange={setEmojiOpen}
        onSelect={(native) => setChatInput((prev) => prev + native)}
        onSelectGif={
          roomActions && onSendGif
            ? (gif) => {
                void onSendGif(gif.url || "", gif.title);
              }
            : undefined
        }
      />
    </div>
  );
}

export const ChatWorkspace = memo(ChatWorkspaceImpl);


"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  Phone,
  Video,
  Sparkles,
  MessageCircle,
  BookOpen,
  Folder,
  CheckSquare,
  Hash,
  Radio,
  FileText,
  LayoutGrid,
  Users,
  Send,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Space icon map ───────────────────────────────────────────────────────────

function spaceIconFromName(name: string | null): LucideIcon {
  if (!name) return Hash;
  const map: Record<string, LucideIcon> = {
    chat: MessageCircle,
    message: MessageCircle,
    book: BookOpen,
    course: BookOpen,
    learn: BookOpen,
    folder: Folder,
    resources: Folder,
    tasks: CheckSquare,
    sparkles: Sparkles,
    ai: Sparkles,
  };
  return map[name.toLowerCase()] ?? Hash;
}

// ─── Room type config ─────────────────────────────────────────────────────────

type RoomTypeMeta = {
  label: string;
  icon: LucideIcon;
  /** Tailwind bg class for the live status dot */
  dotClass: string;
  placeholder: string;
};

function getRoomTypeMeta(roomType: string): RoomTypeMeta {
  switch (roomType) {
    case "chat":
      return {
        label: "Live chat",
        icon: Radio,
        dotClass: "bg-emerald-400",
        placeholder: "Send a message…",
      };
    case "posts":
      return {
        label: "Discussions",
        icon: FileText,
        dotClass: "bg-sky-400",
        placeholder: "Start a discussion…",
      };
    case "course":
      return {
        label: "Course",
        icon: BookOpen,
        dotClass: "bg-violet-400",
        placeholder: "Ask a question…",
      };
    case "tasks":
      return {
        label: "Tasks",
        icon: CheckSquare,
        dotClass: "bg-amber-400",
        placeholder: "Add a task…",
      };
    case "resources":
      return {
        label: "Resources",
        icon: LayoutGrid,
        dotClass: "bg-rose-400",
        placeholder: "Share a resource…",
      };
    default:
      return {
        label: roomType,
        icon: Hash,
        dotClass: "bg-zinc-400",
        placeholder: "Write something…",
      };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Member = {
  id: string;
  name: string;
  initials: string;
  role?: string;
  online?: boolean;
  /** Tailwind classes for avatar bg + text, e.g. "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" */
  colorClass?: string;
};

export type Message = {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColorClass?: string;
  text: string;
  time: string;
  reactions?: { emoji: string; count: number; reacted?: boolean }[];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
  initials,
  colorClass,
  size = "md",
}: {
  initials: string;
  colorClass?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-[26px] w-[26px] text-[10px]" : "h-8 w-8 text-[11px]";
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full font-medium flex-shrink-0",
        dim,
        colorClass ??
        "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
      )}
    >
      {initials}
    </span>
  );
}

function Reaction({
  emoji,
  count,
  reacted,
  onToggle,
}: {
  emoji: string;
  count: number;
  reacted?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
        "border transition-all duration-100 select-none",
      reacted
        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300"
        : "bg-transparent border-[var(--color-border)] text-[var(--color-text-secondary)]",
      "hover:border-[var(--color-text-muted)]"
      )}
    >
      <span>{emoji}</span>
      <span className="font-medium tabular-nums">{count}</span>
    </button>
  );
}

function MessageRow({
  message,
  onReactionToggle,
}: {
  message: Message;
  onReactionToggle: (msgId: string, emoji: string) => void;
}) {
  return (
    <div className="group flex gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-secondary)] transition-colors duration-100">
      <Avatar initials={message.authorInitials} colorClass={message.authorColorClass} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
            {message.authorName}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {message.time}
          </span>
        </div>
        <p className="text-[13px] text-[var(--color-text-secondary)] leading-[1.55]">
          {message.text}
        </p>
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((r) => (
              <Reaction
                key={r.emoji}
                emoji={r.emoji}
                count={r.count}
                reacted={r.reacted}
                onToggle={() => onReactionToggle(message.id, r.emoji)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberItem({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-[var(--color-surface-secondary)] transition-colors duration-100 cursor-default">
      <div className="relative flex-shrink-0">
        <Avatar initials={member.initials} colorClass={member.colorClass} size="sm" />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-900",
            member.online ? "bg-emerald-500" : "bg-[var(--color-text-muted)]"
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate leading-tight">
          {member.name}
        </p>
        {member.role && (
            <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">
            {member.role}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkspaceRoomOverlay({
  communityName,
  spaceName,
  spaceIconName,
  roomName,
  roomType,
  members = [],
  initialMessages = [],
  onClose,
  onStartAudioCall,
  onStartVideoCall,
  children,
}: {
  communityName: string;
  spaceName: string;
  spaceIconName: string | null;
  roomName: string;
  roomType: string;
  members?: Member[];
  initialMessages?: Message[];
  onClose: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  children?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const SpaceIcon = spaceIconFromName(spaceIconName);
  const { label, icon: RoomTypeIcon, dotClass, placeholder } = getRoomTypeMeta(roomType);

  // Mount animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Escape to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const time = `${h % 12 || 12}:${m} ${ampm}`;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now() + Math.random()}`,
        authorId: "me",
        authorName: "You",
        authorInitials: "Me",
        text,
        time,
      },
    ]);
    setDraft("");
    inputRef.current?.focus();
  }, [draft]);

  const toggleReaction = useCallback((msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId) return msg;
        return {
          ...msg,
          reactions: (msg.reactions ?? []).map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
              : r
          ),
        };
      })
    );
  }, []);

  const showFeed = !children;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col overflow-hidden",
        "bg-zinc-50 dark:bg-zinc-900",
        "transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform]",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wro-title"
    >
      {/* ── Header ── */}
      <header className="relative z-10 flex items-stretch flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          {/* Back */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to workspace"
          className={cn(
            "group flex items-center justify-center w-12 flex-shrink-0",
            "text-[var(--color-text-muted)]",
            "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
            "transition-all duration-150 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
          )}
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
        </button>

        {/* Breadcrumb + room name */}
        <div className="flex flex-col justify-center gap-0.5 px-3.5 py-2.5 flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[10px] font-medium tracking-[0.07em] uppercase text-[var(--color-text-muted)] truncate">
              {communityName}
            </span>
            <span className="text-[var(--color-text-muted)] text-[10px] flex-shrink-0" aria-hidden>›</span>
            <span className="text-[10px] font-medium tracking-[0.07em] uppercase text-[var(--color-text-muted)] truncate">
              {spaceName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 flex items-center justify-center h-[19px] w-[19px] rounded-[5px] bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
              <SpaceIcon className="h-2.5 w-2.5 text-[var(--color-text-muted)]" />
            </span>
            <h1
              id="wro-title"
              className="text-[14px] font-medium text-[var(--color-text-primary)] truncate leading-snug"
            >
              {roomName}
            </h1>
          </div>
        </div>

        {/* Right side: call buttons + type pill + members toggle */}
        <div className="flex items-stretch flex-shrink-0">
          {/* Call buttons — only for chat rooms */}
          {roomType === "chat" && (
            <div className="flex items-center gap-1 px-2">
              {onStartAudioCall && (
                <button
                  type="button"
                  onClick={onStartAudioCall}
                  aria-label="Audio call"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-accent)] transition-all"
                >
                  <Phone className="h-4 w-4" />
                </button>
              )}
              {onStartVideoCall && (
                <button
                  type="button"
                  onClick={onStartVideoCall}
                  aria-label="Video call"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-accent)] transition-all"
                >
                  <Video className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {/* Type badge */}
          <div
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-4",
              "text-[var(--color-text-secondary)]"
            )}
            aria-label={`Room type: ${label}`}
          >
            <span className={cn("h-[5px] w-[5px] rounded-full flex-shrink-0", dotClass)} />
            <RoomTypeIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-[10px] font-medium tracking-[0.07em] uppercase whitespace-nowrap">
              {label}
            </span>
          </div>

          {/* Members toggle */}
          {showFeed && members.length > 0 && (
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle member list"
              aria-pressed={sidebarOpen}
              className={cn(
                "flex items-center gap-1.5 px-4",
                "border-l border-[var(--color-border)]",
                "text-[var(--color-text-secondary)]",
                "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                "transition-colors duration-150",
                sidebarOpen && "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              )}
            >
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-[12px] font-medium">{members.length}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* Feed or children */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {showFeed ? (
            <>
              {/* Messages */}
              <div
                ref={feedRef}
                className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5 scroll-smooth"
              >
                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-[var(--color-text-muted)]">
                    <RoomTypeIcon className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageRow
                    key={msg.id}
                    message={msg}
                    onReactionToggle={toggleReaction}
                  />
                ))}
              </div>

              {/* Composer */}
              <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1",
        "bg-[var(--color-bg)]",
                  "rounded-lg border border-[var(--color-border)]",
                  "transition-colors duration-150",
                  "focus-within:border-[var(--color-text-muted)]"
                )}>
                  <Pencil className="h-3.5 w-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={placeholder}
                    className={cn(
                      "flex-1 bg-transparent text-[13px] text-[var(--color-text-primary)] py-2 outline-none",
                      "placeholder:text-[var(--color-text-muted)]"
                    )}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!draft.trim()}
                    aria-label="Send message"
                    className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-md flex-shrink-0",
                      "transition-all duration-150 active:scale-90",
                      draft.trim()
                        ? "bg-[var(--color-accent)] text-white hover:opacity-80"
                        : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-not-allowed"
                    )}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <main className="flex flex-1 min-h-0 flex-col overflow-hidden">{children}</main>
          )}
        </div>

        {/* Members sidebar */}
        {showFeed && members.length > 0 && (
          <aside
            className={cn(
              "flex-shrink-0 flex flex-col overflow-hidden",
              "border-l border-[var(--color-border)]",
              "bg-[var(--color-surface)]",
              "transition-[width,opacity] duration-200 ease-out",
              sidebarOpen ? "w-48 opacity-100" : "w-0 opacity-0 pointer-events-none"
            )}
          >
            <div className="flex-shrink-0 px-3.5 py-2.5 border-b border-[var(--color-border)]">
              <span className="text-[10px] font-medium tracking-[0.07em] uppercase text-[var(--color-text-muted)]">
                Members · {members.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {members.map((m) => (
                <MemberItem key={m.id} member={m} />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
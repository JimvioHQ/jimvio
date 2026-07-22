"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
  BadgeCheck,
  Bookmark,
  CheckCheck,
  Copy,
  Flag,
  Forward,
  Languages,
  Link as LinkIcon,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Quote,
  Reply,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { LinkPreview, Msg, QUICK_REACTIONS } from "@/types";
import {
  displayName,
  messageAttachments,
  messageDeepLink,
} from "@/lib/community/chat/message-experience";
import {
  isBookmarked,
  toggleBookmark,
} from "@/lib/community/chat/message-bookmarks";
import { ReplyQuote } from "../ReplyQuote";
import { MessageRichBody } from "./MessageRichBody";
import { FileAttachmentCard } from "./FileAttachmentCard";
import { ThreadPreview } from "./ThreadPreview";

export type MessageCardProps = {
  m: Msg;
  compact?: boolean;
  isOwn?: boolean;
  userId: string | null;
  isDM?: boolean;
  isStaff?: boolean;
  communityRole?: string | null;
  onOpenThread: () => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onEdit: (msg: Msg) => void;
  onReply: (msg: Msg) => void;
  onQuote?: (msg: Msg) => void;
  onTogglePin?: (id: string, pin: boolean) => void;
  onReport?: (id: string) => void;
  onOpenAi?: (msg: Msg) => void;
  onJump?: (id: string) => void;
};

export function MessageCard({
  m,
  compact,
  isOwn,
  userId,
  isDM,
  isStaff,
  communityRole,
  onOpenThread,
  onToggleReaction,
  onDelete,
  onEdit,
  onReply,
  onQuote,
  onTogglePin,
  onReport,
  onOpenAi,
}: MessageCardProps) {
  const p = m.profiles;
  const name = displayName(m);
  const role = communityRole || m.sender_role || null;
  const attachments = messageAttachments(m);
  const reactions = (
    m.reactions && typeof m.reactions === "object" ? m.reactions : {}
  ) as Record<string, string[]>;
  const isRoot = !m.thread_id;
  const replyCount = m.reply_count ?? 0;
  const hasReplyQuote = !!m.reply_to_id && !!m.reply_to_body;
  const linkPreview = (m.metadata?.link_preview ?? null) as LinkPreview | null;
  const [bookmarked, setBookmarked] = useState(() =>
    isBookmarked(userId, m.id)
  );

  const linkPreviewHost = linkPreview
    ? (() => {
        try {
          return new URL(linkPreview.url).hostname;
        } catch {
          return linkPreview.url;
        }
      })()
    : "";

  function userReacted(emoji: string) {
    const ids = reactions[emoji];
    if (!userId || !ids?.length) return false;
    return ids.some((id) => String(id) === String(userId));
  }

  function copyLink() {
    void navigator.clipboard.writeText(messageDeepLink(m.id));
  }

  function copyText() {
    void navigator.clipboard.writeText((m.body || "").trim() || "(attachment)");
  }

  function share() {
    const url = messageDeepLink(m.id);
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: name, text: m.body?.slice(0, 140), url }).catch(() => {
        void navigator.clipboard.writeText(url);
      });
    } else {
      void navigator.clipboard.writeText(url);
    }
  }

  function onBookmark() {
    const next = toggleBookmark(userId, m.id);
    setBookmarked(next);
  }

  return (
    <article
      id={`msg-${m.id}`}
      tabIndex={-1}
      aria-label={`Message from ${name}`}
      className={cn(
        "group flex w-full scroll-mt-24 mb-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        isOwn ? "justify-end" : "justify-start",
        compact && "pl-3"
      )}
    >
      <div
        className={cn(
          "flex max-w-[min(100%,28rem)] gap-2",
          isOwn && "flex-row-reverse"
        )}
      >
        {/* Avatar */}
        {!isOwn && !compact && (
          <div
            className={cn(
              "mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full",
              "border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
            )}
          >
            {p?.avatar_url ? (
              <Image
                src={p.avatar_url}
                alt=""
                width={32}
                height={32}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--color-accent)]">
                {name[0]}
              </div>
            )}
          </div>
        )}

        <div className={cn("min-w-0 flex-1", isOwn && "flex flex-col items-end")}>
          {/* Bubble */}
          <div
            className={cn(
              "relative px-2.5 pb-2 pt-1.5 shadow-sm transition-shadow duration-200",
              "group-hover:shadow-md",
              isOwn
                ? "rounded-br-sm rounded-bl-lg rounded-t-lg bg-[var(--color-accent-light)]"
                : "rounded-bl-sm rounded-br-lg rounded-t-lg bg-[var(--color-surface)]"
            )}
          >
            {/* Header */}
            {!isOwn && !isDM && (
              <header className="mb-0.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[var(--color-accent)]">
                  {name}
                </span>
                {p?.is_verified && (
                  <BadgeCheck
                    className="h-3.5 w-3.5 text-[var(--color-accent)]"
                    aria-label="Verified"
                  />
                )}
                {role && (
                  <span className="rounded-sm bg-[var(--color-surface-secondary)] px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {role}
                  </span>
                )}
                <time
                  dateTime={m.created_at}
                  className="text-[10px] text-[var(--color-text-muted)]"
                >
                  {format(new Date(m.created_at), "HH:mm")}
                </time>
                {m.is_edited && (
                  <span className="text-[9px] text-[var(--color-text-muted)]">
                    (edited)
                  </span>
                )}
              </header>
            )}

            {hasReplyQuote && (
              <ReplyQuote
                body={m.reply_to_body!}
                sender={m.reply_to_sender || "Member"}
                isOwn={isOwn}
              />
            )}

            {m.body?.trim() && (
              <div className={cn("pr-10", (isOwn || isDM) && "pt-0.5")}>
                <MessageRichBody body={m.body} />
              </div>
            )}

            {attachments.length > 0 && (
              <div
                className={cn(
                  "mt-1.5 flex flex-col gap-2",
                  isOwn && "items-end"
                )}
              >
                {attachments.map((a) => (
                  <FileAttachmentCard
                    key={a.url}
                    attachment={a}
                    isOwn={isOwn}
                    compact={compact}
                  />
                ))}
              </div>
            )}

            {linkPreview && (
              <a
                href={linkPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "mt-1.5 block overflow-hidden rounded-sm border",
                  "border-[var(--color-border)] bg-[var(--color-surface)]"
                )}
              >
                {linkPreview.image && (
                  <Image
                    src={linkPreview.image}
                    alt=""
                    width={280}
                    height={140}
                    className="h-32 w-full object-cover"
                    loading="lazy"
                    unoptimized
                  />
                )}
                <div className="px-2.5 py-1.5">
                  <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    <LinkIcon className="h-3 w-3" />
                    {linkPreview.siteName || linkPreviewHost}
                  </p>
                  {linkPreview.title && (
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-[var(--color-text-primary)]">
                      {linkPreview.title}
                    </p>
                  )}
                  {linkPreview.description && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-text-muted)]">
                      {linkPreview.description}
                    </p>
                  )}
                </div>
              </a>
            )}

            {/* Timestamp corner (own / DM) */}
            <div className="pointer-events-none absolute bottom-1 right-1.5 flex items-center gap-1">
              {m.is_pinned && (
                <Pin className="h-3 w-3 text-[var(--color-accent)]" aria-label="Pinned" />
              )}
              {(isOwn || isDM) && m.is_edited && (
                <span className="text-[9px] text-[var(--color-text-muted)]">edited</span>
              )}
              {(isOwn || isDM || !role) && (isOwn || isDM) && (
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {format(new Date(m.created_at), "HH:mm")}
                </span>
              )}
              {isOwn && (
                <CheckCheck className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              )}
            </div>
          </div>

          {/* Reactions */}
          {Object.values(reactions).some((ids) => ids.length > 0) && (
            <div
              className={cn(
                "mt-0.5 flex flex-wrap items-center gap-1",
                isOwn && "justify-end"
              )}
            >
              {Object.entries(reactions).map(([emoji, ids]) =>
                ids.length ? (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleReaction(m.id, emoji)}
                    className={cn(
                      "rounded-sm border px-2 py-0.5 text-[11px] transition-colors",
                      "text-[var(--color-text-primary)]",
                      userReacted(emoji)
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                        : "border-transparent bg-[var(--color-surface)] hover:border-[var(--color-border)]"
                    )}
                  >
                    {emoji} {ids.length}
                  </button>
                ) : null
              )}
            </div>
          )}

          {/* Thread preview */}
          {isRoot && !isDM && replyCount > 0 && (
            <ThreadPreview message={m} onOpen={onOpenThread} />
          )}

          {/* Footer actions */}
          <footer
            className={cn(
              "mt-0.5 flex flex-wrap items-center gap-0.5",
              "opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100",
              isOwn && "justify-end"
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`React with ${emoji}`}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-sm text-base leading-none",
                  "transition-colors hover:bg-[var(--color-border)]"
                )}
                onClick={() => onToggleReaction(m.id, emoji)}
              >
                {emoji}
              </button>
            ))}

            <ActionChip icon={Reply} label="Reply" onClick={() => onReply(m)} />
            {isRoot && !isDM && (
              <ActionChip
                label={replyCount > 0 ? `${replyCount} in thread` : "Thread"}
                onClick={onOpenThread}
              />
            )}
            <ActionChip icon={Share2} label="Share" onClick={share} />
            <ActionChip
              icon={Bookmark}
              label={bookmarked ? "Saved" : "Bookmark"}
              onClick={onBookmark}
              active={bookmarked}
            />
            <ActionChip icon={Copy} label="Copy link" onClick={copyLink} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More message actions"
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-sm",
                    "text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]"
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isOwn ? "end" : "start"}
                className="z-[10055] min-w-[11rem] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg"
              >
                <MenuItem icon={Reply} label="Reply" onClick={() => onReply(m)} />
                <MenuItem
                  icon={Quote}
                  label="Quote"
                  onClick={() => (onQuote ? onQuote(m) : onReply(m))}
                />
                <MenuItem
                  icon={Forward}
                  label="Forward"
                  onClick={() => copyLink()}
                />
                {isStaff && isRoot && !isDM && onTogglePin && (
                  <MenuItem
                    icon={m.is_pinned ? PinOff : Pin}
                    label={m.is_pinned ? "Unpin" : "Pin"}
                    onClick={() => onTogglePin(m.id, !m.is_pinned)}
                  />
                )}
                <MenuItem
                  icon={Bookmark}
                  label={bookmarked ? "Remove bookmark" : "Bookmark"}
                  onClick={onBookmark}
                />
                <MenuItem icon={Copy} label="Copy link" onClick={copyLink} />
                <MenuItem icon={Copy} label="Copy text" onClick={copyText} />
                <MenuItem
                  icon={Languages}
                  label="Translate"
                  onClick={() => onOpenAi?.(m)}
                />
                {onOpenAi && (
                  <MenuItem
                    icon={Sparkles}
                    label="AI"
                    onClick={() => onOpenAi(m)}
                  />
                )}
                <DropdownMenuSeparator className="my-1 h-px bg-[var(--color-border)]" />
                {isOwn && (
                  <>
                    <MenuItem icon={Pencil} label="Edit" onClick={() => onEdit(m)} />
                    <MenuItem
                      icon={Trash2}
                      label="Delete"
                      danger
                      onClick={() => onDelete(m.id)}
                    />
                  </>
                )}
                {!isOwn && onReport && (
                  <MenuItem
                    icon={Flag}
                    label="Report"
                    onClick={() => onReport(m.id)}
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </footer>
        </div>
      </div>
    </article>
  );
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon?: typeof Reply;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
        "hover:bg-[var(--color-border)]",
        active
          ? "text-[var(--color-accent)]"
          : "text-[var(--color-text-muted)]"
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Reply;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenuItem
      className={cn(
        "flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "hover:bg-[var(--color-surface-secondary)]",
        danger
          ? "font-semibold text-[var(--color-danger)]"
          : "text-[var(--color-text-primary)]"
      )}
      onClick={onClick}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </DropdownMenuItem>
  );
}

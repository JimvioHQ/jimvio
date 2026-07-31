"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
  BadgeCheck,
  BookMarked,
  Bookmark,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
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
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  parseCommerceEmbed,
  useCreatorCommerceStore,
} from "@/lib/community/commerce";
import { MessageCommerceEmbed } from "@/components/community/commerce/MessageCommerceEmbed";
import { toast } from "sonner";
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
import {
  ANSWER_PICKS,
  ANSWER_PICK_LABELS,
  type AnswerPick,
} from "@/lib/community/knowledge";
import { AnswerBadge } from "@/components/community/knowledge/KnowledgeCardView";
import { ReplyQuote } from "../ReplyQuote";
import { MessageRichBody } from "./MessageRichBody";
import { FileAttachmentCard } from "./FileAttachmentCard";
import { ThreadPreview } from "./ThreadPreview";

export type MessageCardProps = {
  m: Msg;
  compact?: boolean;
  /** Space Discussion: wide card layout matching Jimvio mockup. */
  variant?: "default" | "discussion";
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
  onConvertToKnowledge?: (msg: Msg) => void;
  onConvertToTask?: (msg: Msg) => void;
  onAttachCommerce?: (msg: Msg) => void;
  onMarkAnswer?: (msg: Msg, pick: import("@/lib/community/knowledge").AnswerPick) => void;
  answerPick?: import("@/lib/community/knowledge").AnswerPick | null;
  communityId?: string | null;
  canManageCommerce?: boolean;
};

export function MessageCard({
  m,
  compact,
  variant = "default",
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
  onConvertToKnowledge,
  onConvertToTask,
  onAttachCommerce,
  onMarkAnswer,
  answerPick,
  communityId,
  canManageCommerce,
}: MessageCardProps) {
  const discussion = variant === "discussion";
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
  const commerceEmbed = parseCommerceEmbed(m);
  const featureInCommunity = useCreatorCommerceStore((s) => s.featureInCommunity);
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
    toast.success(next ? "Message bookmarked" : "Bookmark removed");
  }

  return (
    <article
      id={`msg-${m.id}`}
      tabIndex={-1}
      aria-label={`Message from ${name}`}
      className={cn(
        "group flex w-full scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        discussion ? "mb-3 justify-center sm:mb-4" : "mb-0.5",
        !discussion && (isOwn ? "justify-end" : "justify-start"),
        compact && !discussion && "pl-3"
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          discussion
            ? "w-[92%] max-w-none sm:w-[90%]"
            : cn("max-w-[min(100%,28rem)] gap-2", isOwn && "flex-row-reverse")
        )}
      >
        {/* Avatar */}
        {(discussion || (!isOwn && !compact)) && (
          <div
            className={cn(
              "shrink-0 overflow-hidden rounded-full",
              discussion
                ? "mt-1 h-10 w-10 border border-white bg-gray-50 shadow-[0_4px_12px_rgba(15,23,42,0.08)] ring-2 ring-white"
                : "mt-1 h-8 w-8 border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
            )}
          >
            {p?.avatar_url ? (
              <Image
                src={p.avatar_url}
                alt={name}
                width={discussion ? 40 : 32}
                height={discussion ? 40 : 32}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 text-[10px] font-bold text-white">
                {(name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "?").toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className={cn("min-w-0 flex-1", !discussion && isOwn && "flex flex-col items-end")}>
          {/* Bubble / Card */}
          <div
            className={cn(
              "relative transition-shadow duration-200",
              discussion
            ? "rounded-[1.25rem] bg-white px-4 pb-4 pt-3.5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] ring-1 ring-gray-100/90 transition duration-200 group-hover:-translate-y-px group-hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
            : cn(
                    "px-3 pb-2.5 pt-2 shadow-sm group-hover:shadow-md",
                    isOwn
                      ? "rounded-br-sm rounded-bl-lg rounded-t-lg bg-[var(--color-accent-light)]"
                      : "rounded-bl-sm rounded-br-lg rounded-t-lg bg-[var(--color-surface)]"
                  )
            )}
          >
            {/* Header */}
            {(discussion || (!isOwn && !isDM)) && (
              <header className={cn("flex flex-wrap items-center gap-1.5", discussion ? "mb-1.5" : "mb-0.5")}>
                <span
                  className={cn(
                    "font-semibold",
                    discussion
                      ? "text-[14px] text-gray-900"
                      : "text-[11px] text-[var(--color-accent)]"
                  )}
                >
                  {name}
                </span>
                {p?.is_verified && (
                  <BadgeCheck
                    className={cn(
                      discussion ? "h-4 w-4 text-[#3b82f6]" : "h-3.5 w-3.5 text-[var(--color-accent)]"
                    )}
                    fill={discussion ? "currentColor" : undefined}
                    strokeWidth={discussion ? 0 : undefined}
                    aria-label="Verified"
                  />
                )}
                {role && (
                  <span
                    className={cn(
                      "font-semibold uppercase tracking-wide",
                      discussion
                        ? "rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-600"
                        : "rounded-sm bg-[var(--color-surface-secondary)] px-1.5 py-px text-[9px] text-[var(--color-text-muted)]"
                    )}
                  >
                    {role}
                  </span>
                )}
                <time
                  dateTime={m.created_at}
                  className={cn(
                    discussion
                      ? "text-[12px] text-gray-400"
                      : "text-[10px] text-[var(--color-text-muted)]"
                  )}
                >
                  {format(new Date(m.created_at), discussion ? "h:mm a" : "HH:mm")}
                </time>
                {m.is_edited && (
                  <span className="text-[9px] text-[var(--color-text-muted)]">
                    (edited)
                  </span>
                )}
              </header>
            )}

            {answerPick && (
              <div className="mb-1.5">
                <AnswerBadge pick={answerPick} />
              </div>
            )}

            {hasReplyQuote && (
              <ReplyQuote
                body={m.reply_to_body!}
                sender={m.reply_to_sender || "Member"}
                isOwn={!discussion && isOwn}
              />
            )}

            {m.body?.trim() && (
              <div className={cn(!discussion && "pr-10", (isOwn || isDM) && !discussion && "pt-0.5")}>
                <MessageRichBody
                  body={m.body}
                  className={
                    discussion
                      ? "text-[15px] leading-relaxed text-gray-800"
                      : undefined
                  }
                />
              </div>
            )}

            {commerceEmbed && (
              <div className={cn("mt-1.5", !discussion && isOwn && "flex justify-end")}>
                <MessageCommerceEmbed embed={commerceEmbed} compact />
              </div>
            )}

            {attachments.length > 0 && (
              <div
                className={cn(
                  "mt-1.5 flex flex-col gap-2",
                  !discussion && isOwn && "items-end"
                )}
              >
                {attachments.map((a) => (
                  <FileAttachmentCard
                    key={a.url}
                    attachment={a}
                    isOwn={!discussion && isOwn}
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
                  "mt-2 block overflow-hidden rounded-xl border",
                  discussion
                    ? "border-gray-100 bg-gray-50/80 shadow-sm"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
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

            {/* Timestamp corner (own / DM) — default only */}
            {!discussion && (
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
            )}

            {/* Reactions inside discussion card */}
            {discussion &&
              Object.values(reactions).some((ids) => ids.length > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {Object.entries(reactions).map(([emoji, ids]) =>
                    ids.length ? (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onToggleReaction(m.id, emoji)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[12px] transition-colors ring-1",
                          userReacted(emoji)
                            ? "bg-[var(--color-accent)]/10 text-gray-800 ring-[var(--color-accent)]/25"
                            : "bg-gray-50 text-gray-700 ring-gray-100 hover:bg-gray-100"
                        )}
                      >
                        {emoji} {ids.length}
                      </button>
                    ) : null
                  )}
                </div>
              )}
          </div>

          {/* Reactions — default layout */}
          {!discussion &&
            Object.values(reactions).some((ids) => ids.length > 0) && (
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
              "mt-1.5 flex flex-wrap items-center gap-0.5",
              "opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100",
              !discussion && isOwn && "justify-end"
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`React with ${emoji}`}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-base leading-none sm:h-8 sm:w-8",
                  "transition-colors hover:bg-[var(--color-border)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
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
            <ActionChip
              icon={Bookmark}
              label={bookmarked ? "Saved" : "Bookmark"}
              onClick={onBookmark}
              active={bookmarked}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More message actions"
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-lg sm:h-8 sm:w-8",
                    "text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={discussion || !isOwn ? "start" : "end"}
                className="z-[10055] min-w-[11rem] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg"
              >
                <MenuItem icon={Reply} label="Reply" onClick={() => onReply(m)} />
                <MenuItem
                  icon={Quote}
                  label="Quote"
                  onClick={() => (onQuote ? onQuote(m) : onReply(m))}
                />
                <MenuItem
                  icon={Share2}
                  label="Share"
                  onClick={() => share()}
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
                {isStaff && onConvertToKnowledge && (
                  <MenuItem
                    icon={BookMarked}
                    label="Convert to Knowledge"
                    onClick={() => onConvertToKnowledge(m)}
                  />
                )}
                {isStaff && onConvertToTask && (
                  <MenuItem
                    icon={CheckSquare}
                    label="Convert to Task"
                    onClick={() => onConvertToTask(m)}
                  />
                )}
                {canManageCommerce && onAttachCommerce && !commerceEmbed && (
                  <MenuItem
                    icon={ShoppingBag}
                    label="Attach commerce"
                    onClick={() => onAttachCommerce(m)}
                  />
                )}
                {canManageCommerce && commerceEmbed && communityId && (
                  <MenuItem
                    icon={ShoppingBag}
                    label="Feature in community store"
                    onClick={() => {
                      featureInCommunity({
                        communityId,
                        embed: commerceEmbed,
                        createdBy: userId,
                        featured: true,
                      });
                      toast.success("Featured in community store");
                    }}
                  />
                )}
                {isStaff && onMarkAnswer && (
                  <>
                    <DropdownMenuSeparator className="my-1 h-px bg-[var(--color-border)]" />
                    {ANSWER_PICKS.map((pick) => (
                      <MenuItem
                        key={pick}
                        icon={CheckCircle2}
                        label={ANSWER_PICK_LABELS[pick as AnswerPick]}
                        onClick={() => onMarkAnswer(m, pick as AnswerPick)}
                      />
                    ))}
                  </>
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

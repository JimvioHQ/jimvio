"use client";

import { useState } from "react";
import {
  Check,
  CheckCheck,
  Download,
  FileText,
  Heart,
  MoreHorizontal,
  Reply,
  SmilePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import { WaAudioPlayer } from "@/components/community/chat/WaAudioPlayer";
import type { HubChatMessage } from "./types";
import {
  formatFileSize,
  formatMessageTime,
  isAudioAttachment,
  isImageAttachment,
  isVideoAttachment,
} from "./utils";

const QUICK_EMOJIS = ["❤️", "🔥", "😂", "👍", "🙏"];

export function MessageBubble({
  msg,
  mine,
  showAvatar,
  peerName,
  peerAvatar,
  onReply,
  onReact,
  onOpenThread,
  onOpenMedia,
}: {
  msg: HubChatMessage;
  mine: boolean;
  showAvatar: boolean;
  peerName: string;
  peerAvatar: string | null;
  onReply?: (msg: HubChatMessage) => void;
  onReact?: (msg: HubChatMessage, emoji: string) => void;
  onOpenThread?: (msg: HubChatMessage) => void;
  onOpenMedia?: (url: string, kind: "image" | "video") => void;
}) {
  const [showReact, setShowReact] = useState(false);
  const time = formatMessageTime(msg.created_at);
  const reactionEntries = Object.entries(msg.reactions).filter(([, n]) => n > 0);
  const primary = msg.attachments[0];
  const audioUrl =
    msg.message_type === "audio" || (primary && isAudioAttachment(primary, msg.message_type))
      ? primary?.url
      : undefined;

  return (
    <div
      className={cn("group flex gap-2", mine ? "justify-end" : "justify-start")}
      onMouseLeave={() => setShowReact(false)}
    >
      {!mine && showAvatar ? (
        <HubAvatar name={peerName} src={peerAvatar} size={28} className="mt-1 shrink-0" />
      ) : !mine ? (
        <div className="w-7 shrink-0" />
      ) : null}

      <div className={cn("relative max-w-[min(72%,420px)]", mine ? "items-end" : "items-start")}>
        {msg.reply_to_body && (
          <div
            className={cn(
              "mb-1 rounded-xl border-l-2 px-2.5 py-1.5 text-[11px]",
              mine
                ? "border-emerald-500 bg-emerald-50/80 text-emerald-900"
                : "border-[var(--color-accent,#fd5000)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
            )}
          >
            <p className="font-bold">{msg.reply_to_sender ?? "Reply"}</p>
            <p className="line-clamp-2 opacity-80">{msg.reply_to_body}</p>
          </div>
        )}

        {audioUrl ? (
          <div
            className={cn(
              "rounded-2xl px-3 py-2 shadow-sm",
              mine ? "bg-emerald-100" : "border border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-secondary)]"
            )}
          >
            <WaAudioPlayer src={audioUrl} isOwn={mine} />
          </div>
        ) : primary && (isImageAttachment(primary) || isVideoAttachment(primary)) && primary.url ? (
          <button
            type="button"
            onClick={() =>
              onOpenMedia?.(
                primary.url!,
                isVideoAttachment(primary) ? "video" : "image"
              )
            }
            className="block overflow-hidden rounded-2xl shadow-sm"
          >
            {isVideoAttachment(primary) ? (
              <video
                src={primary.url}
                className="max-h-64 max-w-full object-cover"
                muted
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primary.url}
                alt={primary.name ?? "Shared media"}
                loading="lazy"
                className="max-h-72 max-w-full object-cover"
              />
            )}
          </button>
        ) : primary && (msg.message_type === "file" || primary.name) ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm",
              mine
                ? "border-emerald-200 bg-emerald-50"
                : "border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-secondary)]"
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold">{primary.name ?? (msg.body || "File")}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {formatFileSize(primary.size) || "Attachment"}
              </p>
            </div>
            {primary.url && (
              <a
                href={primary.url}
                download
                target="_blank"
                rel="noreferrer"
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-black/5 hover:text-[var(--color-accent,#fd5000)]"
                aria-label="Download file"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm",
              mine
                ? "rounded-br-md bg-emerald-100 text-zinc-900"
                : "rounded-bl-md border border-[var(--color-border)]/70 bg-white text-[var(--color-text-primary)] dark:bg-[var(--color-surface-secondary)]"
            )}
          >
            {msg.body}
            {msg.is_edited && (
              <span className="ml-1 text-[10px] text-[var(--color-text-muted)]">(edited)</span>
            )}
          </div>
        )}

        <div
          className={cn(
            "mt-1 flex flex-wrap items-center gap-1.5",
            mine ? "justify-end" : "justify-start"
          )}
        >
          {reactionEntries.length > 0 && (
            <div className="flex items-center gap-1">
              {reactionEntries.map(([emoji, count]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact?.(msg, emoji)}
                  className="inline-flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[11px] shadow-sm transition-transform hover:scale-105"
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[10px] text-[var(--color-text-muted)]">{count}</span>}
                </button>
              ))}
            </div>
          )}
          <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">{time}</span>
          {mine && (
            <span className="inline-flex text-[var(--color-text-muted)]">
              {msg.deliveryStatus === "seen" || msg.deliveryStatus === "delivered" ? (
                <CheckCheck
                  className={cn(
                    "h-3.5 w-3.5",
                    msg.deliveryStatus === "seen" ? "text-sky-500" : "text-[var(--color-text-muted)]"
                  )}
                />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </span>
          )}
        </div>

        <div
          className={cn(
            "absolute -top-3 flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 opacity-0 shadow-md transition-opacity group-hover:opacity-100",
            mine ? "left-0" : "right-0"
          )}
        >
          <button
            type="button"
            className="rounded-full p-1.5 hover:bg-[var(--color-surface-secondary)]"
            aria-label="Reply"
            onClick={() => onReply?.(msg)}
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-full p-1.5 hover:bg-[var(--color-surface-secondary)]"
            aria-label="React"
            onClick={() => setShowReact((v) => !v)}
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
          {(msg.reply_count ?? 0) > 0 || onOpenThread ? (
            <button
              type="button"
              className="rounded-full p-1.5 hover:bg-[var(--color-surface-secondary)]"
              aria-label="Open thread"
              onClick={() => onOpenThread?.(msg)}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {showReact && (
          <div
            className={cn(
              "absolute z-10 flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 shadow-lg",
              mine ? "left-0 top-6" : "right-0 top-6"
            )}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="text-[16px] transition-transform hover:scale-125"
                onClick={() => {
                  onReact?.(msg, emoji);
                  setShowReact(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {!mine && reactionEntries.some(([e]) => e === "❤️") && (
          <Heart className="absolute -right-1 -bottom-1 h-3 w-3 fill-red-400 text-red-400 opacity-0" />
        )}
      </div>
    </div>
  );
}

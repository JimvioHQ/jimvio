"use client";

import React from "react";
import Link from "next/link";
import { Package, FileText, Image as ImageIcon, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MessageRow = {
  id: string;
  body: string | null;
  sender_id: string;
  created_at: string;
  message_type?: string | null;
  reply_to_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

const EMOJI_LIST = ["👍", "❤️", "😂", "😊", "🎉", "✅", "📦", "💼", "🔥", "⭐"];

function PreviewText({ msg }: { msg: MessageRow }) {
  if (msg.message_type === "product") return <>Shared a product</>;
  if (msg.message_type === "quote_request") return <>Quote request</>;
  if (msg.message_type === "quote_reply") return <>Sent an offer</>;
  if (msg.message_type === "image") return <>Sent an image</>;
  if (msg.message_type === "file") return <>Sent a file</>;
  return <>{msg.body || ""}</>;
}

export function MessageBubble({
  msg,
  isOwn,
  replyToMsg,
  onReply,
  onReact,
}: {
  msg: MessageRow;
  isOwn: boolean;
  replyToMsg?: MessageRow | null;
  onReply?: (msg: MessageRow) => void;
  onReact?: (msg: MessageRow, emoji: string) => void;
}) {
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const meta = (msg.metadata ?? {}) as Record<string, string | number>;

  return (
    <div
      className={cn(
        "group max-w-[85%] sm:max-w-[75%] rounded-2xl overflow-hidden",
        isOwn ? "ml-auto" : "mr-auto"
      )}
    >
      {/* Reply-to preview */}
      {replyToMsg && (
        <div className={cn(
          "px-3 py-1.5 border-l-2 text-xs",
          isOwn ? "bg-white/20 border-white/50" : "bg-ink-darker/5 border-[var(--color-border)]"
        )}>
          <p className="font-medium truncate">{replyToMsg.sender_id === msg.sender_id ? "You" : "Them"}</p>
          <p className="truncate text-[var(--color-text-muted)]"><PreviewText msg={replyToMsg} /></p>
        </div>
      )}

      {/* Content by type */}
      {msg.message_type === "product" && meta.product_id && (
        <div className={cn(
          "p-3 rounded-2xl",
          isOwn ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
        )}>
          <div className="flex gap-3">
            {meta.image && (
              <img src={String(meta.image)} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{String(meta.name ?? "Product")}</p>
              <p className="text-sm opacity-90">{typeof meta.price === "number" ? meta.price.toLocaleString() : meta.price} RWF</p>
              <Link href={`/marketplace/${meta.slug ?? meta.product_id}`} className="inline-block mt-2">
                <Button size="sm" variant={isOwn ? "secondary" : "default"} className="rounded-lg h-8 text-xs">
                  View Product
                </Button>
              </Link>
            </div>
          </div>
          {msg.body && <p className="mt-2 text-sm opacity-90 whitespace-pre-wrap">{msg.body}</p>}
          <p className={cn("text-xs mt-2", isOwn ? "text-white/80" : "text-[var(--color-text-muted)]")}>{time}</p>
        </div>
      )}

      {msg.message_type === "quote_request" && (
        <div className={cn(
          "p-4 rounded-2xl border",
          isOwn ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Quote className="h-4 w-4" />
            <span className="font-semibold text-sm">Quote Request</span>
          </div>
          <ul className="text-sm space-y-1 opacity-90">
            {meta.quantity != null && <li>Quantity: {meta.quantity}</li>}
            {meta.expected_price != null && <li>Expected price: {String(meta.expected_price)}</li>}
            {meta.delivery_country && <li>Delivery: {String(meta.delivery_country)}</li>}
          </ul>
          {msg.body && <p className="mt-2 text-sm opacity-90">{msg.body}</p>}
          <p className={cn("text-xs mt-2", isOwn ? "text-white/80" : "text-[var(--color-text-muted)]")}>{time}</p>
        </div>
      )}

      {msg.message_type === "quote_reply" && (
        <div className={cn(
          "p-4 rounded-2xl border",
          isOwn ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Quote className="h-4 w-4" />
            <span className="font-semibold text-sm">
              {meta.status === "accepted" ? "Offer accepted" : meta.status === "rejected" ? "Offer declined" : "Offer"}
            </span>
          </div>
          <ul className="text-sm space-y-1 opacity-90">
            {meta.offer_price != null && <li>Offer price: {String(meta.offer_price)}</li>}
            {meta.delivery_time && <li>Delivery: {String(meta.delivery_time)}</li>}
          </ul>
          {msg.body && <p className="mt-2 text-sm opacity-90">{msg.body}</p>}
          <p className={cn("text-xs mt-2", isOwn ? "text-white/80" : "text-[var(--color-text-muted)]")}>{time}</p>
        </div>
      )}

      {msg.message_type === "image" && meta.url && (
        <div className={cn(
          "p-2 rounded-2xl",
          isOwn ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-secondary)]"
        )}>
          <a href={String(meta.url)} target="_blank" rel="noopener noreferrer" className="block">
            <img src={String(meta.url)} alt="" className="rounded-xl max-h-64 object-cover" />
          </a>
          {msg.body && <p className="mt-2 text-sm px-1 whitespace-pre-wrap">{msg.body}</p>}
          <p className={cn("text-xs mt-1 px-1", isOwn ? "text-white/80" : "text-[var(--color-text-muted)]")}>{time}</p>
        </div>
      )}

      {msg.message_type === "file" && meta.url && (
        <div className={cn(
          "p-3 rounded-2xl flex items-center gap-3",
          isOwn ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-secondary)]"
        )}>
          <FileText className="h-8 w-8 shrink-0 opacity-80" />
          <div className="min-w-0 flex-1">
            <a href={String(meta.url)} target="_blank" rel="noopener noreferrer" className="font-medium truncate block hover:underline">
              {String(meta.file_name ?? "File")}
            </a>
            {msg.body && <p className="text-sm opacity-90 truncate">{msg.body}</p>}
          </div>
          <p className={cn("text-xs shrink-0", isOwn ? "text-white/80" : "text-[var(--color-text-muted)]")}>{time}</p>
        </div>
      )}

      {(msg.message_type === "text" || !msg.message_type) && (
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isOwn ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{msg.body || ""}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(msg)}
                className={cn("text-xs opacity-70 hover:opacity-100", isOwn ? "text-white/80" : "text-[var(--color-text-muted)]")}
              >
                Reply
              </button>
            )}
            <span className={cn("text-xs", isOwn ? "text-white/80" : "text-[var(--color-text-muted)]")}>{time}</span>
          </div>
        </div>
      )}

      {/* Reply/React for non-text shown as card */}
      {(msg.message_type === "product" || msg.message_type === "quote_request" || msg.message_type === "quote_reply" || msg.message_type === "image" || msg.message_type === "file") && onReply && (
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={() => onReply(msg)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            Reply
          </button>
        </div>
      )}
    </div>
  );
}

export { EMOJI_LIST };

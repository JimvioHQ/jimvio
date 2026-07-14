"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";
import type { ParsedCampaign, ParsedCommunity, ParsedLink, ParsedProduct } from "@/lib/ai/chat-shared";
import { AiMessageMarkdown } from "./ai-message-markdown";
import { AiRecommendationCards } from "./ai-recommendation-cards";
import { AiEarningsCalculator } from "./ai-earnings-calculator";

export interface AiChatMessageData {
  id: string;
  role: "user" | "ai";
  content: string;
  thinking?: boolean;
  products?: ParsedProduct[];
  campaigns?: ParsedCampaign[];
  communities?: ParsedCommunity[];
  links?: ParsedLink[];
  followups?: string[];
  showCalculator?: boolean;
  feedback?: "up" | "down" | null;
}

function ThinkingBubble() {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] px-4 py-3">
      <div className="flex items-center gap-1">
        {[0, 120, 240].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full animate-bounce"
            style={{ background: JIMVIO_ORANGE, animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span className="text-[12px] font-medium text-[var(--color-text-muted)]">Jimvio AI is typing…</span>
    </div>
  );
}

interface AiChatMessageProps {
  message: AiChatMessageData;
  onNavigate: (href: string) => void;
  onClose?: () => void;
  onRegenerate?: (id: string) => void;
  onFollowup?: (text: string) => void;
  onFeedback?: (id: string, feedback: "up" | "down") => void;
}

export function AiChatMessage({
  message: msg,
  onNavigate,
  onClose,
  onRegenerate,
  onFollowup,
  onFeedback,
}: AiChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!msg.content.trim()) return;
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="size-8 shrink-0 border border-[#FFE0D1]">
        <AvatarFallback
          className={cn(
            "text-[10px] font-bold",
            msg.role === "user"
              ? "text-white"
              : "bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
          )}
          style={msg.role === "user" ? { background: JIMVIO_ORANGE } : undefined}
        >
          {msg.role === "user" ? "You" : <Sparkles className="size-3.5" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "min-w-0 max-w-[min(100%,820px)] space-y-2",
          msg.role === "user" ? "items-end text-right" : "items-start text-left"
        )}
      >
        {msg.thinking && !msg.content.trim() && <ThinkingBubble />}

        {msg.content.trim() && (
          <div
            className={cn(
              "rounded-xl px-4 py-3",
              msg.role === "user"
                ? "text-white"
                : "border border-[#FFE0D1] bg-[#FFFDFB] text-[var(--color-text-secondary)]"
            )}
            style={msg.role === "user" ? { background: JIMVIO_ORANGE } : undefined}
          >
            {msg.role === "ai" ? (
              <AiMessageMarkdown content={msg.content} onNavigate={onNavigate} />
            ) : (
              <p className="text-[14px] leading-relaxed">{msg.content}</p>
            )}
            {msg.role === "ai" && msg.thinking && (
              <span
                className="ml-0.5 inline-block h-4 w-0.5 animate-pulse"
                style={{ background: JIMVIO_ORANGE }}
              />
            )}
          </div>
        )}

        {msg.role === "ai" && !msg.thinking && msg.content.trim() && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-[#FFE0D1] px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent)]/5 hover:text-[var(--color-text-primary)]"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            {onRegenerate && (
              <button
                type="button"
                onClick={() => onRegenerate(msg.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#FFE0D1] px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent)]/5 hover:text-[var(--color-text-primary)]"
              >
                <RefreshCw className="size-3" />
                Regenerate
              </button>
            )}
            <button
              type="button"
              onClick={() => onFeedback?.(msg.id, "up")}
              className={cn(
                "rounded-lg border border-[#FFE0D1] p-1 transition-colors hover:bg-[var(--color-accent)]/5",
                msg.feedback === "up" && "bg-[var(--color-accent)]/10"
              )}
              aria-label="Helpful"
            >
              <ThumbsUp className="size-3 text-[var(--color-text-muted)]" />
            </button>
            <button
              type="button"
              onClick={() => onFeedback?.(msg.id, "down")}
              className={cn(
                "rounded-lg border border-[#FFE0D1] p-1 transition-colors hover:bg-[var(--color-accent)]/5",
                msg.feedback === "down" && "bg-[var(--color-accent)]/10"
              )}
              aria-label="Not helpful"
            >
              <ThumbsDown className="size-3 text-[var(--color-text-muted)]" />
            </button>
          </div>
        )}

        {msg.links && msg.links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {msg.links.map((link) => (
              <button
                key={link.href + link.label}
                type="button"
                onClick={() => onNavigate(link.href)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: JIMVIO_ORANGE }}
              >
                {link.label}
                <ArrowRight className="size-3" />
              </button>
            ))}
          </div>
        )}

        <AiRecommendationCards
          products={msg.products}
          campaigns={msg.campaigns}
          communities={msg.communities}
          onClose={onClose}
        />

        {msg.showCalculator && <AiEarningsCalculator />}

        {msg.followups && msg.followups.length > 0 && !msg.thinking && (
          <div className="flex flex-wrap gap-2 pt-1">
            {msg.followups.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onFollowup?.(q)}
                className="rounded-full border border-[#FFE0D1] bg-[#FFFDFB] px-3 py-1.5 text-left text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

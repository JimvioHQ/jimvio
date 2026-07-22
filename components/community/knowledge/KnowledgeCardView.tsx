"use client";

import { BookOpen, CheckCircle2, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KnowledgeCard } from "@/lib/community/knowledge";
import {
  ANSWER_PICK_LABELS,
  KNOWLEDGE_KIND_LABELS,
  type AnswerPick,
} from "@/lib/community/knowledge";
import { formatDistanceToNow } from "date-fns";

export function AnswerBadge({
  pick,
  className,
}: {
  pick: AnswerPick;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        pick === "accepted" || pick === "verified"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]",
        className
      )}
    >
      <CheckCircle2 className="h-3 w-3" />
      {ANSWER_PICK_LABELS[pick]}
    </span>
  );
}

export function KnowledgeCardView({
  card,
  onJump,
  compact,
}: {
  card: KnowledgeCard;
  onJump?: (messageId: string | null) => void;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
        "transition-shadow hover:shadow-sm",
        card.featured && "ring-1 ring-[var(--color-accent)]/30"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
          )}
        >
          {card.kind === "faq" ? (
            <Sparkles className="h-4 w-4" />
          ) : card.featured ? (
            <Star className="h-4 w-4" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-sm bg-[var(--color-surface-secondary)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {KNOWLEDGE_KIND_LABELS[card.kind]}
            </span>
            {card.featured && (
              <span className="text-[10px] font-semibold text-[var(--color-accent)]">
                Featured
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {card.title}
          </h3>
          <p
            className={cn(
              "mt-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]",
              compact ? "line-clamp-2" : "line-clamp-4"
            )}
          >
            {card.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
            {card.createdByName && <span>{card.createdByName}</span>}
            <span>
              {formatDistanceToNow(new Date(card.updatedAt), { addSuffix: true })}
            </span>
            {card.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-sm bg-[var(--color-surface-secondary)] px-1.5 py-px"
              >
                #{t}
              </span>
            ))}
          </div>
          {card.sourceMessageId && onJump && (
            <button
              type="button"
              onClick={() => onJump(card.sourceMessageId)}
              className="mt-2 text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              Jump to source
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

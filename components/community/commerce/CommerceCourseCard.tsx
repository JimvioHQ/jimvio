"use client";

import Link from "next/link";
import { Award, BookOpen, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommerceEmbed } from "@/lib/community/commerce";

export function CommerceCourseCard({
  embed,
  compact,
}: {
  embed: CommerceEmbed;
  compact?: boolean;
}) {
  const progress = Math.min(100, Math.max(0, embed.progress ?? 0));
  const enrolled = progress > 0;
  const href = embed.href || `/courses/${embed.id}`;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
        compact ? "max-w-[280px]" : "max-w-sm"
      )}
    >
      {embed.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={embed.imageUrl}
          alt=""
          className={cn("w-full object-cover", compact ? "h-24" : "h-32")}
        />
      )}
      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
          {embed.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          {embed.instructor && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {embed.instructor}
            </span>
          )}
          {embed.lessons != null && <span>{embed.lessons} lessons</span>}
          {embed.certificate && (
            <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
              <Award className="h-3 w-3" />
              Certificate
            </span>
          )}
        </div>
        {enrolled && (
          <div>
            <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {progress}% complete
            </p>
          </div>
        )}
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          <Play className="h-3 w-3" />
          {enrolled ? "Continue Learning" : "Enroll"}
        </Link>
      </div>
    </article>
  );
}

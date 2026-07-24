"use client";

import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveClipDraft } from "@/lib/community/live-network";

export function LiveClippingPanel({
  clips,
  onPublish,
  className,
}: {
  clips: LiveClipDraft[];
  onPublish: (id: string) => void;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Live clipping"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <Clapperboard className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        Live clipping
      </h3>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
        Highlights · Shorts · captions · titles · publish drafts.
      </p>
      <ul className="mt-3 space-y-2">
        {clips.map((clip) => (
          <li
            key={clip.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                {clip.title}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {clip.kind} · {clip.durationSec}s · {clip.status}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[11.5px] text-[var(--color-text-secondary)]">
                {clip.caption}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPublish(clip.id)}
              className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-[10px] font-semibold text-white"
            >
              Publish draft
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

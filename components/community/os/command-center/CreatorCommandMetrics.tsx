"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandCenterMetric } from "@/lib/community/os/command-center";

export function CreatorCommandMetrics({
  metrics,
  className,
}: {
  metrics: CommandCenterMetric[];
  className?: string;
}) {
  if (metrics.length === 0) return null;

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Creator command center metrics"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Command Center
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
          <Radio className="h-3 w-3" aria-hidden />
          Live
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {metrics.map((m) => (
          <Link
            key={m.id}
            href={m.href || "#"}
            className={cn(
              "group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
              "transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)]/35",
              "hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black",
                  m.tone
                )}
              >
                {m.label.charAt(0)}
              </span>
              {m.live && (
                <span className="relative mt-1 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
              )}
            </div>
            <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {m.label}
            </p>
            <p className="mt-0.5 truncate text-[16px] font-black tracking-tight text-[var(--color-text-primary)]">
              {m.value}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[10.5px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]">
              {m.hint}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

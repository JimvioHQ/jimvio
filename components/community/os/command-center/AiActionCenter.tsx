"use client";

import Link from "next/link";
import {
  Brain,
  CalendarPlus,
  Megaphone,
  MessageSquare,
  Radio,
  Rocket,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AiActionSuggestion,
  AiCtaAction,
} from "@/lib/community/os/command-center";

const CTA_ICONS: Record<string, typeof Megaphone> = {
  announce: Megaphone,
  event: CalendarPlus,
  live: Radio,
  message: MessageSquare,
  campaign: Rocket,
};

export function AiActionCenter({
  suggestions,
  ctas,
  className,
}: {
  suggestions: AiActionSuggestion[];
  ctas: AiCtaAction[];
  className?: string;
}) {
  if (suggestions.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI action center"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            <Brain className="h-3.5 w-3.5" aria-hidden />
            AI Action Center
          </p>
          <h3 className="mt-1 text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
            What to do next
          </h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-text-muted)]">
            Daily guidance, growth cues, and one-click creator actions.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-subtle)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
          <Sparkles className="h-3 w-3" aria-hidden />
          Auto
        </span>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {suggestions.slice(0, 9).map((s) => (
          <li key={s.id}>
            {s.href ? (
              <Link
                href={s.href}
                className="block h-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition hover:border-[var(--color-accent)]/40"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  {s.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[12.5px] font-medium text-[var(--color-text-primary)]">
                  {s.body}
                </p>
              </Link>
            ) : (
              <div className="h-full rounded-xl border border-[var(--color-border)] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  {s.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[12.5px] font-medium text-[var(--color-text-primary)]">
                  {s.body}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {ctas.map((a) => {
          const Icon = CTA_ICONS[a.id] ?? Sparkles;
          return (
            <Link
              key={a.id}
              href={a.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)]",
                "bg-[var(--color-surface-secondary)] px-3 py-1.5 text-[12px] font-semibold",
                "text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)]/40",
                "hover:text-[var(--color-accent)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {a.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

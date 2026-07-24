"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarPlus,
  Command,
  Megaphone,
  Package,
  Radio,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreatorQuickAction } from "@/lib/community/os/command-center";

const ICONS: Record<string, typeof Package> = {
  product: Package,
  course: BookOpen,
  community: UsersRound,
  live: Radio,
  event: CalendarPlus,
  invite: Users,
  campaign: Megaphone,
  "ai-post": Sparkles,
};

export function CreatorProductivityRail({
  actions,
  className,
}: {
  actions: CreatorQuickAction[];
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)} aria-label="Creator productivity">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Quick actions
        </h3>
        <p className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--color-text-muted)]">
          <Command className="h-3 w-3" aria-hidden />
          ⌘K search · shortcuts below
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((a) => {
          const Icon = ICONS[a.id] ?? Sparkles;
          return (
            <Link
              key={a.id}
              href={a.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-2xl border border-[var(--color-border)]",
                "bg-[var(--color-surface)] px-3 py-2.5 transition",
                "hover:-translate-y-0.5 hover:border-[var(--color-accent)]/35"
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                  {a.label}
                </span>
                {a.shortcut && (
                  <span className="mt-0.5 block font-mono text-[10px] text-[var(--color-text-muted)]">
                    {a.shortcut}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

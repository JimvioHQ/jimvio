"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveAiAssistItem } from "@/lib/community/live-network";

export function AiLiveAssistant({
  items,
  className,
}: {
  items: LiveAiAssistItem[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI live assistant"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <Bot className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        AI live assistant
      </h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
              {item.title}
            </p>
            <p className="mt-1 text-[12.5px] font-medium text-[var(--color-text-primary)]">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

import { MessageCircle, Megaphone, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveCommunitySignal } from "@/lib/community/live-network";

export function LiveCommunityPanel({
  signal,
  className,
}: {
  signal: LiveCommunitySignal;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Live community"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <MessageCircle className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        Live community
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ["Chat / min", String(signal.chatRate)],
          ["Q&A open", String(signal.qaOpen)],
          ["Reactions / min", String(signal.reactionsPerMin)],
          ["Poll", signal.pollActive ? "Live" : "Idle"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2"
          >
            <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
              {label}
            </p>
            <p className="text-[15px] font-black text-[var(--color-text-primary)]">{value}</p>
          </div>
        ))}
      </div>
      {signal.announcement && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--color-accent-subtle)] px-3 py-2 text-[12.5px] font-medium text-[var(--color-text-primary)]">
          <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
          {signal.announcement}
        </p>
      )}
      {signal.pinnedMessage && (
        <p className="mt-2 flex items-start gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
          <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
          {signal.pinnedMessage}
        </p>
      )}
      <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
        Chat · polls · Q&A · reactions · emoji rain · badges · mod tools — reuse hub live panels.
      </p>
    </section>
  );
}

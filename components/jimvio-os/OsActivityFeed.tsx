"use client";

import { Activity } from "lucide-react";
import { OS_ACTIVITY_SCAFFOLD } from "@/lib/jimvio-os";
import { cn } from "@/lib/utils";

const KIND_COLORS: Record<string, string> = {
  order: "#2563eb",
  sale: "#16a34a",
  affiliate: "#0891b2",
  ugc: "#7c3aed",
  community: "#ca8a04",
  campaign: "var(--color-accent-hover)",
  follower: "#db2777",
  review: "var(--color-accent)",
};

export function OsActivityFeed() {
  return (
    <section aria-label="Global activity feed" className="flex h-full flex-col">
      <header className="mb-3 flex items-center gap-2">
        <Activity className="size-4 text-[var(--color-accent)]" />
        <div>
          <p className="text-[12px] font-bold text-[var(--color-text-primary)]">Live Activity</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">Real-time ready UI · placeholder data</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-600">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          Live
        </span>
      </header>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto" role="list">
        {OS_ACTIVITY_SCAFFOLD.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30"
            style={{ willChange: "transform" }}
          >
            <span
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold uppercase text-white"
              style={{ background: KIND_COLORS[item.kind] ?? "#64748b" }}
              aria-hidden
            >
              {item.kind.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                {item.live && (
                  <span className={cn("size-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse")} aria-label="Live" />
                )}
              </div>
              <p className="truncate text-[11px] text-[var(--color-text-muted)]">{item.subtitle}</p>
            </div>
            <span className="shrink-0 text-[9px] text-[var(--color-text-muted)]">{item.time}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

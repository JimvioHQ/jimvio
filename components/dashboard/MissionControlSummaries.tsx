"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-sections";

export type MissionSummary = {
  id: string;
  title: string;
  value: string;
  sub: string;
  href: string;
  accent?: string;
};

type MissionControlSummariesProps = {
  summaries: MissionSummary[];
};

export function MissionControlSummaries({ summaries }: MissionControlSummariesProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaries.map((s) => (
        <DashboardPanel key={s.id} className="p-0 overflow-hidden">
          <Link
            href={s.href}
            className="flex h-full flex-col p-4 transition-colors hover:bg-[var(--color-surface-secondary)]/40"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                {s.title}
              </p>
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            </div>
            <p
              className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]"
              style={s.accent ? { color: s.accent } : undefined}
            >
              {s.value}
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{s.sub}</p>
          </Link>
        </DashboardPanel>
      ))}
    </div>
  );
}

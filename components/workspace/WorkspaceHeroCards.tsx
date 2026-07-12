"use client";

import Link from "next/link";
import { ArrowUpRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKSPACE_LIST, type WorkspaceId } from "@/lib/workspace/config";

export type WorkspaceCardStats = Partial<
  Record<
    WorkspaceId,
    {
      status: string;
      stat: string;
      statLabel: string;
      notifications?: number;
      recentActivity?: string;
    }
  >
>;

type WorkspaceHeroCardsProps = {
  stats?: WorkspaceCardStats;
  className?: string;
};

export function WorkspaceHeroCards({ stats = {}, className }: WorkspaceHeroCardsProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>
      {WORKSPACE_LIST.map((ws) => {
        const Icon = ws.icon;
        const meta = stats[ws.id];
        return (
          <article
            key={ws.id}
            className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--color-border-strong)] hover:shadow-md"
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.08]"
              style={{ background: ws.accent }}
            />
            <div className="flex items-start justify-between gap-3">
              <div
                className="grid h-11 w-11 place-items-center rounded-xl text-white"
                style={{ background: ws.accent }}
              >
                <Icon className="h-5 w-5" />
              </div>
              {meta?.notifications ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                  <Bell className="h-3 w-3" />
                  {meta.notifications}
                </span>
              ) : null}
            </div>

            <h3 className="mt-4 text-base font-bold text-[var(--color-text-primary)]">
              {ws.label}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              {ws.description}
            </p>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">
                  {meta?.stat ?? "—"}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {meta?.statLabel ?? meta?.status ?? "Ready"}
                </p>
              </div>
              <Link
                href={ws.href}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-white transition-opacity group-hover:opacity-90"
                style={{ background: ws.accent }}
              >
                {ws.cta}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {meta?.recentActivity && (
              <p className="mt-3 truncate border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-text-muted)]">
                {meta.recentActivity}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

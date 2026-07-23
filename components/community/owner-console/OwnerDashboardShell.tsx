"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  OWNER_QUICK_ACTIONS,
  sectionPath,
  type OwnerDashboardMetric,
  type OwnerQuickAction,
} from "@/lib/community/owner-console";
import { hasCapability } from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import { useOwnerConsole } from "./OwnerConsoleContext";

export function OwnerDashboardMetricCard({
  metric,
}: {
  metric: OwnerDashboardMetric;
}) {
  const tone =
    metric.tone === "accent"
      ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5"
      : metric.tone === "warn"
        ? "border-amber-200 bg-amber-50/80"
        : metric.tone === "success"
          ? "border-emerald-200 bg-emerald-50/80"
          : "border-[var(--color-border)] bg-[var(--color-surface)]";

  const body = (
    <>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {metric.label}
      </p>
      <p className="mt-1 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
        {metric.value}
      </p>
      <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{metric.hint}</p>
    </>
  );

  if (metric.href) {
    return (
      <Link
        href={metric.href}
        className={cn(
          "block rounded-2xl border px-4 py-3.5 transition-colors hover:border-[var(--color-accent)]/40",
          tone
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={cn("rounded-2xl border px-4 py-3.5", tone)}>{body}</div>
  );
}

export function OwnerQuickActionsGrid({
  role,
  communityId,
  slug,
}: {
  role: WorkspaceRole;
  communityId: string;
  slug: string;
}) {
  const actions = OWNER_QUICK_ACTIONS.filter((a) =>
    hasCapability(role, a.capability)
  );

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((a: OwnerQuickAction) => (
        <Link
          key={a.id}
          href={a.href({ communityId, slug })}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[13px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40"
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Owner Dashboard shell — reusable metric architecture (Phase A.1).
 * Values are placeholders wired to real APIs in later phases.
 */
export function OwnerDashboardShell({
  metrics,
  activity = [],
}: {
  metrics: OwnerDashboardMetric[];
  activity?: { id: string; title: string; time: string }[];
}) {
  const { community, role } = useOwnerConsole();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
          Community Dashboard
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
          Operating overview
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] text-[var(--color-text-muted)]">
          Health, growth, moderation, live, commerce, and AI — one control center
          for owners, admins, and moderators.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <OwnerDashboardMetricCard key={m.id} metric={m} />
        ))}
      </section>

      {community && (
        <section className="space-y-2.5">
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Quick actions
          </h2>
          <OwnerQuickActionsGrid
            role={role}
            communityId={community.id}
            slug={community.slug}
          />
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:col-span-3">
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Activity feed
          </h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
              Administrative activity will stream here. Workspace feed and audit
              logs plug into this panel in later phases.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2 text-[13px]"
                >
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {a.title}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {a.time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:col-span-2">
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            AI suggestions
          </h2>
          <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
            Intelligence Platform suggestions for FAQs, tasks, and community
            improvements appear here — reuse existing intelligence layer.
          </p>
          {community && (
            <Link
              href={sectionPath("/community-owner/ai", community.id)}
              className="mt-3 inline-flex text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              Open AI console
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

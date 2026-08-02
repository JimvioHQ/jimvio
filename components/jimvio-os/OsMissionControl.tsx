"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { OS_ACTIVITY_SCAFFOLD } from "@/lib/jimvio-os/config";
import { getWorkspaceDefinition } from "@/lib/jimvio-os/workspaces";
import { loadOsRecents } from "@/lib/jimvio-os/recents";
import type { OsActivityKind } from "@/lib/jimvio-os/types";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { OsCard, OsDivider, OsIconBadge, OsPill } from "./os-ui";
import { OsIcon } from "./OsIcon";
import { OsPinnedProjects } from "./OsPinnedProjects";

type OsMissionControlProps = {
  /** Optional display name — pass down from an already-loaded profile. No new data fetching happens here. */
  name?: string | null;
  className?: string;
};

const PERFORMANCE_LINKS = [
  { label: "Analytics", href: "/dashboard/analytics", icon: "chart" },
  { label: "Wallet", href: "/wallet", icon: "wallet" },
  { label: "Orders", href: "/dashboard/orders", icon: "shopping-bag" },
];

const PENDING_LINKS = [
  { label: "Orders", href: "/dashboard/orders", icon: "shopping-bag" },
  { label: "Notifications", href: "/dashboard/notifications", icon: "message" },
  { label: "UGC applications", href: "/ugc/applications", icon: "megaphone" },
];

const ACTIVITY_ICON: Record<OsActivityKind, string> = {
  order: "shopping-bag",
  sale: "wallet",
  affiliate: "link",
  ugc: "megaphone",
  community: "users-round",
  campaign: "megaphone",
  follower: "users",
  review: "star",
};

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Calm Mission Control composition for the dashboard home — one card, quiet sections, lots of whitespace. */
export function OsMissionControl({ name, className }: OsMissionControlProps) {
  const workspaceMode = useJimvioOsStore((s) => s.workspaceMode);
  const hydrate = useJimvioOsStore((s) => s.hydrate);
  const openAssistant = useAIStore((s) => s.openAssistant);
  const [now, setNow] = useState<Date | null>(null);
  const [recents, setRecents] = useState<ReturnType<typeof loadOsRecents>>([]);

  useEffect(() => {
    hydrate();
    setNow(new Date());
    setRecents(loadOsRecents());
  }, [hydrate]);

  const workspace = getWorkspaceDefinition(workspaceMode);
  const greeting = now ? greetingForHour(now.getHours()) : "Welcome back";
  const dateLabel = now
    ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : "Mission Control";
  const firstName = name?.trim()?.split(" ")[0];

  return (
    <OsCard padding="lg" className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {dateLabel}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <OsPill tone="accent" size="md">
          {workspace.emoji} {workspace.label} workspace
        </OsPill>
      </div>

      <button
        type="button"
        onClick={() =>
          openAssistant(
            `Summarize today's activity in my ${workspace.label.toLowerCase()} workspace and flag what needs my attention.`,
          )
        }
        className="mt-5 flex w-full items-start gap-3 rounded-2xl border border-dashed border-[var(--color-accent)]/25 bg-[var(--color-accent)]/5 p-4 text-left transition-colors hover:border-[var(--color-accent)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
      >
        <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[var(--color-text-primary)]">
            AI daily summary
          </span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--color-text-muted)]">
            Ask Jimvio AI to summarize today, flag what needs attention, and plan your next move in the{" "}
            {workspace.label.toLowerCase()} workspace.
          </span>
        </span>
        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-[var(--color-text-muted)]" />
      </button>

      {recents.length > 0 && (
        <>
          <OsDivider className="my-5" />
          <section aria-label="Continue working">
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Continue working
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recents.slice(0, 6).map((page) => (
                <OsPill key={page.id} href={page.href}>
                  {page.label}
                </OsPill>
              ))}
            </div>
          </section>
        </>
      )}

      <OsDivider className="my-5" />

      <section aria-label="Today's performance">
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Today&apos;s performance
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PERFORMANCE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            >
              <OsIcon name={link.icon} className="size-3.5 opacity-70" />
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <OsDivider className="my-5" />

      <section aria-label="Upcoming and pending">
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Upcoming &amp; pending
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {PENDING_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:text-[var(--color-accent)] hover:underline"
            >
              <OsIcon name={link.icon} className="size-3.5 opacity-60" />
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {workspace.quickActions.length > 0 && (
        <>
          <OsDivider className="my-5" />
          <section aria-label="Quick actions">
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Quick actions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {workspace.quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)]/10 px-3 py-1.5 text-[12px] font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/[0.16]"
                >
                  {action.label}
                  <ArrowRight className="size-3" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {workspace.recommendations.length > 0 && (
        <>
          <OsDivider className="my-5" />
          <section aria-label="AI recommendations">
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              AI recommendations
            </p>
            <ul className="space-y-1.5">
              {workspace.recommendations.map((rec) => (
                <li key={rec} className="flex items-start gap-2 text-[12.5px] text-[var(--color-text-secondary)]">
                  <Sparkles className="mt-0.5 size-3 shrink-0 text-[var(--color-accent)]" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <OsDivider className="my-5" />

      <section aria-label="Pinned projects">
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Pinned projects
        </p>
        <OsPinnedProjects />
      </section>

      <OsDivider className="my-5" />

      <section aria-label="Recent activity">
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Recent activity
        </p>
        <ul className="space-y-1">
          {OS_ACTIVITY_SCAFFOLD.slice(0, 5).map((item) => (
            <li
              key={item.id}
              className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-secondary)]/60"
            >
              <OsIconBadge size="sm">
                <OsIcon name={ACTIVITY_ICON[item.kind] ?? "layout"} className="size-3.5" />
              </OsIconBadge>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                  {item.title}
                </span>
                <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                  {item.subtitle}
                </span>
              </span>
              <span className="shrink-0 text-[10.5px] text-[var(--color-text-muted)]">{item.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </OsCard>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getWorkspaceDefinition } from "@/lib/jimvio-os/workspaces";
import { loadOsRecents } from "@/lib/jimvio-os/recents";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { OsCard, OsDivider, OsPill } from "./os-ui";

type OsMorningBriefProps = {
  /** Optional display name — pass down from an already-loaded profile. No new data fetching happens here. */
  name?: string | null;
  className?: string;
};

const PENDING_LINKS = [
  { label: "Orders", href: "/orders" },
  { label: "Notifications", href: "/settings/notifications" },
  { label: "UGC applications", href: "/ugc/applications" },
  { label: "Wallet", href: "/wallet" },
];

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Calm Morning Brief composition for the dashboard home — one card, a few quiet rows. */
export function OsMorningBrief({ name, className }: OsMorningBriefProps) {
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
    : "Morning brief";
  const firstName = name?.trim()?.split(" ")[0];

  return (
    <OsCard padding="lg" className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {dateLabel}
          </p>
          <h1 className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <OsPill tone="accent">{workspace.label} workspace</OsPill>
      </div>

      <button
        type="button"
        onClick={() => openAssistant()}
        className="mt-4 flex w-full items-start gap-3 rounded-xl border border-dashed border-[var(--color-accent)]/25 bg-[var(--color-accent)]/5 p-3.5 text-left transition-colors hover:border-[var(--color-accent)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
      >
        <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-semibold text-[var(--color-text-primary)]">
            Jimvio AI summary
          </span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--color-text-muted)]">
            Ask me to summarize today&apos;s activity, flag what needs attention, or plan your next move in the{" "}
            {workspace.label.toLowerCase()} workspace.
          </span>
        </span>
        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-[var(--color-text-muted)]" />
      </button>

      {recents.length > 0 && (
        <>
          <OsDivider className="my-4" />
          <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Continue working
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recents.slice(0, 5).map((page) => (
                <OsPill key={page.id} href={page.href}>
                  {page.label}
                </OsPill>
              ))}
            </div>
          </div>
        </>
      )}

      <OsDivider className="my-4" />

      <div>
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Suggested actions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {workspace.quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            >
              {action.label}
              <ArrowRight className="size-3 opacity-60" />
            </Link>
          ))}
        </div>
      </div>

      <OsDivider className="my-4" />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Pending
        </span>
        {PENDING_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[12px] font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:text-[var(--color-accent)] hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </OsCard>
  );
}

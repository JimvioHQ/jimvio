"use client";

import { memo, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  loadOsRecents,
  type OsRecentPage,
  type WorkspaceDefinition,
  type WorkspaceFocusItem,
} from "@/lib/jimvio-os";
import { OsIcon } from "./OsIcon";
import { QuickPreview } from "./QuickPreview";

type SmartPin = {
  id: string;
  eyebrow: string;
  title: string;
  meta: string;
  href: string;
  icon: string;
};

const PRIORITY_RANK: Record<WorkspaceFocusItem["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Maps an href to a semantic Smart Pin label — pure presentation, no business logic. */
const ACTION_LABEL_MATCHERS: Array<{ test: (href: string) => boolean; label: string }> = [
  { test: (h) => h.includes("withdraw"), label: "Pending withdrawals" },
  { test: (h) => h.includes("campaign"), label: "Active campaigns" },
  { test: (h) => h.includes("application"), label: "Expiring applications" },
  { test: (h) => h.includes("live"), label: "Live sessions" },
  { test: (h) => h.includes("product"), label: "Draft products" },
  { test: (h) => h.includes("communit"), label: "Community activity" },
  { test: (h) => h.includes("affiliate") || h.includes("link"), label: "Affiliate links" },
];

function tint(accent: string, pct: number) {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
}

function inferPinIcon(href: string): string {
  const h = href.toLowerCase();
  if (h.includes("withdraw") || h.includes("wallet")) return "wallet";
  if (h.includes("campaign")) return "megaphone";
  if (h.includes("application")) return "layout";
  if (h.includes("live")) return "live";
  if (h.includes("product")) return "package";
  if (h.includes("communit")) return "users";
  if (h.includes("affiliate") || h.includes("link")) return "link";
  if (h.includes("order")) return "shopping-bag";
  return "clock";
}

function useOsRecentsSnapshot(): OsRecentPage[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener("focus", handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("focus", handler);
      };
    },
    () => loadOsRecents(),
    () => [],
  );
}

/**
 * Derives up to 4 "what should I do next" pins from the workspace's own focus
 * items, suggested actions, and locally-tracked recent pages. No new data
 * sources — everything is already present in `getWorkspaceDefinition`/recents.
 */
function buildSmartPins(workspace: WorkspaceDefinition, recents: OsRecentPage[]): SmartPin[] {
  const pins: SmartPin[] = [];
  const seenHrefs = new Set<string>();

  const sortedFocus = [...workspace.home.focus].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.progress - b.progress,
  );
  for (const item of sortedFocus) {
    if (pins.length >= 2 || seenHrefs.has(item.href)) continue;
    pins.push({
      id: `focus-${item.id}`,
      eyebrow: "Unfinished work",
      title: item.label,
      meta: `${item.progress}% · ${item.deadline}`,
      href: item.href,
      icon: inferPinIcon(item.href),
    });
    seenHrefs.add(item.href);
  }

  for (const action of workspace.home.suggestedActions) {
    if (pins.length >= 4 || seenHrefs.has(action.href)) continue;
    const match = ACTION_LABEL_MATCHERS.find((m) => m.test(action.href.toLowerCase()));
    if (!match) continue;
    pins.push({
      id: `action-${action.href}`,
      eyebrow: match.label,
      title: action.label,
      meta: "Suggested by AI",
      href: action.href,
      icon: inferPinIcon(action.href),
    });
    seenHrefs.add(action.href);
  }

  if (pins.length < 4 && recents.length > 0) {
    const recent = recents.find((r) => !seenHrefs.has(r.href));
    if (recent) {
      pins.push({
        id: `recent-${recent.href}`,
        eyebrow: "Continue where you left off",
        title: recent.label,
        meta: "Recently visited",
        href: recent.href,
        icon: "clock",
      });
      seenHrefs.add(recent.href);
    }
  }

  if (pins.length < 4) {
    const fallback = workspace.home.suggestedActions.find((a) => !seenHrefs.has(a.href));
    if (fallback) {
      pins.push({
        id: `fallback-${fallback.href}`,
        eyebrow: "Today's focus",
        title: fallback.label,
        meta: "Suggested action",
        href: fallback.href,
        icon: inferPinIcon(fallback.href),
      });
      seenHrefs.add(fallback.href);
    }
  }

  return pins.slice(0, 4);
}

/**
 * Smart Pins — up to 4 AI-curated "what should I do next" shortcuts, derived
 * purely from the current workspace's focus/suggestedActions config plus
 * locally-tracked recents. No new routes, no new data sources.
 */
export const SmartPins = memo(function SmartPins({ workspace }: { workspace: WorkspaceDefinition }) {
  const recents = useOsRecentsSnapshot();
  const accent = workspace.home.accent;
  const pins = useMemo(() => buildSmartPins(workspace, recents), [workspace, recents]);

  if (pins.length === 0) return null;

  return (
    <section aria-label="Smart Pins">
      <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <Sparkles className="size-3.5" style={{ color: accent }} aria-hidden />
        Smart Pins
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pins.map((pin) => (
          <QuickPreview
            key={pin.id}
            className="h-full"
            title={pin.title}
            subtitle={pin.eyebrow}
            meta={[pin.meta]}
            href={pin.href}
            accent={accent}
          >
            <Link
              href={pin.href}
              className="group flex h-full flex-col gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[0_12px_32px_rgba(16,24,40,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
            >
              <span className="flex items-center justify-between">
                <span
                  className="grid size-9 place-items-center rounded-2xl transition-transform duration-200 group-hover:scale-110"
                  style={{ background: tint(accent, 12), color: accent }}
                >
                  <OsIcon name={pin.icon} className="size-4" />
                </span>
                <ArrowRight
                  className="size-3.5 text-[var(--color-text-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--color-text-primary)]"
                  aria-hidden
                />
              </span>
              <span className="mt-auto min-w-0">
                <span
                  className="block text-[10.5px] font-semibold uppercase tracking-wide"
                  style={{ color: accent }}
                >
                  {pin.eyebrow}
                </span>
                <span className="mt-1 block truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                  {pin.title}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-[var(--color-text-muted)]">
                  {pin.meta}
                </span>
              </span>
            </Link>
          </QuickPreview>
        ))}
      </div>
    </section>
  );
});

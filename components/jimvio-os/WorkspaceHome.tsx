"use client";

import { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore, lazy, Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronUp, Eye, EyeOff, Sparkles, SlidersHorizontal } from "lucide-react";
import {
  getWorkspaceDefinition,
  loadOsRecents,
  loadWidgetLayout,
  moveWidget,
  resetWidgetLayout,
  toggleWidgetHidden,
  WIDGET_LABELS,
  type WidgetId,
  type WidgetLayout,
  type WorkspaceDefinition,
  type WorkspaceFocusItem,
  type WorkspaceQuickAction,
} from "@/lib/jimvio-os";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { OsEmptyState, OsSkeleton, cn, OS_BRAND_ACCENT } from "./os-ui";
import { OsIcon } from "./OsIcon";
import { SmartPins } from "./SmartPins";
import { QuickPreview } from "./QuickPreview";

const IntelligenceCore = lazy(() =>
  import("./IntelligenceCore").then((m) => ({ default: m.IntelligenceCore })),
);
const ExecutiveAgentWidget = lazy(() =>
  import("./agents/ExecutiveAgentWidget").then((m) => ({ default: m.ExecutiveAgentWidget })),
);
const InsightsSection = lazy(() =>
  import("./MissionControlLower").then((m) => ({ default: m.InsightsSection })),
);
const CalendarSection = lazy(() =>
  import("./MissionControlLower").then((m) => ({ default: m.CalendarSection })),
);
const ActivitySection = lazy(() =>
  import("./MissionControlLower").then((m) => ({ default: m.ActivitySection })),
);
const BusinessHealthWidget = lazy(() =>
  import("./predictive").then((m) => ({ default: m.BusinessHealthWidget })),
);
const OpportunityEngineWidget = lazy(() =>
  import("./predictive").then((m) => ({ default: m.OpportunityEngineWidget })),
);
const RiskEngineWidget = lazy(() =>
  import("./predictive").then((m) => ({ default: m.RiskEngineWidget })),
);
const GrowthEngineWidget = lazy(() =>
  import("./predictive").then((m) => ({ default: m.GrowthEngineWidget })),
);
const BusinessDnaWidget = lazy(() =>
  import("./predictive").then((m) => ({ default: m.BusinessDnaWidget })),
);
const BusinessTimelineWidget = lazy(() =>
  import("./predictive").then((m) => ({ default: m.BusinessTimelineWidget })),
);
const AgentCollaborationWidget = lazy(() =>
  import("./predictive").then((m) => ({ default: m.AgentCollaborationWidget })),
);

type WorkspaceHomeProps = {
  name?: string | null;
  className?: string;
};

const PRIORITY_COLOR = {
  high: "#DC2626",
  medium: "#CA8A04",
  low: "#64748B",
} as const;

function tint(accent: string, pct: number) {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
}

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Mount-time clock only — never return a fresh Date from useSyncExternalStore getSnapshot. */
function useClientNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // Intentional mount latch (SSR + first paint stay null).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client greeting hour
    setNow(new Date());
  }, []);
  return now;
}

function useOsRecents() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener("jimvio-os-recents", handler);
      window.addEventListener("focus", handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("jimvio-os-recents", handler);
        window.removeEventListener("focus", handler);
      };
    },
    loadOsRecents,
    loadOsRecents,
  );
}

function continueLabel(href: string, fallback: string): string {
  const path = href.toLowerCase();
  if (path.includes("/ugc") && path.includes("campaign")) return "Continue Campaign";
  if (path.includes("/ugc") || path.includes("library") || path.includes("submission")) return "Continue Upload";
  if (path.includes("product")) return "Continue Product";
  if (path.includes("communit")) return "Continue Community";
  if (path.includes("affiliate") || path.includes("link")) return "Continue Affiliate Link";
  if (path.includes("edit") || path.includes("identity")) return "Continue Editing";
  if (path.includes("order")) return "Continue Orders";
  if (path.includes("live")) return "Continue Live";
  return fallback.startsWith("Continue") ? fallback : `Continue ${fallback}`;
}

const SectionLabel = memo(function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
      {children}
    </p>
  );
});

const WorkspaceHeader = memo(function WorkspaceHeader({
  workspace,
  name,
}: {
  workspace: WorkspaceDefinition;
  name?: string | null;
}) {
  const now = useClientNow();
  const greeting = now ? greetingForHour(now.getHours()) : "Welcome back";
  const firstName = name?.trim()?.split(" ")[0] ?? "";
  // Workspace tint stays secondary; Jimvio brand orange anchors identity.
  const workspaceTint = workspace.home.accent;
  const brand = OS_BRAND_ACCENT;

  return (
    <header
      className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6 sm:px-8 sm:py-8"
      style={{
        background: `linear-gradient(135deg, ${tint(brand, 10)} 0%, var(--color-surface) 42%, ${tint(workspaceTint, 5)} 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl"
        style={{ background: tint(brand, 14) }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-2xl text-[20px] shadow-[0_8px_24px_rgba(16,24,40,0.06)]"
              style={{ background: tint(brand, 14), color: brand }}
            >
              {workspace.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {workspace.home.eyebrow} · Mission Control
              </p>
              <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
                {greeting}
                {firstName ? `, ${firstName}` : ""}
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            {workspace.home.subtitle}
          </p>
        </div>
        <div
          className="max-w-sm rounded-2xl border border-[var(--color-border)] px-4 py-3 text-[12.5px] leading-relaxed bg-[var(--color-surface)]/80"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: brand }}>
            <Sparkles className="size-3.5" />
            AI insight
          </span>
          <p>{workspace.home.aiInsight}</p>
        </div>
      </div>
    </header>
  );
});

function resolveBriefHref(
  text: string,
  workspace: WorkspaceDefinition,
): string | null {
  const hay = text.toLowerCase();
  const candidates = [
    ...workspace.home.suggestedActions.map((a) => ({ label: a.label, href: a.href })),
    ...workspace.home.focus.map((f) => ({ label: f.label, href: f.href })),
    ...workspace.home.productivity.map((p) => ({ label: p.label, href: p.href })),
    ...workspace.quickActions.map((q) => ({ label: q.label, href: q.href })),
  ];
  for (const c of candidates) {
    const tokens = c.label.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    if (tokens.some((t) => hay.includes(t))) return c.href;
  }
  if (hay.includes("order")) return "/dashboard/orders";
  if (hay.includes("wallet") || hay.includes("withdraw")) return "/wallet";
  if (hay.includes("campaign")) return workspace.id === "brand" ? "/ugc/campaign-center" : "/ugc";
  if (hay.includes("inventory") || hay.includes("stock") || hay.includes("product")) return "/dashboard/products";
  if (hay.includes("community") || hay.includes("member")) return "/communities";
  if (hay.includes("affiliate") || hay.includes("link")) return "/affiliates";
  if (hay.includes("live")) return "/communities/live";
  if (hay.includes("revenue") || hay.includes("analytic")) return "/dashboard/analytics";
  if (hay.includes("ai") || hay.includes("opportunit")) return null;
  return null;
}

const AiDailyBrief = memo(function AiDailyBrief({
  workspace,
  onAskAi,
}: {
  workspace: WorkspaceDefinition;
  onAskAi: () => void;
}) {
  const accent = workspace.home.accent;
  const brief = workspace.home.brief;
  const actions = workspace.home.suggestedActions;

  return (
    <section
      aria-label="AI Daily Intelligence"
      className="relative overflow-hidden rounded-3xl border p-5 sm:p-6"
      style={{
        borderColor: tint(accent, 24),
        background: `linear-gradient(160deg, ${tint(accent, 14)} 0%, color-mix(in srgb, var(--color-surface) 88%, transparent) 42%, ${tint(accent, 8)} 100%)`,
        boxShadow: `0 12px 40px ${tint(accent, 10)}`,
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
            <Sparkles className="size-3.5" />
            AI Daily Intelligence
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Today in {workspace.label}
          </h2>
        </div>
        <button
          type="button"
          onClick={onAskAi}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ background: accent }}
        >
          Ask AI
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {brief.map((item) => {
          const href = resolveBriefHref(item, workspace);
          const className =
            "flex items-start gap-2.5 rounded-2xl border border-white/40 bg-white/40 px-3.5 py-3 text-[13px] text-[var(--color-text-secondary)] backdrop-blur-sm transition-[transform,background-color] duration-200 hover:-translate-y-px hover:bg-white/55 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2";
          const inner = (
            <>
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />
              <span className="min-w-0 flex-1">{item}</span>
              {href && <ArrowRight className="mt-0.5 size-3.5 shrink-0 opacity-50" style={{ color: accent }} />}
            </>
          );
          return (
            <li key={item}>
              {href ? (
                <Link href={href} className={className} aria-label={`Act on: ${item}`}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={onAskAi} className={cn(className, "w-full text-left")} aria-label={`Ask AI about: ${item}`}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {actions.length > 0 && (
        <div className="mt-5">
          <SectionLabel>One-click actions</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-[transform,background-color,border-color] duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2"
                style={{
                  borderColor: tint(accent, 28),
                  color: accent,
                  background: tint(accent, 8),
                }}
              >
                {action.label}
                <ArrowRight className="size-3" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
});

const FocusCard = memo(function FocusCard({
  item,
  accent,
}: {
  item: WorkspaceFocusItem;
  accent: string;
}) {
  const priorityColor = PRIORITY_COLOR[item.priority];
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[0_12px_32px_rgba(16,24,40,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">{item.label}</h3>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ background: priorityColor }}
        >
          {item.priority}
        </span>
      </div>
      <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">Deadline · {item.deadline}</p>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <span>Progress</span>
          <span className="font-semibold text-[var(--color-text-secondary)]">{item.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(4, Math.min(100, item.progress))}%`, background: accent }}
          />
        </div>
      </div>
      <Link
        href={item.href}
        className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[12.5px] font-semibold transition-transform duration-200 group-hover:translate-x-0.5"
        style={{ color: accent }}
      >
        {item.cta}
        <ArrowRight className="size-3.5" />
      </Link>
    </article>
  );
});

const TodaysFocus = memo(function TodaysFocus({
  items,
  accent,
}: {
  items: WorkspaceFocusItem[];
  accent: string;
}) {
  const focus = items.slice(0, 3);
  if (focus.length === 0) return null;
  return (
    <section aria-label="Today's Focus">
      <SectionLabel>Today&apos;s Focus</SectionLabel>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {focus.map((item) => (
          <QuickPreview
            key={item.id}
            className="h-full"
            title={item.label}
            subtitle={`Deadline · ${item.deadline}`}
            meta={[`${item.progress}% complete`, item.priority]}
            href={item.href}
            accent={accent}
          >
            <FocusCard item={item} accent={accent} />
          </QuickPreview>
        ))}
      </div>
    </section>
  );
});

const ContinueWorking = memo(function ContinueWorking({ accent }: { accent: string }) {
  const recents = useOsRecents();
  const items = useMemo(() => recents.slice(0, 6), [recents]);

  if (items.length === 0) {
    return (
      <section aria-label="Continue Working">
        <SectionLabel>Continue Working</SectionLabel>
        <OsEmptyState
          accent={accent}
          title="Nothing in progress yet"
          message="As you move through Jimvio, unfinished work will appear here — campaigns, products, uploads, and more."
          ctaLabel="Explore workspace"
          ctaHref="/dashboard"
        />
      </section>
    );
  }

  return (
    <section aria-label="Continue Working">
      <SectionLabel>Continue Working</SectionLabel>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="group flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-px hover:border-[var(--color-border-strong)] hover:shadow-[0_8px_24px_rgba(16,24,40,0.05)]"
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105"
              style={{ background: tint(accent, 12), color: accent }}
            >
              <OsIcon name="clock" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                {continueLabel(page.href, page.label)}
              </span>
              <span className="block truncate text-[11.5px] text-[var(--color-text-muted)]">{page.label}</span>
            </span>
            <ArrowRight className="size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: accent }} />
          </Link>
        ))}
      </div>
    </section>
  );
});

const QuickActionsGrid = memo(function QuickActionsGrid({
  actions,
  accent,
  onAi,
}: {
  actions: WorkspaceQuickAction[];
  accent: string;
  onAi: () => void;
}) {
  if (actions.length === 0) return null;
  return (
    <section aria-label="Quick Actions">
      <SectionLabel>Quick Actions</SectionLabel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action) => {
          const classes =
            "group flex flex-col items-start gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[0_12px_28px_rgba(16,24,40,0.06)] focus-visible:outline-none focus-visible:ring-2";
          const inner = (
            <>
              <span
                className="grid size-10 place-items-center rounded-2xl transition-transform duration-200 group-hover:scale-110"
                style={{ background: tint(accent, 12), color: accent }}
              >
                <OsIcon name={action.icon} className="size-4" />
              </span>
              <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{action.label}</span>
            </>
          );
          if (action.href === "#open-ai") {
            return (
              <button key={action.label} type="button" onClick={onAi} className={classes}>
                {inner}
              </button>
            );
          }
          return (
            <Link key={`${action.href}-${action.label}`} href={action.href} className={classes}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
});

const WIDGET_SKELETON = <OsSkeleton className="h-40 rounded-3xl" />;

const WidgetCustomizer = memo(function WidgetCustomizer({
  layout,
  onToggleHidden,
  onMove,
  onReset,
}: {
  layout: WidgetLayout;
  onToggleHidden: (id: WidgetId) => void;
  onMove: (id: WidgetId, direction: "up" | "down") => void;
  onReset: () => void;
}) {
  return (
    <details className="group/customize relative ml-auto w-fit">
      <summary
        aria-label="Customize Mission Control layout"
        className="inline-flex cursor-pointer select-none list-none items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 [&::-webkit-details-marker]:hidden"
      >
        <SlidersHorizontal className="size-3.5" aria-hidden />
        Customize
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_16px_48px_rgba(16,24,40,0.14)]">
        <p className="px-1 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          Widgets
        </p>
        <ul className="flex flex-col gap-1">
          {layout.order.map((id, index) => {
            const hidden = layout.hidden.includes(id);
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-[var(--color-surface-secondary)]/70"
              >
                <span
                  className={cn(
                    "truncate text-[12.5px] font-medium",
                    hidden ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text-primary)]",
                  )}
                >
                  {WIDGET_LABELS[id]}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMove(id, "up")}
                    disabled={index === 0}
                    aria-label={`Move ${WIDGET_LABELS[id]} up`}
                    className="grid size-6 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(id, "down")}
                    disabled={index === layout.order.length - 1}
                    aria-label={`Move ${WIDGET_LABELS[id]} down`}
                    className="grid size-6 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleHidden(id)}
                    aria-pressed={!hidden}
                    aria-label={hidden ? `Show ${WIDGET_LABELS[id]}` : `Hide ${WIDGET_LABELS[id]}`}
                    className="grid size-6 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    {hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={onReset}
          className="mt-2 w-full rounded-xl border border-dashed border-[var(--color-border)] px-3 py-2 text-[11.5px] font-semibold text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
        >
          Reset layout
        </button>
      </div>
    </details>
  );
});

/**
 * Mission Control — the Jimvio Creator Commerce OS home.
 * Content adapts per workspace; structure stays calm and operating-system-like.
 */
export const WorkspaceHome = memo(function WorkspaceHome({ name, className }: WorkspaceHomeProps) {
  const workspaceMode = useJimvioOsStore((s) => s.workspaceMode);
  const hydrate = useJimvioOsStore((s) => s.hydrate);
  const openAssistant = useAIStore((s) => s.openAssistant);

  const layout = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener("jimvio-os-widget-layout", handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener("jimvio-os-widget-layout", handler);
        window.removeEventListener("storage", handler);
      };
    },
    loadWidgetLayout,
    loadWidgetLayout,
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const workspace = getWorkspaceDefinition(workspaceMode);
  const accent = workspace.home.accent;

  const onAskAi = useCallback(() => {
    openAssistant(
      `Give me my AI Daily Brief for the ${workspace.label} workspace. Summarize priorities, opportunities, and what I should do next.`,
    );
  }, [openAssistant, workspace.label]);

  const handleToggleHidden = useCallback((id: WidgetId) => {
    toggleWidgetHidden(layout, id);
  }, [layout]);

  const handleMove = useCallback((id: WidgetId, direction: "up" | "down") => {
    moveWidget(layout, id, direction);
  }, [layout]);

  const handleReset = useCallback(() => {
    resetWidgetLayout();
  }, []);

  const widgetContent = useMemo<Record<WidgetId, React.ReactNode>>(
    () => ({
      brief: <AiDailyBrief workspace={workspace} onAskAi={onAskAi} />,
      smartPins: <SmartPins workspace={workspace} />,
      intelligence: (
        <Suspense fallback={WIDGET_SKELETON}>
          <IntelligenceCore mode={workspace.id} accent={accent} />
        </Suspense>
      ),
      executive: (
        <Suspense fallback={WIDGET_SKELETON}>
          <ExecutiveAgentWidget mode={workspace.id} />
        </Suspense>
      ),
      health: (
        <Suspense fallback={WIDGET_SKELETON}>
          <BusinessHealthWidget mode={workspace.id} accent={accent} />
        </Suspense>
      ),
      opportunities: (
        <Suspense fallback={WIDGET_SKELETON}>
          <OpportunityEngineWidget mode={workspace.id} />
        </Suspense>
      ),
      risks: (
        <Suspense fallback={WIDGET_SKELETON}>
          <RiskEngineWidget mode={workspace.id} />
        </Suspense>
      ),
      growth: (
        <Suspense fallback={WIDGET_SKELETON}>
          <GrowthEngineWidget mode={workspace.id} />
        </Suspense>
      ),
      dna: (
        <Suspense fallback={WIDGET_SKELETON}>
          <BusinessDnaWidget mode={workspace.id} />
        </Suspense>
      ),
      collaboration: (
        <Suspense fallback={WIDGET_SKELETON}>
          <AgentCollaborationWidget mode={workspace.id} />
        </Suspense>
      ),
      timeline: (
        <Suspense fallback={WIDGET_SKELETON}>
          <BusinessTimelineWidget />
        </Suspense>
      ),
      focus: <TodaysFocus items={workspace.home.focus} accent={accent} />,
      continue: <ContinueWorking accent={accent} />,
      quickActions: <QuickActionsGrid actions={workspace.quickActions} accent={accent} onAi={onAskAi} />,
      insights: (
        <Suspense fallback={WIDGET_SKELETON}>
          <InsightsSection workspace={workspace} />
        </Suspense>
      ),
      calendar: (
        <Suspense fallback={WIDGET_SKELETON}>
          <CalendarSection workspace={workspace} />
        </Suspense>
      ),
      activity: (
        <Suspense fallback={WIDGET_SKELETON}>
          <ActivitySection workspace={workspace} />
        </Suspense>
      ),
    }),
    [workspace, accent, onAskAi],
  );

  const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id));

  return (
    <div
      key={workspace.id}
      className={cn("flex flex-col gap-8", className)}
      style={{ animation: "jimvio-os-enter 260ms ease-out" }}
    >
      <WorkspaceHeader workspace={workspace} name={name} />
      <WidgetCustomizer
        layout={layout}
        onToggleHidden={handleToggleHidden}
        onMove={handleMove}
        onReset={handleReset}
      />
      {visibleOrder.map((id) => (
        <div key={id}>{widgetContent[id]}</div>
      ))}
    </div>
  );
});

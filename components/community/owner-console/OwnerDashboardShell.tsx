"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarPlus,
  ChevronRight,
  ExternalLink,
  Flag,
  Layers,
  Radio,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OWNER_CONSOLE_HUB,
  OWNER_NAV_ITEMS,
  OWNER_QUICK_ACTIONS,
  buildManageDashboardMetrics,
  buildOwnerDashboardMetrics,
  type OwnerDashboardMetric,
  type OwnerQuickAction,
  type OwnerConsoleSectionId,
} from "@/lib/community/owner-console";
import { hasCapability } from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import type { OwnerGroupListItem } from "@/lib/community/owner-console/groups";
import { useOwnerConsole } from "./OwnerConsoleContext";

const METRIC_ICONS: Record<string, LucideIcon> = {
  members: Users,
  communities: Layers,
  revenue: Wallet,
  live: Radio,
  reports: Flag,
  health: ShieldCheck,
};

const ACTION_ICONS: Record<string, LucideIcon> = {
  create_post: BookOpen,
  create_community: Layers,
  invite_members: UserPlus,
  start_live: Radio,
  create_course: BookOpen,
  create_event: CalendarPlus,
  open_moderation: Flag,
  create_space: Layers,
};

const ACTION_COLORS = [
  "bg-[#FF5A1F]/10 text-[#FF5A1F]",
  "bg-sky-50 text-sky-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-600",
];

export function OwnerDashboardMetricCard({
  metric,
}: {
  metric: OwnerDashboardMetric;
}) {
  const Icon = METRIC_ICONS[metric.id] ?? ShieldCheck;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            metric.tone === "warn"
              ? "bg-amber-50 text-amber-600"
              : metric.tone === "success"
                ? "bg-emerald-50 text-emerald-600"
                : metric.tone === "accent"
                  ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
                  : "bg-[#F3F4F6] text-[#4B5563]"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <p className="mt-3 text-[12px] font-medium text-[#6B7280]">{metric.label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight text-[#111827]">
        {metric.value}
      </p>
      {metric.hint ? (
        <p className="mt-1 text-[11px] text-[#9CA3AF]">{metric.hint}</p>
      ) : null}
    </>
  );

  const cardClass =
    "block rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition duration-200 hover:border-[#FF5A1F]/30 hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40";

  if (metric.href) {
    return (
      <Link href={metric.href} className={cardClass} aria-label={metric.label}>
        {body}
      </Link>
    );
  }

  return <div className={cardClass}>{body}</div>;
}

function resolveQuickActionHref(
  href: string,
  slug: string,
  hrefSection: (section?: string, query?: Record<string, string | undefined | null>) => string
) {
  const ownerPrefix = `/owner/communities/${encodeURIComponent(slug)}`;
  if (href.startsWith(ownerPrefix)) {
    const rest = href.slice(ownerPrefix.length).replace(/^\//, "");
    const [path, qs] = rest.split("?");
    const query: Record<string, string> = {};
    if (qs) {
      new URLSearchParams(qs).forEach((v, k) => {
        query[k] = v;
      });
    }
    return hrefSection(path, Object.keys(query).length ? query : undefined);
  }
  return href;
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
  const { hrefSection } = useOwnerConsole();
  const actions = OWNER_QUICK_ACTIONS.filter(
    (a) => a.primary && hasCapability(role, a.capability)
  ).slice(0, 8);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {actions.map((a: OwnerQuickAction, i) => {
        const Icon = ACTION_ICONS[a.id] ?? Sparkles;
        const href = resolveQuickActionHref(
          a.href({ communityId, slug }),
          slug,
          hrefSection
        );
        return (
          <Link
            key={a.id}
            href={href}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5 transition duration-200 hover:border-[#FF5A1F]/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-105",
                ACTION_COLORS[i % ACTION_COLORS.length]
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="text-[12px] font-semibold leading-snug text-[#111827]">
              {a.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

const SETTINGS_LINKS: Array<{
  label: string;
  description: string;
  section: string;
  id: OwnerConsoleSectionId;
}> = [
  {
    label: "General Settings",
    description: "Name, description, branding",
    section: "settings",
    id: "settings",
  },
  {
    label: "Privacy & Access",
    description: "Visibility and join rules",
    section: "settings",
    id: "settings",
  },
  {
    label: "Roles & Permissions",
    description: "Owners, admins, moderators",
    section: "roles",
    id: "roles",
  },
  {
    label: "Notifications",
    description: "Alerts and intelligence",
    section: "ai",
    id: "ai",
  },
  {
    label: "Integrations",
    description: "Connected services",
    section: "integrations",
    id: "integrations",
  },
];

const TOOL_LINKS: Array<{
  label: string;
  section: string;
  id: keyof typeof OWNER_NAV_ITEMS;
}> = [
  { label: "Content Moderation", section: "moderation", id: "moderation" },
  { label: "Member Management", section: "members", id: "members" },
  { label: "Analytics & Reports", section: "analytics", id: "analytics" },
  { label: "Community Store", section: "commerce", id: "commerce" },
  { label: "Monetization", section: "automations", id: "automations" },
];

/**
 * Manage Community / Owner Console overview dashboard.
 */
export function OwnerDashboardShell({
  metrics: metricsProp,
}: {
  metrics?: OwnerDashboardMetric[];
  activity?: { id: string; title: string; time: string; avatar?: string | null }[];
}) {
  const { community, role, communities, badges, consoleMode, hrefSection, workspaceHref } =
    useOwnerConsole();
  const [spaces, setSpaces] = useState<OwnerGroupListItem[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);

  const loadSpaces = useCallback(async () => {
    if (!community?.id) return;
    setSpacesLoading(true);
    try {
      const params = new URLSearchParams({
        communityId: community.id,
        includeArchived: "0",
      });
      const res = await fetch(`/api/c/owner/groups?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setSpaces((data.groups ?? []).slice(0, 5));
    } catch {
      setSpaces([]);
    } finally {
      setSpacesLoading(false);
    }
  }, [community?.id]);

  useEffect(() => {
    void loadSpaces();
  }, [loadSpaces]);

  const metrics =
    metricsProp ??
    (community
      ? consoleMode === "manage"
        ? buildManageDashboardMetrics(community, {
            reports: badges.reports,
            live: badges.live,
          })
        : buildOwnerDashboardMetrics(community, {
            communitiesCount: communities.length,
            reports: badges.reports,
            live: badges.live,
          })
      : buildOwnerDashboardMetrics(null, { communitiesCount: communities.length }));

  const visibleSettings = SETTINGS_LINKS.filter((item) =>
    hasCapability(role, OWNER_NAV_ITEMS[item.id].capability)
  );
  const visibleTools = TOOL_LINKS.filter((item) =>
    hasCapability(role, OWNER_NAV_ITEMS[item.id].capability)
  );

  const shareCommunity = useCallback(async () => {
    if (!community?.slug) return;
    const url = `${window.location.origin}/communities/${community.slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }, [community?.slug]);

  if (!community) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center">
        <p className="text-[15px] font-semibold text-[#111827]">
          Select a community to manage
        </p>
        <Link
          href={OWNER_CONSOLE_HUB}
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white"
        >
          Open communities
        </Link>
      </div>
    );
  }

  const isManage = consoleMode === "manage";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <header className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#F3F4F6] ring-2 ring-white shadow-sm">
              {community.avatarUrl ? (
                <Image
                  src={community.avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-bold text-[#FF5A1F]">
                  {community.name[0]}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF5A1F]">
                Manage Community
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-[#111827] sm:text-[1.65rem]">
                {community.name}
              </h1>
              <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-[#6B7280]">
                Manage all aspects of your community from one place.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#4B5563]">
                <span>
                  <strong className="font-semibold text-[#111827]">
                    {community.memberCount.toLocaleString()}
                  </strong>{" "}
                  members
                </span>
                <span className="text-[#D1D5DB]">·</span>
                <span className="font-medium capitalize">{role}</span>
                <span className="text-[#D1D5DB]">·</span>
                <span className="truncate text-[#6B7280]">
                  /communities/{community.slug}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {workspaceHref ? (
              <Link
                href={workspaceHref}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] px-4 text-[13px] font-semibold text-[#111827] transition hover:border-[#FF5A1F]/40 hover:bg-white"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                View Community
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void shareCommunity()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#111827] transition hover:bg-[#FAFAFB]"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              Share
            </button>
            {hasCapability(role, "analytics.view") ? (
              <Link
                href={hrefSection("analytics")}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white shadow-sm shadow-[#FF5A1F]/25 transition hover:bg-[#F04E14]"
              >
                <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                Analytics
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* Metrics */}
      {metrics.length > 0 ? (
        <section
          aria-label="Key metrics"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
        >
          {metrics.map((m) => (
            <OwnerDashboardMetricCard key={m.id} metric={m} />
          ))}
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          {/* Quick actions */}
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h2 className="text-[15px] font-semibold text-[#111827]">Quick Actions</h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              Common tasks for {community.name}
            </p>
            <div className="mt-4">
              <OwnerQuickActionsGrid
                role={role}
                communityId={community.id}
                slug={community.slug}
              />
            </div>
          </section>

          {/* Spaces */}
          {hasCapability(role, "group.manage") ? (
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#111827]">
                    Spaces Management
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[#6B7280]">
                    Organize discussions, courses, and live rooms
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={hrefSection("spaces")}
                    className="text-[12px] font-semibold text-[#FF5A1F] hover:underline"
                  >
                    View all
                  </Link>
                  <Link
                    href={hrefSection("spaces", { action: "create" })}
                    className="inline-flex h-9 items-center rounded-lg bg-[#FF5A1F]/10 px-3 text-[12px] font-semibold text-[#FF5A1F]"
                  >
                    Create Space
                  </Link>
                </div>
              </div>
              {spacesLoading ? (
                <p className="mt-4 text-[13px] text-[#9CA3AF]">Loading spaces…</p>
              ) : spaces.length === 0 ? (
                <p className="mt-4 text-[13px] text-[#6B7280]">
                  No spaces yet. Create your first space to organize members.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[#F3F4F6]">
                  {spaces.map((space) => (
                    <li key={space.id}>
                      <Link
                        href={hrefSection(`spaces/${space.id}`)}
                        className="flex items-center justify-between gap-3 py-3 transition hover:bg-[#FAFAFB]/80"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#111827]">
                            {space.name}
                          </p>
                          <p className="text-[12px] text-[#6B7280]">
                            {space.memberCount != null
                              ? `${space.memberCount} members`
                              : "Space"}
                            {space.status ? ` · ${space.status}` : ""}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {/* Analytics entry */}
          {hasCapability(role, "analytics.view") ? (
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#111827]">
                    Analytics
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[#6B7280]">
                    Growth, engagement, and revenue insights
                  </p>
                </div>
                <Link
                  href={hrefSection("analytics")}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#FF5A1F] hover:underline"
                >
                  Open analytics
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 xl:col-span-4">
          {/* Settings card */}
          {visibleSettings.length > 0 ? (
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#FF5A1F]" aria-hidden />
                <h2 className="text-[15px] font-semibold text-[#111827]">
                  Community Settings
                </h2>
              </div>
              <ul className="space-y-1">
                {visibleSettings.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={hrefSection(item.section)}
                      className="flex items-center justify-between gap-2 rounded-xl px-2 py-2.5 transition hover:bg-[#FAFAFB]"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#111827]">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF]">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Tools */}
          {visibleTools.length > 0 ? (
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="text-[15px] font-semibold text-[#111827]">
                Community Tools
              </h2>
              <ul className="mt-3 space-y-1">
                {visibleTools.map((tool) => (
                  <li key={tool.label}>
                    <Link
                      href={hrefSection(tool.section)}
                      className="flex items-center justify-between rounded-xl px-2 py-2 text-[13px] font-medium text-[#4B5563] transition hover:bg-[#FAFAFB] hover:text-[#111827]"
                    >
                      {tool.label}
                      <ChevronRight className="h-4 w-4 text-[#D1D5DB]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!isManage && communities.length > 1 ? (
            <p className="px-1 text-[12px] text-[#9CA3AF]">
              Managing {communities.length} communities
              {badges.reports > 0 ? ` · ${badges.reports} open reports` : ""}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[#64748B]">{metric.label}</p>
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            metric.tone === "warn"
              ? "bg-amber-50 text-amber-600"
              : metric.tone === "success"
                ? "bg-emerald-50 text-emerald-600"
                : metric.tone === "accent"
                  ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
                  : "bg-[#F3F4F6] text-[#64748B]"
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#111827] tabular-nums">
        {metric.value}
      </p>
    </>
  );

  const cardClass =
    "block rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition duration-200 hover:border-[#FF5A1F]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40";

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
    (a) =>
      a.primary &&
      a.id !== "create_community" &&
      hasCapability(role, a.capability)
  ).slice(0, 7);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {actions.slice(0, 6).map((a: OwnerQuickAction, i) => {
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
            className="group flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 transition hover:border-[#FF5A1F]/30 hover:bg-[#FAFAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                ACTION_COLORS[i % ACTION_COLORS.length]
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
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
  query?: Record<string, string>;
  icon: LucideIcon;
}> = [
  {
    label: "Community Settings",
    description: "Name, description, branding",
    section: "settings",
    id: "settings",
    icon: Settings,
  },
  {
    label: "Privacy & Access",
    description: "Visibility and join rules",
    section: "settings",
    id: "settings",
    query: { tab: "privacy" },
    icon: ShieldCheck,
  },
  {
    label: "Roles & Permissions",
    description: "Owners, admins, moderators",
    section: "roles",
    id: "roles",
    icon: Users,
  },
  {
    label: "Notifications",
    description: "Alerts and community notifications",
    section: "ai",
    id: "ai",
    icon: Sparkles,
  },
  {
    label: "Integrations",
    description: "Connected services",
    section: "integrations",
    id: "integrations",
    icon: Layers,
  },
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
            spacesCount: spaces.length,
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
    <div className="space-y-5 animate-in fade-in duration-300">
      <header className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#F3F4F6] ring-1 ring-[#E5E7EB]">
              {community.avatarUrl ? (
                <Image
                  src={community.avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-base font-bold text-[#FF5A1F]">
                  {community.name[0]}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold tracking-tight text-[#111827] sm:text-[20px]">
                {community.name}
              </h1>
              <p className="mt-0.5 text-[13px] text-[#64748B]">
                <span className="font-medium capitalize text-[#111827]">{role}</span>
                <span className="mx-1.5 text-[#D1D5DB]">·</span>
                <span>{community.memberCount.toLocaleString()} {community.memberCount === 1 ? "member" : "members"}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {workspaceHref ? (
              <Link
                href={workspaceHref}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                View Community
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void shareCommunity()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              Share
            </button>
            {hasCapability(role, "channel.manage") ? (
              <Link
                href={hrefSection("content", { action: "create" })}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#FF5A1F] px-3 text-[12px] font-semibold text-white transition hover:bg-[#e54e1a]"
              >
                Create
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {metrics.length > 0 ? (
        <section
          aria-label="Key metrics"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {metrics.map((m) => (
            <OwnerDashboardMetricCard key={m.id} metric={m} />
          ))}
        </section>
      ) : null}

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <h2 className="text-[15px] font-semibold text-[#111827]">Quick Actions</h2>
        <p className="mt-0.5 text-[13px] text-[#6B7280]">
          Fast paths for day-to-day management
        </p>
        <div className="mt-3">
          <OwnerQuickActionsGrid
            role={role}
            communityId={community.id}
            slug={community.slug}
          />
        </div>
      </section>

      {hasCapability(role, "group.manage") ? (
        <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827]">Spaces</h2>
              <p className="mt-0.5 text-[13px] text-[#6B7280]">
                Rooms and discussion areas
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
                className="inline-flex h-8 items-center rounded-lg bg-[#FF5A1F]/10 px-3 text-[12px] font-semibold text-[#FF5A1F]"
              >
                Create Space
              </Link>
            </div>
          </div>
          {spacesLoading ? (
            <p className="mt-3 text-[13px] text-[#9CA3AF]">Loading spaces…</p>
          ) : spaces.length === 0 ? (
            <p className="mt-3 text-[13px] text-[#6B7280]">
              No spaces yet. Create one to organize members.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[#F3F4F6]">
              {spaces.map((space) => (
                <li key={space.id}>
                  <Link
                    href={hrefSection(`spaces/${space.id}`)}
                    className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-[#FAFAFB]/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#111827]">
                        {space.name}
                      </p>
                      <p className="text-[12px] text-[#6B7280]">
                        {space.memberCount != null
                          ? `${space.memberCount} ${space.memberCount === 1 ? "member" : "members"}`
                          : "Space"}
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

      {visibleSettings.length > 0 ? (
        <section className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="border-b border-[#E5E7EB] px-4 py-3 sm:px-5">
            <h2 className="text-[15px] font-semibold text-[#111827]">Settings</h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              Configure community access and integrations
            </p>
          </div>
          <ul className="divide-y divide-[#F3F4F6]">
            {visibleSettings.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <Link
                    href={hrefSection(item.section, item.query)}
                    className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#FAFAFB] sm:px-5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#64748B]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#111827]">
                        {item.label}
                      </p>
                      <p className="text-[12px] text-[#9CA3AF]">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!isManage && communities.length > 1 ? (
        <p className="px-1 text-[12px] text-[#9CA3AF]">
          Managing {communities.length} communities
          {badges.reports > 0 ? ` · ${badges.reports} open reports` : ""}
        </p>
      ) : null}
    </div>
  );
}

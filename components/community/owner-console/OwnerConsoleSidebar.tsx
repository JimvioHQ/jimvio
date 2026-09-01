"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createElement, useMemo } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JimvioLogo } from "@/components/ui/logo";
import {
  OWNER_CONSOLE_HUB,
  OWNER_NAV_ITEMS,
  OWNER_NAV_SECTIONS,
  useOwnerConsoleUiStore,
  type OwnerConsoleBadges,
  type OwnerConsoleSectionId,
} from "@/lib/community/owner-console";
import { hasCapability } from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import { ownerSectionIcon } from "./owner-icons";
import { useOwnerConsole } from "./OwnerConsoleContext";

export function OwnerConsoleSidebar({
  communitySlug,
  communityName,
  role,
  badges,
  consoleMode = "owner",
  hrefSection,
}: {
  communitySlug: string | null;
  communityName?: string | null;
  role: WorkspaceRole;
  badges: OwnerConsoleBadges;
  consoleMode?: "owner" | "manage";
  hrefSection: (section?: string, query?: Record<string, string | undefined | null>) => string;
}) {
  const pathname = usePathname();
  const collapsed = useOwnerConsoleUiStore((s) => s.sidebarCollapsed);
  const mobileOpen = useOwnerConsoleUiStore((s) => s.sidebarMobileOpen);
  const expanded = useOwnerConsoleUiStore((s) => s.expandedSections);
  const navQuery = useOwnerConsoleUiStore((s) => s.navQuery);
  const setNavQuery = useOwnerConsoleUiStore((s) => s.setNavQuery);
  const toggleNavSection = useOwnerConsoleUiStore((s) => s.toggleNavSection);
  const toggleCollapsed = useOwnerConsoleUiStore((s) => s.toggleSidebarCollapsed);
  const setMobileOpen = useOwnerConsoleUiStore((s) => s.setSidebarMobileOpen);

  const visibleIds = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    return (Object.keys(OWNER_NAV_ITEMS) as OwnerConsoleSectionId[]).filter(
      (id) => {
        if (id === "groups" || id === "channels") return false;
        const item = OWNER_NAV_ITEMS[id];
        if (id === "overview") {
          if (
            !hasCapability(role, "settings.manage") &&
            !canSeeAnyStaff(role)
          ) {
            return false;
          }
          return !q || matchQuery(item, q);
        }
        if (!hasCapability(role, item.capability)) return false;
        if (!q) return true;
        return matchQuery(item, q);
      }
    );
  }, [role, navQuery]);

  const badgeValue = (key?: keyof OwnerConsoleBadges) => {
    if (!key) return 0;
    return badges[key] ?? 0;
  };

  const consoleBase = communitySlug ? hrefSection() : OWNER_CONSOLE_HUB;
  const isManage = consoleMode === "manage";

  const navBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-3 py-3.5">
        {collapsed ? (
          <JimvioLogo variant="icon" size="sm" href={OWNER_CONSOLE_HUB} />
        ) : (
          <JimvioLogo variant="full" size="sm" href={OWNER_CONSOLE_HUB} />
        )}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleCollapsed}
          className="ml-auto hidden h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F3F4F6] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 lg:inline-flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Management identity */}
      {!collapsed && communitySlug && communityName ? (
        <div className="border-b border-[#E5E7EB] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
            {isManage ? "Manage Community" : "Manage"}
          </p>
          <p className="mt-0.5 truncate text-[14px] font-semibold text-[#111827]">
            {communityName}
          </p>
        </div>
      ) : null}

      <div className="border-b border-[#E5E7EB] px-2 py-2">
        <Link
          href={communitySlug ? consoleBase : OWNER_CONSOLE_HUB}
          onClick={() => setMobileOpen(false)}
          title="Overview"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition",
            isOverviewActive(pathname, consoleBase, communitySlug)
              ? "bg-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/25"
              : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]",
            collapsed && "justify-center px-2"
          )}
        >
          {createElement(ownerSectionIcon("overview"), {
            className: "h-4 w-4 shrink-0",
            "aria-hidden": true,
          })}
          {!collapsed && <span>Overview</span>}
        </Link>
      </div>

      {!collapsed && (
        <div className="border-b border-[#E5E7EB] px-3 py-2.5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Search console…"
              aria-label="Search owner console"
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] py-2 pl-8 pr-2 text-[12px] outline-none transition focus:border-[#FF5A1F]/40 focus:ring-2 focus:ring-[#FF5A1F]/20"
            />
          </label>
        </div>
      )}

      <nav
        className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
        aria-label="Community management sections"
      >
        {OWNER_NAV_SECTIONS.map((section) => {
          const items = section.items.filter((id) => visibleIds.includes(id));
          if (items.length === 0) return null;
          if (section.id === "overview") return null;
          const isOpen = expanded.includes(section.id) || !!navQuery.trim();
          return (
            <div key={section.id} className="mb-3">
              {!collapsed && (
                <button
                  type="button"
                  onClick={() =>
                    section.collapsible && toggleNavSection(section.id)
                  }
                  className={cn(
                    "flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]",
                    section.collapsible &&
                      "rounded-lg hover:bg-[#F3F4F6] hover:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
                  )}
                  aria-expanded={section.collapsible ? isOpen : undefined}
                >
                  {section.label}
                  {section.collapsible && (
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        !isOpen && "-rotate-90"
                      )}
                    />
                  )}
                </button>
              )}
              {(collapsed || isOpen) && (
                <ul className="mt-0.5 space-y-0.5" role="list">
                  {items.map((id) => {
                    const item = OWNER_NAV_ITEMS[id];
                    const href = communitySlug
                      ? hrefSection(item.section)
                      : OWNER_CONSOLE_HUB;
                    const active =
                      id === "overview"
                        ? isOverviewActive(pathname, consoleBase, communitySlug)
                        : pathname === href ||
                          pathname.startsWith(`${href}/`);
                    const count = badgeValue(item.badgeKey);
                    return (
                      <li key={id}>
                        <Link
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          title={item.label}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition",
                            active
                              ? "bg-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/20"
                              : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]",
                            collapsed && "justify-center px-2"
                          )}
                        >
                          {createElement(ownerSectionIcon(id), {
                            className: "h-4 w-4 shrink-0",
                            "aria-hidden": true,
                          })}
                          {!collapsed && (
                            <>
                              <span className="min-w-0 flex-1 truncate">
                                {item.label}
                              </span>
                              {count > 0 && (
                                <span
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                                    active
                                      ? "bg-white/20 text-white"
                                      : "bg-[#EF4444] text-white"
                                  )}
                                >
                                  {count > 99 ? "99+" : count}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {!collapsed && communitySlug && (
        <div className="border-t border-[#E5E7EB] p-3">
          <Link
            href={`/communities/${encodeURIComponent(communitySlug)}`}
            className="flex items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] px-3 py-2 text-[12px] font-semibold text-[#4B5563] transition hover:border-[#FF5A1F]/30 hover:text-[#111827]"
          >
            View Community
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 border-r border-[#E5E7EB] bg-white transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {navBody}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal>
          <button
            type="button"
            aria-label="Close overlay"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,288px)] flex-col bg-white shadow-2xl">
            {navBody}
          </aside>
        </div>
      )}
    </>
  );
}

function isOverviewActive(
  pathname: string,
  consoleBase: string,
  communitySlug: string | null
) {
  if (!communitySlug) return pathname === OWNER_CONSOLE_HUB;
  return (
    pathname === consoleBase ||
    pathname === `${consoleBase}/` ||
    pathname.endsWith(`/communities/${communitySlug}/manage`) ||
    pathname.endsWith(`/communities/${communitySlug}/manage/`)
  );
}

function matchQuery(
  item: { label: string; description: string },
  q: string
) {
  return (
    item.label.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q)
  );
}

function canSeeAnyStaff(role: WorkspaceRole) {
  return (
    hasCapability(role, "settings.manage") ||
    hasCapability(role, "channel.manage") ||
    hasCapability(role, "pins.manage") ||
    hasCapability(role, "members.invite") ||
    hasCapability(role, "group.manage")
  );
}

/** Sidebar wired to OwnerConsoleContext */
export function OwnerConsoleSidebarConnected() {
  const { community, role, badges, consoleMode, hrefSection } =
    useOwnerConsole();
  return (
    <OwnerConsoleSidebar
      communitySlug={community?.slug ?? null}
      communityName={community?.name ?? null}
      role={role}
      badges={badges}
      consoleMode={consoleMode}
      hrefSection={hrefSection}
    />
  );
}

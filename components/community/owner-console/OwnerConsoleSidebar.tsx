"use client";

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
import {
  OWNER_NAV_ITEMS,
  OWNER_NAV_SECTIONS,
  sectionPath,
  useOwnerConsoleUiStore,
  type OwnerConsoleBadges,
  type OwnerConsoleSectionId,
} from "@/lib/community/owner-console";
import { hasCapability } from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import { ownerSectionIcon } from "./owner-icons";

export function OwnerConsoleSidebar({
  communityId,
  role,
  badges,
}: {
  communityId: string | null;
  role: WorkspaceRole;
  badges: OwnerConsoleBadges;
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
        const item = OWNER_NAV_ITEMS[id];
        if (!hasCapability(role, item.capability) && item.id !== "overview") {
          // overview always for console entrants
          if (!hasCapability(role, "settings.manage") && id === "overview") {
            return canSeeAnyStaff(role);
          }
          if (id !== "overview" && !hasCapability(role, item.capability)) {
            return false;
          }
        }
        if (id === "overview") return !q || item.label.toLowerCase().includes(q);
        if (!hasCapability(role, item.capability)) return false;
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        );
      }
    );
  }, [role, navQuery]);

  const badgeValue = (key?: keyof OwnerConsoleBadges) => {
    if (!key) return 0;
    return badges[key] ?? 0;
  };

  const navBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-3">
        {!collapsed && (
          <p className="flex-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Owner Console
          </p>
        )}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleCollapsed}
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] lg:inline-flex"
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!collapsed && (
        <div className="border-b border-[var(--color-border)] px-3 py-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Search console…"
              aria-label="Search owner console"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-8 pr-2 text-[12px] outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
          </label>
        </div>
      )}

      <nav
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
        aria-label="Owner console sections"
      >
        {OWNER_NAV_SECTIONS.map((section) => {
          const items = section.items.filter((id) => visibleIds.includes(id));
          if (items.length === 0) return null;
          const isOpen = expanded.includes(section.id) || !!navQuery.trim();
          return (
            <div key={section.id} className="mb-2">
              {!collapsed && (
                <button
                  type="button"
                  onClick={() =>
                    section.collapsible && toggleNavSection(section.id)
                  }
                  className={cn(
                    "flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]",
                    section.collapsible && "hover:text-[var(--color-text-primary)]"
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
                <ul className="space-y-0.5" role="list">
                  {items.map((id) => {
                    const item = OWNER_NAV_ITEMS[id];
                    const href = sectionPath(item.href, communityId);
                    const active =
                      id === "overview"
                        ? pathname === "/community-owner" ||
                          pathname === "/community-owner/"
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");
                    const count = badgeValue(item.badgeKey);
                    return (
                      <li key={id}>
                        <Link
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          title={item.label}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors",
                            active
                              ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
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
                                <span className="rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
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
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex lg:flex-col",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {navBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal>
          <button
            type="button"
            aria-label="Close overlay"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,280px)] flex-col bg-[var(--color-surface)] shadow-xl">
            {navBody}
          </aside>
        </div>
      )}
    </>
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

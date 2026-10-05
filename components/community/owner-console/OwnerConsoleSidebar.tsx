"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createElement, useMemo } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OWNER_CONSOLE_HUB,
  OWNER_NAV_ITEMS,
  OWNER_NAV_SECTIONS,
  MANAGE_NAV_SECTIONS,
  useOwnerConsoleUiStore,
  type OwnerConsoleBadges,
  type OwnerConsoleSectionId,
} from "@/lib/community/owner-console";
import { hasCapability } from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import { ownerSectionIcon } from "./owner-icons";
import { useOwnerConsole } from "./OwnerConsoleContext";

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  creator: "Creator",
  mentor: "Mentor",
  verified: "Verified",
  vip: "VIP",
  member: "Member",
  guest: "Guest",
};

export function OwnerConsoleSidebar({
  communitySlug,
  communityName,
  communityAvatarUrl,
  role,
  badges,
  consoleMode = "owner",
  hrefSection,
}: {
  communitySlug: string | null;
  communityName?: string | null;
  communityAvatarUrl?: string | null;
  role: WorkspaceRole;
  badges: OwnerConsoleBadges;
  consoleMode?: "owner" | "manage";
  hrefSection: (
    section?: string,
    query?: Record<string, string | undefined | null>
  ) => string;
}) {
  const pathname = usePathname();
  const mobileOpen = useOwnerConsoleUiStore((s) => s.sidebarMobileOpen);
  const expanded = useOwnerConsoleUiStore((s) => s.expandedSections);
  const toggleNavSection = useOwnerConsoleUiStore((s) => s.toggleNavSection);
  const setMobileOpen = useOwnerConsoleUiStore((s) => s.setSidebarMobileOpen);

  const visibleIds = useMemo(() => {
    return (Object.keys(OWNER_NAV_ITEMS) as OwnerConsoleSectionId[]).filter(
      (id) => {
        if (id === "groups" || id === "channels") return false;
        const item = OWNER_NAV_ITEMS[id];
        if (id === "overview") {
          return (
            hasCapability(role, "settings.manage") || canSeeAnyStaff(role)
          );
        }
        return hasCapability(role, item.capability);
      }
    );
  }, [role]);

  const badgeValue = (key?: keyof OwnerConsoleBadges) => {
    if (!key) return 0;
    return badges[key] ?? 0;
  };

  const consoleBase = communitySlug ? hrefSection() : OWNER_CONSOLE_HUB;
  const isManage = consoleMode === "manage";
  const navSections = isManage ? MANAGE_NAV_SECTIONS : OWNER_NAV_SECTIONS;

  const navBody = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#E5E7EB] px-4 py-3.5">
        {isManage && communitySlug ? (
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6] ring-1 ring-[#E5E7EB]">
              {communityAvatarUrl ? (
                <Image
                  src={communityAvatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[#FF5A1F]">
                  {(communityName ?? "C")[0]}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#111827]">
                {communityName ?? "Community"}
              </p>
              <p className="text-[11px] font-medium text-[#9CA3AF]">
                {ROLE_LABELS[role]}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#111827]">
                Owner Console
              </p>
              {communityName ? (
                <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">
                  {communityName}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <nav
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-3"
        aria-label="Community management"
      >
        {navSections.map((section) => {
          const items = section.items.filter((id) => visibleIds.includes(id));
          if (items.length === 0) return null;
          const isOpen =
            !section.collapsible ||
            expanded.includes(section.id) ||
            section.id === "overview";
          return (
            <div key={section.id}>
              {section.label && section.id !== "overview" ? (
                <button
                  type="button"
                  onClick={() =>
                    section.collapsible && toggleNavSection(section.id)
                  }
                  className={cn(
                    "mb-1 flex w-full items-center justify-between px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]",
                    section.collapsible &&
                      "rounded-lg py-1 hover:bg-[#F3F4F6] hover:text-[#6B7280]"
                  )}
                  aria-expanded={section.collapsible ? isOpen : undefined}
                >
                  {section.label}
                  {section.collapsible ? (
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        !isOpen && "-rotate-90"
                      )}
                    />
                  ) : null}
                </button>
              ) : null}
              {isOpen ? (
                <div className="space-y-0.5">
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
                      <Link
                        key={id}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        title={item.label}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
                            : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                        )}
                      >
                        {active ? (
                          <span
                            className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#FF5A1F]"
                            aria-hidden
                          />
                        ) : null}
                        {createElement(ownerSectionIcon(id), {
                          className: cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-[#FF5A1F]" : "text-[#9CA3AF]"
                          ),
                          "aria-hidden": true,
                        })}
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {count > 0 ? (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                              active
                                ? "bg-[#FF5A1F]/15 text-[#FF5A1F]"
                                : "bg-[#EF4444] text-white"
                            )}
                          >
                            {count > 99 ? "99+" : count}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* View Community lives in the manager top bar — keep sidebar nav-only. */}
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-full w-[220px] shrink-0 self-stretch overflow-hidden border-r border-[#E5E7EB] bg-white lg:block">
        {navBody}
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-[80] lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close overlay"
          tabIndex={mobileOpen ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-150",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "relative flex h-full w-[min(280px,88vw)] flex-col border-r border-[#E5E7EB] bg-white shadow-xl transition-transform duration-150 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal={mobileOpen}
          aria-label="Community management"
        >
          {navBody}
        </aside>
      </div>
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
      communityAvatarUrl={community?.avatarUrl ?? null}
      role={role}
      badges={badges}
      consoleMode={consoleMode}
      hrefSection={hrefSection}
    />
  );
}

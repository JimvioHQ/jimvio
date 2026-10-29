"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight, ChevronsUpDown, ExternalLink, Menu, MoreHorizontal, Plus, Search, Share2 } from "lucide-react";
import {
  OWNER_CONSOLE_HUB,
  ownerConsoleHref,
  useOwnerConsoleUiStore,
  type CommunityConsoleMode,
  type OwnerCommunitySummary,
} from "@/lib/community/owner-console";
import type { WorkspaceRole } from "@/lib/community/workspace/types";

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

export function OwnerConsoleTopBar({
  communities,
  community,
  role,
  notificationCount = 0,
  workspaceHref,
  consoleMode = "owner",
  hrefSection,
}: {
  communities: OwnerCommunitySummary[];
  community: OwnerCommunitySummary | null;
  role: WorkspaceRole;
  userName: string;
  userAvatar: string | null;
  workspaceHref: string | null;
  notificationCount?: number;
  consoleMode?: CommunityConsoleMode;
  hrefSection?: (
    section?: string,
    query?: Record<string, string | undefined | null>
  ) => string;
}) {
  const router = useRouter();
  const setMobileOpen = useOwnerConsoleUiStore((s) => s.setSidebarMobileOpen);
  const setSelected = useOwnerConsoleUiStore((s) => s.setSelectedCommunityId);
  const isManage = consoleMode === "manage";

  const createHref = community
    ? hrefSection
      ? hrefSection("content", { action: "create" })
      : ownerConsoleHref(community.slug, "content", { action: "create" })
    : "/communities/create";

  const shareCommunity = async () => {
    if (!community?.slug) return;
    const url = `${window.location.origin}/communities/${community.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: community.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  if (isManage && community) {
    return (
      <ManageTopBar
        community={community}
        workspaceHref={workspaceHref}
        hrefSection={hrefSection}
        onShare={() => void shareCommunity()}
        onOpenMenu={() => setMobileOpen(true)}
      />
    );
  }

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-[#E5E7EB] bg-white/95 px-3 backdrop-blur sm:h-14 sm:gap-3 sm:px-5">
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={false}
        onClick={() => setMobileOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <label className="relative min-w-0">
        <span className="sr-only">Workspace Switcher</span>
        <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] py-1 pl-1.5 pr-2">
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-[#F3F4F6]">
            {community?.avatarUrl ? (
              <Image
                src={community.avatarUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#FF5A1F]">
                {(community?.name ?? "J")[0]}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="max-w-[120px] truncate text-[13px] font-semibold text-[#111827] sm:max-w-[180px]">
              {community?.name ?? "Select workspace"}
            </p>
            <p className="hidden text-[10px] font-medium text-[#9CA3AF] sm:block">
              {ROLE_LABELS[role]}
              {isManage ? " · Managing" : ""}
            </p>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
        </div>
        <select
          value={community?.slug ?? ""}
          onChange={(e) => {
            const slug = e.target.value;
            if (!slug) {
              router.push(OWNER_CONSOLE_HUB);
              return;
            }
            const next = communities.find((c) => c.slug === slug);
            if (next) setSelected(next.id);
            if (isManage) {
              router.push(`/communities/${encodeURIComponent(slug)}/manage`);
            } else {
              router.push(ownerConsoleHref(slug));
            }
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Switch workspace"
        >
          {!isManage ? <option value="">All communities</option> : null}
          {communities.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name} — {ROLE_LABELS[c.role] ?? c.role}
            </option>
          ))}
        </select>
      </label>

      <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search community..."
          aria-label="Search community"
          className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] py-2 pl-9 pr-3 text-[13px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#FF5A1F]/40 focus:ring-2 focus:ring-[#FF5A1F]/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
        {workspaceHref ? (
          <Link
            href={workspaceHref}
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#111827] transition hover:bg-[#F8FAFC] sm:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View Community
          </Link>
        ) : null}

        {community ? (
          <button
            type="button"
            onClick={() => void shareCommunity()}
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#111827] transition hover:bg-[#F8FAFC] md:inline-flex"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Share
          </button>
        ) : null}

        <Link
          href={createHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-3 text-[12px] font-semibold text-white transition hover:bg-[#e54e1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Create</span>
        </Link>

        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {notificationCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}

/** Manage Community top bar — breadcrumb + View / Share / More (design spec). */
function ManageTopBar({
  community,
  workspaceHref,
  hrefSection,
  onShare,
  onOpenMenu,
}: {
  community: OwnerCommunitySummary;
  workspaceHref: string | null;
  hrefSection?: (section?: string, query?: Record<string, string | undefined | null>) => string;
  onShare: () => void;
  onOpenMenu: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);
  const link = (section: string, query?: Record<string, string>) =>
    hrefSection ? hrefSection(section, query) : ownerConsoleHref(community.slug, section, query);
  const menuItems = [
    { label: "Create post", href: link("content", { action: "create" }) },
    { label: "Go live", href: link("live") },
    { label: "Invite members", href: link("members") },
    { label: "Community settings", href: link("settings") },
  ];
  const btn =
    "inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-[13px] font-semibold text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-[#F8FAFC]";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-[#E5E7EB] bg-white/95 px-3 backdrop-blur sm:px-6 lg:h-16 lg:border-b-0 lg:bg-[#F8FAFC]/95">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenMenu}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#374151] hover:bg-[#F3F4F6] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[14px]">
        <Link href="/communities" className="hidden shrink-0 text-[#6B7280] hover:text-[#111827] sm:inline">
          Communities
        </Link>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-[#9CA3AF] sm:block" aria-hidden />
        <span className="flex min-w-0 items-center gap-2 font-semibold text-[#111827]">
          <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6] ring-1 ring-[#E5E7EB] sm:hidden">
            {community.avatarUrl ? (
              <Image src={community.avatarUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-[#FF5A1F]">
                {community.name[0]}
              </span>
            )}
          </span>
          <span className="truncate">{community.name}</span>
        </span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {workspaceHref ? (
          <Link href={workspaceHref} className={`${btn} hidden sm:inline-flex`}>
            <ExternalLink className="h-4 w-4" aria-hidden />
            View Community
          </Link>
        ) : null}
        <button type="button" onClick={onShare} className={`${btn} hidden sm:inline-flex`}>
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#374151] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-[#F8FAFC]"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen ? (
            <div role="menu" className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg">
              {menuItems.map((m) => (
                <Link
                  key={m.label}
                  href={m.href}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC]"
                >
                  {m.label}
                </Link>
              ))}
              {workspaceHref ? (
                <Link
                  href={workspaceHref}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC] sm:hidden"
                >
                  View community
                </Link>
              ) : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onShare();
                }}
                className="block w-full px-4 py-2.5 text-left text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC] sm:hidden"
              >
                Share
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

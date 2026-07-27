"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Calendar, ChevronsUpDown, Menu, Plus, Search } from "lucide-react";
import {
  OWNER_CONSOLE_HUB,
  ownerConsoleHref,
  useOwnerConsoleUiStore,
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

function formatDateLabel(d = new Date()) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function OwnerConsoleTopBar({
  communities,
  community,
  role,
  userName,
  userAvatar,
  workspaceHref,
  notificationCount = 0,
}: {
  communities: OwnerCommunitySummary[];
  community: OwnerCommunitySummary | null;
  role: WorkspaceRole;
  userName: string;
  userAvatar: string | null;
  workspaceHref: string | null;
  notificationCount?: number;
}) {
  const router = useRouter();
  const setMobileOpen = useOwnerConsoleUiStore((s) => s.setSidebarMobileOpen);
  const setSelected = useOwnerConsoleUiStore((s) => s.setSelectedCommunityId);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#E5E7EB] bg-white px-3 sm:px-5">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] transition hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Workspace switcher */}
      <label className="relative hidden min-w-0 sm:block">
        <span className="sr-only">Workspace Switcher</span>
        <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] py-1.5 pl-2 pr-2.5">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6]">
            {community?.avatarUrl ? (
              <Image
                src={community.avatarUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[#FF5A1F]">
                {(community?.name ?? "J")[0]}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="max-w-[140px] truncate text-[13px] font-semibold text-[#111827] lg:max-w-[180px]">
              {community?.name ?? "Select workspace"}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
              {ROLE_LABELS[role]}
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
            router.push(ownerConsoleHref(slug));
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Switch workspace"
        >
          <option value="">All communities</option>
          {communities.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* Quick search */}
      <div className="relative ml-auto hidden max-w-md flex-1 md:block">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search anything..."
          aria-label="Quick search"
          className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] py-2.5 pl-10 pr-14 text-[13px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#FF5A1F]/40 focus:ring-2 focus:ring-[#FF5A1F]/20"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#9CA3AF] sm:inline">
          ⌘ K
        </kbd>
      </div>

      {/* Date filter */}
      <button
        type="button"
        aria-label="Date filter"
        className="hidden items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-medium text-[#4B5563] transition hover:bg-[#FAFAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 xl:inline-flex"
      >
        <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden />
        {formatDateLabel()}
      </button>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link
          href={
            community
              ? ownerConsoleHref(community.slug, "members", { action: "invite" })
              : "/communities/create"
          }
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FF5A1F] px-3.5 text-[13px] font-semibold text-white shadow-sm shadow-[#FF5A1F]/25 transition hover:scale-[1.02] hover:bg-[#F04E14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Create</span>
        </Link>

        {workspaceHref && (
          <Link
            href={workspaceHref}
            className="sr-only"
            tabIndex={-1}
          >
            Workspace
          </Link>
        )}

        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] transition hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
        >
          <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] py-1 pl-1 pr-2.5">
          <div className="relative h-8 w-8 overflow-hidden rounded-full bg-[#F3F4F6]">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-[#111827]">
                {userName[0] ?? "U"}
              </span>
            )}
          </div>
          <span className="hidden max-w-[110px] truncate text-[12px] font-semibold text-[#111827] sm:inline">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}

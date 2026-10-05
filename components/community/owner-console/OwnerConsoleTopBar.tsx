"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronsUpDown, ExternalLink, Menu, Plus, Search, Share2 } from "lucide-react";
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
              {c.name}
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

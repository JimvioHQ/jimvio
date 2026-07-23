"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  Plus,
  Search,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OWNER_CONSOLE_BASE,
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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-4">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          {community?.avatarUrl ? (
            <Image
              src={community.avatarUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-black text-[var(--color-accent)]">
              {(community?.name ?? "J")[0]}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
            {community?.name ?? "Select a community"}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {ROLE_LABELS[role]}
          </p>
        </div>
      </div>

      {communities.length > 1 && (
        <label className="hidden min-w-[140px] sm:block">
          <span className="sr-only">Switch community</span>
          <select
            value={community?.id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              setSelected(id);
              router.push(`${OWNER_CONSOLE_BASE}?community=${id}`);
            }}
            className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1.5 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="search"
          placeholder="Quick search…"
          aria-label="Quick search"
          className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-2 pl-9 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
      </div>

      <div className="flex items-center gap-1.5">
        {workspaceHref && (
          <Link
            href={workspaceHref}
            className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] sm:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Workspace
          </Link>
        )}
        <Link
          href={
            community
              ? `${OWNER_CONSOLE_BASE}/members?community=${community.id}&action=invite`
              : `${OWNER_CONSOLE_BASE}/members`
          }
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--color-accent)] px-2.5 text-[12px] font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Invite</span>
        </Link>
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          )}
        </button>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border border-[var(--color-border)] py-1 pl-1 pr-2.5"
          )}
        >
          <div className="relative h-7 w-7 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            {userAvatar ? (
              <Image src={userAvatar} alt="" fill className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] font-bold">
                {userName[0] ?? "U"}
              </span>
            )}
          </div>
          <span className="hidden max-w-[100px] truncate text-[12px] font-semibold sm:inline">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}

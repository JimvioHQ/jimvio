"use client";

import { useRef } from "react";
import Image from "next/image";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Ban,
  Eye,
  MoreHorizontal,
  Shield,
  UserMinus,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  type MemberViewMode,
  type OwnerMemberListItem,
} from "@/lib/community/owner-console/members";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function Avatar({ member }: { member: OwnerMemberListItem }) {
  const initial = member.displayName[0]?.toUpperCase() ?? "M";
  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
      {member.avatarUrl ? (
        <Image
          src={member.avatarUrl}
          alt=""
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--color-accent)]">
          {initial}
        </span>
      )}
      {member.isOnline && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)] bg-emerald-500" />
      )}
    </div>
  );
}

function StatusPill({ member }: { member: OwnerMemberListItem }) {
  const tone =
    member.status === "active"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : member.status === "banned" || member.status === "suspended"
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tone
      )}
    >
      {MEMBER_STATUS_LABELS[member.status] ?? member.status}
    </span>
  );
}

export function MembersList({
  members,
  view,
  selectedIds,
  onToggleSelect,
  onOpen,
  onAction,
}: {
  members: OwnerMemberListItem[];
  view: MemberViewMode;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onAction: (id: string, action: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (view === "table" ? 64 : 140),
    overscan: 12,
  });

  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
        No members match your filters.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[min(70vh,720px)] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      role="region"
      aria-label="Members list"
    >
      {view === "table" && (
        <div className="sticky top-0 z-10 hidden grid-cols-[40px_minmax(180px,1.4fr)_100px_100px_120px_110px_110px_90px_90px_48px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] md:grid">
          <span />
          <span>Member</span>
          <span>Role</span>
          <span>Status</span>
          <span>Groups</span>
          <span>Joined</span>
          <span>Last active</span>
          <span>Score</span>
          <span>Creator</span>
          <span />
        </div>
      )}
      <div
        style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const member = members[virtualRow.index]!;
          const selected = selectedIds.includes(member.id);
          return (
            <div
              key={member.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className={cn(
                "absolute left-0 top-0 w-full border-b border-[var(--color-border)]/60",
                selected && "bg-[var(--color-accent)]/5"
              )}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {view === "table" ? (
                <div className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 md:grid-cols-[40px_minmax(180px,1.4fr)_100px_100px_120px_110px_110px_90px_90px_48px]">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(member.id)}
                    aria-label={`Select ${member.displayName}`}
                    className="h-4 w-4"
                  />
                  <button
                    type="button"
                    onClick={() => onOpen(member.id)}
                    className="flex min-w-0 items-center gap-2.5 text-left"
                  >
                    <Avatar member={member} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {member.displayName}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                        {member.username ? `@${member.username}` : "—"}
                        {member.isVerified ? " · Verified" : ""}
                      </span>
                    </span>
                  </button>
                  <span className="text-[12px] font-medium">
                    {MEMBER_ROLE_LABELS[String(member.role)] ?? member.role}
                  </span>
                  <StatusPill member={member} />
                  <span className="truncate text-[12px] text-[var(--color-text-muted)]">
                    {member.groupNames.slice(0, 2).join(", ") || "—"}
                  </span>
                  <span className="text-[12px] text-[var(--color-text-muted)]">
                    {formatDate(member.joinedAt)}
                  </span>
                  <span className="text-[12px] text-[var(--color-text-muted)]">
                    {formatDate(member.lastActiveAt)}
                  </span>
                  <span className="tabular-nums text-[12px] font-semibold">
                    {member.contributionScore}
                  </span>
                  <span className="tabular-nums text-[12px] font-semibold">
                    {member.creatorScore}
                  </span>
                  <MemberActions
                    member={member}
                    onOpen={onOpen}
                    onAction={onAction}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(member.id)}
                    aria-label={`Select ${member.displayName}`}
                    className="mt-2 h-4 w-4"
                  />
                  <button
                    type="button"
                    onClick={() => onOpen(member.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <Avatar member={member} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {member.displayName}
                        </p>
                        <StatusPill member={member} />
                      </div>
                      <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                        {MEMBER_ROLE_LABELS[String(member.role)] ?? member.role}
                        {member.username ? ` · @${member.username}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {member.badges.map((b) => (
                          <span
                            key={b.id}
                            className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]"
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                        Joined {formatDate(member.joinedAt)} · Score{" "}
                        {member.contributionScore} · Creator {member.creatorScore}
                      </p>
                    </div>
                  </button>
                  <MemberActions
                    member={member}
                    onOpen={onOpen}
                    onAction={onAction}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberActions({
  member,
  onOpen,
  onAction,
}: {
  member: OwnerMemberListItem;
  onOpen: (id: string) => void;
  onAction: (id: string, action: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Actions for ${member.displayName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onOpen(member.id)}>
          <Eye className="mr-2 h-4 w-4" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction(member.id, "change_role")}>
          <Shield className="mr-2 h-4 w-4" />
          Change Role
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction(member.id, "mute")}>
          <VolumeX className="mr-2 h-4 w-4" />
          Mute
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction(member.id, "ban")}>
          <Ban className="mr-2 h-4 w-4" />
          Ban
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-rose-600"
          onClick={() => onAction(member.id, "remove")}
        >
          <UserMinus className="mr-2 h-4 w-4" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

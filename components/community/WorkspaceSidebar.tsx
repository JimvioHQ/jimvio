"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  LayoutList,
  Lock,
  MessageCircle,
  MessageSquare,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  canAccessRoomNav,
  requiredPlanLabel,
  type MembershipLite,
} from "@/lib/community-workspace-access";
import type { WorkspaceRoomRow, WorkspaceSpaceRow } from "@/components/community/workspace-context";

function roomTypeIcon(roomType: string) {
  switch (roomType) {
    case "chat":
      return MessageCircle;
    case "course":
      return BookOpen;
    case "posts":
      return FileText;
    case "resources":
      return Folder;
    case "tasks":
      return CheckSquare;
    default:
      return LayoutList;
  }
}

function unreadForRoom(roomId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(`workspace-unread:${roomId}`);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function WorkspaceSidebar({
  slug,
  communityName,
  avatarUrl,
  memberCount,
  ownerId,
  userId,
  membership,
  profile,
  points,
  spaces,
  mobileOpen,
  onNavigate,
}: {
  slug: string;
  communityName: string;
  avatarUrl: string | null;
  memberCount: number;
  ownerId: string;
  userId: string;
  membership: MembershipLite | null;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: { total_points: number; level: number } | null;
  spaces: WorkspaceSpaceRow[];
  mobileOpen: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    spaces.forEach((s) => {
      init[s.id] = true;
    });
    return init;
  });

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<"Paid" | "Premium">("Paid");

  const currentRoom = searchParams.get("room") || "";
  const showSettings = ownerId === userId || membership?.role === "owner" || membership?.role === "admin";

  const base = `/communities/${slug}/workspace`;

  function navigateRoom(spaceId: string, roomId: string) {
    router.push(`${base}?space=${spaceId}&room=${roomId}`);
    onNavigate?.();
  }

  function handleRoomClick(space: WorkspaceSpaceRow, room: WorkspaceRoomRow) {
    const ok = canAccessRoomNav(
      { is_locked: room.is_locked, access_type: room.access_type },
      space.access_type,
      membership,
      ownerId,
      userId,
      space.id
    );
    if (!ok) {
      setUpgradePlan(requiredPlanLabel(room, space.access_type));
      setUpgradeOpen(true);
      return;
    }
    navigateRoom(space.id, room.id);
  }

  const membersActive = pathname.includes("/workspace/members");
  const leaderboardActive = pathname.includes("/workspace/leaderboard");
  const chatsActive = pathname.includes("/workspace/chats");

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ top: "var(--navbar-height)", height: "calc(100vh - var(--navbar-height))" }}
      >
        <div className="p-3 border-b border-[var(--color-border)] flex items-start gap-2">
          <div className="h-9 w-9 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={36} height={36} className="object-cover h-full w-full" unoptimized />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm font-black text-[var(--color-accent)]">
                {communityName[0] ?? "?"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-[var(--color-text-primary)] text-sm leading-tight truncate">{communityName}</p>
            <p className="text-[11px] text-[var(--color-text-muted)] font-semibold">{memberCount.toLocaleString()} members</p>
          </div>
          {showSettings && (
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          <p className="px-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Spaces</p>
          {spaces.map((space) => {
            const isOpen = expanded[space.id] !== false;
            return (
              <div key={space.id} className="rounded-xl border border-transparent">
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [space.id]: !isOpen }))}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-secondary)] text-left"
                >
                  <span className="text-lg leading-none w-6 text-center">{space.icon || "Â·"}</span>
                  <span className="flex-1 text-xs font-black text-[var(--color-text-primary)] truncate">{space.name}</span>
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                </button>
                {isOpen && (
                  <ul className="mt-0.5 pl-2 space-y-0.5 border-l border-[var(--color-border)] ml-4">
                    {space.rooms.map((room) => {
                      const Icon = roomTypeIcon(room.room_type);
                      const active = currentRoom === room.id && !membersActive && !leaderboardActive;
                      const canEnter = canAccessRoomNav(
                        { is_locked: room.is_locked, access_type: room.access_type },
                        space.access_type,
                        membership,
                        ownerId,
                        userId,
                        space.id
                      );
                      const ur = room.room_type === "chat" ? unreadForRoom(room.id) : 0;
                      return (
                        <li key={room.id}>
                          <button
                            type="button"
                            onClick={() => handleRoomClick(space, room)}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs font-semibold",
                              active
                                ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]",
                              !canEnter && "opacity-50"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate flex-1">{room.name}</span>
                            {!canEnter && <Lock className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />}
                            {ur > 0 && (
                              <span className="text-[10px] font-black px-1.5 py-0 rounded-full bg-[var(--color-danger-light)] text-[var(--color-danger)]">
                                {ur > 9 ? "9+" : ur}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--color-border)] p-2 space-y-1">
          <Link
            href={`${base}/chats`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-xl text-xs font-bold",
              chatsActive ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Chats
          </Link>
          <Link
            href={`${base}/members`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-xl text-xs font-bold",
              membersActive ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
            )}
          >
            <Users className="h-4 w-4" />
            Members
          </Link>
          <Link
            href={`${base}/leaderboard`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-xl text-xs font-bold",
              leaderboardActive ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
            )}
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
          </Link>
        </div>

        <div className="border-t border-[var(--color-border)] p-2 hidden lg:block">
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-[var(--color-surface-secondary)]/80">
            <div className="h-9 w-9 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="" width={36} height={36} className="object-cover h-full w-full" unoptimized />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm font-black text-[var(--color-accent)]">
                  {(profile?.full_name || profile?.username || "?")[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                {profile?.full_name || profile?.username || "Member"}
              </p>
              <p className="text-[10px] font-black text-[var(--color-accent)]">
                {(points?.total_points ?? 0).toLocaleString()} pts Â· Lvl {points?.level ?? 1}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black !text-[var(--color-text-primary)]">Upgrade to access this space</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-text-muted)]">
            This room requires <span className="font-bold text-[var(--color-text-primary)]">{upgradePlan}</span> access.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-0 justify-end pt-2">
            <Button variant="outline" className="rounded-xl border-[var(--color-border)]" onClick={() => setUpgradeOpen(false)}>
              Close
            </Button>
            <Button asChild className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black">
              <Link href={`/communities/${slug}/subscribe`}>Upgrade Plan</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

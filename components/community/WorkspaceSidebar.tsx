// "use client";

// import React, { useState } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";
// import {
//   BookOpen,
//   CheckSquare,
//   ChevronDown,
//   ChevronRight,
//   FileText,
//   Folder,
//   LayoutList,
//   Lock,
//   MessageCircle,
//   MessageSquare,
//   Settings,
//   Trophy,
//   Users,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { cn } from "@/lib/utils";
// import {
//   canAccessRoomNav,
//   requiredPlanLabel,
//   type MembershipLite,
// } from "@/lib/community-workspace-access";
// import type { WorkspaceRoomRow, WorkspaceSpaceRow } from "@/components/community/workspace-context";

// function roomTypeIcon(roomType: string) {
//   switch (roomType) {
//     case "chat":
//       return MessageCircle;
//     case "course":
//       return BookOpen;
//     case "posts":
//       return FileText;
//     case "resources":
//       return Folder;
//     case "tasks":
//       return CheckSquare;
//     default:
//       return LayoutList;
//   }
// }

// function unreadForRoom(roomId: string): number {
//   if (typeof window === "undefined") return 0;
//   try {
//     const raw = localStorage.getItem(`workspace-unread:${roomId}`);
//     const n = raw ? parseInt(raw, 10) : 0;
//     return Number.isFinite(n) && n > 0 ? n : 0;
//   } catch {
//     return 0;
//   }
// }

// export function WorkspaceSidebar({
//   slug,
//   communityName,
//   avatarUrl,
//   memberCount,
//   ownerId,
//   userId,
//   membership,
//   profile,
//   points,
//   spaces,
//   mobileOpen,
//   onNavigate,
// }: {
//   slug: string;
//   communityName: string;
//   avatarUrl: string | null;
//   memberCount: number;
//   ownerId: string;
//   userId: string;
//   membership: MembershipLite | null;
//   profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
//   points: { total_points: number; level: number } | null;
//   spaces: WorkspaceSpaceRow[];
//   mobileOpen: boolean;
//   onNavigate?: () => void;
// }) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const searchParams = useSearchParams();
//   const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
//     const init: Record<string, boolean> = {};
//     spaces.forEach((s) => {
//       init[s.id] = true;
//     });
//     return init;
//   });

//   const [upgradeOpen, setUpgradeOpen] = useState(false);
//   const [upgradePlan, setUpgradePlan] = useState<"Paid" | "Premium">("Paid");

//   const currentRoom = searchParams.get("room") || "";
//   const showSettings = ownerId === userId || membership?.role === "owner" || membership?.role === "admin";

//   const base = `/communities/${slug}/workspace`;

//   function navigateRoom(spaceId: string, roomId: string) {
//     router.push(`${base}?space=${spaceId}&room=${roomId}`);
//     onNavigate?.();
//   }

//   function handleRoomClick(space: WorkspaceSpaceRow, room: WorkspaceRoomRow) {
//     const ok = canAccessRoomNav(
//       { is_locked: room.is_locked, access_type: room.access_type },
//       space.access_type,
//       membership,
//       ownerId,
//       userId,
//       space.id
//     );
//     if (!ok) {
//       setUpgradePlan(requiredPlanLabel(room, space.access_type));
//       setUpgradeOpen(true);
//       return;
//     }
//     navigateRoom(space.id, room.id);
//   }

//   const membersActive = pathname.includes("/workspace/members");
//   const leaderboardActive = pathname.includes("/workspace/leaderboard");
//   const chatsActive = pathname.includes("/workspace/chats");

//   return (
//     <>
//       <aside
//         className={cn(
//           "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0",
//           mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
//         )}
//         style={{ top: "var(--navbar-height)", height: "calc(100vh - var(--navbar-height))" }}
//       >
//         <div className="p-3 border-b border-[var(--color-border)] flex items-start gap-2">
//           <div className="h-9 w-9 rounded-sm overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
//             {avatarUrl ? (
//               <Image src={avatarUrl} alt="" width={36} height={36} className="object-cover h-full w-full" unoptimized />
//             ) : (
//               <div className="h-full w-full flex items-center justify-center text-sm font-black text-[var(--color-accent)]">
//                 {communityName[0] ?? "?"}
//               </div>
//             )}
//           </div>
//           <div className="min-w-0 flex-1">
//             <p className="font-black text-[var(--color-text-primary)] text-sm leading-tight truncate">{communityName}</p>
//             <p className="text-[11px] text-[var(--color-text-muted)] font-semibold">{memberCount.toLocaleString()} members</p>
//           </div>
//           {showSettings && (
//             <Link
//               href="/dashboard"
//               className="p-1.5 rounded-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
//               title="Settings"
//             >
//               <Settings className="h-4 w-4" />
//             </Link>
//           )}
//         </div>

//         <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
//           <p className="px-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Spaces</p>
//           {spaces.map((space) => {
//             const isOpen = expanded[space.id] !== false;
//             return (
//               <div key={space.id} className="rounded-sm border border-transparent">
//                 <button
//                   type="button"
//                   onClick={() => setExpanded((e) => ({ ...e, [space.id]: !isOpen }))}
//                   className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-[var(--color-surface-secondary)] text-left"
//                 >
//                   <span className="text-lg leading-none w-6 text-center">{space.icon || "·"}</span>
//                   <span className="flex-1 text-xs font-black text-[var(--color-text-primary)] truncate">{space.name}</span>
//                   {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
//                 </button>
//                 {isOpen && (
//                   <ul className="mt-0.5 pl-2 space-y-0.5 border-l border-[var(--color-border)] ml-4">
//                     {space.rooms.map((room) => {
//                       const Icon = roomTypeIcon(room.room_type);
//                       const active = currentRoom === room.id && !membersActive && !leaderboardActive;
//                       const canEnter = canAccessRoomNav(
//                         { is_locked: room.is_locked, access_type: room.access_type },
//                         space.access_type,
//                         membership,
//                         ownerId,
//                         userId,
//                         space.id
//                       );
//                       const ur = room.room_type === "chat" ? unreadForRoom(room.id) : 0;
//                       return (
//                         <li key={room.id}>
//                           <button
//                             type="button"
//                             onClick={() => handleRoomClick(space, room)}
//                             className={cn(
//                               "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left text-xs font-semibold",
//                               active
//                                 ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
//                                 : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]",
//                               !canEnter && "opacity-50"
//                             )}
//                           >
//                             <Icon className="h-3.5 w-3.5 shrink-0" />
//                             <span className="truncate flex-1">{room.name}</span>
//                             {!canEnter && <Lock className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />}
//                             {ur > 0 && (
//                               <span className="text-[10px] font-black px-1.5 py-0 rounded-sm bg-[var(--color-danger-light)] text-[var(--color-danger)]">
//                                 {ur > 9 ? "9+" : ur}
//                               </span>
//                             )}
//                           </button>
//                         </li>
//                       );
//                     })}
//                   </ul>
//                 )}
//               </div>
//             );
//           })}
//         </div>

//         <div className="border-t border-[var(--color-border)] p-2 space-y-1">
//           <Link
//             href={`${base}/chats`}
//             onClick={onNavigate}
//             className={cn(
//               "flex items-center gap-2 px-2 py-2 rounded-sm text-xs font-bold",
//               chatsActive ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
//             )}
//           >
//             <MessageSquare className="h-4 w-4" />
//             Chats
//           </Link>
//           <Link
//             href={`${base}/members`}
//             onClick={onNavigate}
//             className={cn(
//               "flex items-center gap-2 px-2 py-2 rounded-sm text-xs font-bold",
//               membersActive ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
//             )}
//           >
//             <Users className="h-4 w-4" />
//             Members
//           </Link>
//           <Link
//             href={`${base}/leaderboard`}
//             onClick={onNavigate}
//             className={cn(
//               "flex items-center gap-2 px-2 py-2 rounded-sm text-xs font-bold",
//               leaderboardActive ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
//             )}
//           >
//             <Trophy className="h-4 w-4" />
//             Leaderboard
//           </Link>
//         </div>

//         <div className="border-t border-[var(--color-border)] p-2 hidden lg:block">
//           <div className="flex items-center gap-2 px-2 py-2 rounded-sm bg-[var(--color-surface-secondary)]/80">
//             <div className="h-9 w-9 rounded-sm overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
//               {profile?.avatar_url ? (
//                 <Image src={profile.avatar_url} alt="" width={36} height={36} className="object-cover h-full w-full" unoptimized />
//               ) : (
//                 <div className="h-full w-full flex items-center justify-center text-sm font-black text-[var(--color-accent)]">
//                   {(profile?.full_name || profile?.username || "?")[0]}
//                 </div>
//               )}
//             </div>
//             <div className="min-w-0 flex-1">
//               <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
//                 {profile?.full_name || profile?.username || "Member"}
//               </p>
//               <p className="text-[10px] font-black text-[var(--color-accent)]">
//                 {(points?.total_points ?? 0).toLocaleString()} pts · Lvl {points?.level ?? 1}
//               </p>
//             </div>
//           </div>
//         </div>
//       </aside>

//       <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
//         <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] max-w-sm">
//           <DialogHeader>
//             <DialogTitle className="text-lg font-black !text-[var(--color-text-primary)]">Upgrade to access this space</DialogTitle>
//           </DialogHeader>
//           <p className="text-sm text-[var(--color-text-muted)]">
//             This room requires <span className="font-bold text-[var(--color-text-primary)]">{upgradePlan}</span> access.
//           </p>
//           <div className="flex flex-wrap gap-2 sm:gap-0 justify-end pt-2">
//             <Button variant="outline" className="rounded-sm border-[var(--color-border)]" onClick={() => setUpgradeOpen(false)}>
//               Close
//             </Button>
//             <Button asChild className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black">
//               <Link href={`/communities/${slug}/subscribe`}>Upgrade Plan</Link>
//             </Button>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }

// components/community/WorkspaceSidebar.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen, CheckSquare, ChevronDown, ChevronRight, FileText, Folder,
  LayoutList, Lock, MessageCircle, MessageSquare, Settings, Trophy,
  Users, Home, Briefcase, Radio, Flame, Sparkles, Search, Hash,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  canAccessRoomNav,
  requiredPlanLabel,
  type MembershipLite,
} from "@/lib/community-workspace-access";
import type {
  WorkspaceRoomRow,
  WorkspaceSpaceRow,
  LiveSessionLite,
  PointsSnapshot,
} from "@/components/community/workspace-context";

/* ─── Helpers ───────────────────────────────────────────────────── */

function roomTypeIcon(roomType: string): LucideIcon {
  switch (roomType) {
    case "chat": return MessageCircle;
    case "course": return BookOpen;
    case "posts": return FileText;
    case "resources": return Folder;
    case "tasks": return CheckSquare;
    default: return LayoutList;
  }
}

function spaceIconFromName(name: string | null): LucideIcon {
  if (!name) return Hash;
  const map: Record<string, LucideIcon> = {
    chat: MessageCircle, message: MessageCircle,
    book: BookOpen, course: BookOpen, learn: BookOpen,
    folder: Folder, resources: Folder,
    tasks: CheckSquare, todo: CheckSquare,
    sparkles: Sparkles, ai: Sparkles,
  };
  return map[name.toLowerCase()] ?? Hash;
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

/* ─── Component ─────────────────────────────────────────────────── */

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
  liveSessions,
  openMissionsCount,
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
  points: PointsSnapshot | null;
  spaces: WorkspaceSpaceRow[];
  liveSessions: LiveSessionLite[];
  openMissionsCount: number;
  mobileOpen: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    spaces.forEach((s) => { init[s.id] = true; });
    return init;
  });

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<"Paid" | "Premium">("Paid");

  const currentRoom = searchParams.get("room") || "";
  const isOwner = ownerId === userId;
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const showSettings = isOwner || isAdmin;

  const base = `/communities/${slug}/workspace`;

  function handleRoomClick(space: WorkspaceSpaceRow, room: WorkspaceRoomRow) {
    const ok = canAccessRoomNav(
      { is_locked: room.is_locked, access_type: room.access_type },
      space.access_type, membership, ownerId, userId, space.id
    );
    if (!ok) {
      setUpgradePlan(requiredPlanLabel(room, space.access_type));
      setUpgradeOpen(true);
      return;
    }
    router.push(`${base}?space=${space.id}&room=${room.id}`);
    onNavigate?.();
  }

  // Active state helpers
  const at = (suffix: string) => pathname === `${base}${suffix}` || pathname.startsWith(`${base}${suffix}/`);
  const homeActive = pathname === base && !currentRoom;
  const missionsActive = at("/missions");
  const liveActive = at("/live");
  const membersActive = at("/members");
  const leaderboardActive = at("/leaderboard");
  const chatsActive = at("/chats");

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          top: "var(--navbar-height)",
          height: "calc(100vh - var(--navbar-height))",
        }}
      >
        {/* ── Community header ───────────────────────────────────── */}
        <div className="flex items-start gap-2.5 border-b border-[var(--color-border)] p-3">
          <div
            className="h-9 w-9 shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={36} height={36} className="h-full w-full object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[var(--color-accent)]">
                {communityName[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-[var(--color-text-primary)]">
              {communityName}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {memberCount.toLocaleString()} members
            </p>
          </div>
          {showSettings && (
            <Link
              href={`/communities/${slug}/settings`}
              className="rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* ── Top-level nav ──────────────────────────────────────── */}
        <div className="border-b border-[var(--color-border)] p-2">
          <nav className="space-y-0.5">
            <NavItem href={base} icon={Home} label="Home" active={homeActive} onClick={onNavigate} />
            <NavItem
              href={`${base}/missions`}
              icon={Briefcase}
              label="Missions"
              badge={openMissionsCount > 0 ? openMissionsCount : undefined}
              badgeTone="accent"
              active={missionsActive}
              onClick={onNavigate}
            />
            <NavItem
              href={`${base}/live`}
              icon={Radio}
              label="Live"
              badge={liveSessions.length > 0 ? liveSessions.length : undefined}
              badgeTone="danger"
              pulse={liveSessions.length > 0}
              active={liveActive}
              onClick={onNavigate}
            />
          </nav>
        </div>

        {/* ── Live now section ───────────────────────────────────── */}
        {liveSessions.length > 0 && (
          <div className="border-b border-[var(--color-border)] p-2">
            <div className="mb-1.5 flex items-center justify-between px-2">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-danger)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-danger)] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
                </span>
                Live now
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {liveSessions.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {liveSessions.slice(0, 3).map((s) => (
                <LiveSessionItem key={s.id} session={s} base={base} onClick={onNavigate} />
              ))}
              {liveSessions.length > 3 && (
                <Link
                  href={`${base}/live`}
                  onClick={onNavigate}
                  className="block px-2 py-1 text-[11px] font-medium text-[var(--color-accent)] hover:underline"
                >
                  See {liveSessions.length - 3} more →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Spaces tree ────────────────────────────────────────── */}
        <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
          <div className="mb-1 flex items-center justify-between px-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Spaces
            </p>
            <Link
              href={`${base}/discover`}
              onClick={onNavigate}
              className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
              aria-label="Browse spaces"
            >
              <Search className="h-3 w-3" />
            </Link>
          </div>

          {spaces.length === 0 ? (
            <SpacesEmptyState />
          ) : (
            spaces.map((space) => {
              const isOpen = expanded[space.id] !== false;
              const SpaceIcon = spaceIconFromName(space.icon);
              return (
                <div key={space.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [space.id]: !isOpen }))}
                    className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-secondary)]"
                  >
                    {isOpen
                      ? <ChevronDown className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />
                      : <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />}
                    <SpaceIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]" />
                    <span className="flex-1 truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                      {space.name}
                    </span>
                    {space.access_type !== "free" && (
                      <Lock className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />
                    )}
                  </button>
                  {isOpen && space.rooms.length > 0 && (
                    <ul className="ml-3 mt-0.5 space-y-px border-l border-[var(--color-border)] pl-1.5">
                      {space.rooms.map((room) => {
                        const Icon = roomTypeIcon(room.room_type);
                        const active = currentRoom === room.id && !membersActive && !leaderboardActive;
                        const canEnter = canAccessRoomNav(
                          { is_locked: room.is_locked, access_type: room.access_type },
                          space.access_type, membership, ownerId, userId, space.id
                        );
                        const ur = room.room_type === "chat" ? unreadForRoom(room.id) : 0;

                        return (
                          <li key={room.id}>
                            <button
                              type="button"
                              onClick={() => handleRoomClick(space, room)}
                              className={cn(
                                "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] transition-colors",
                                active
                                  ? "bg-[var(--color-accent-light)] font-medium text-[var(--color-accent)]"
                                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                                !canEnter && "opacity-60"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 truncate">{room.name}</span>
                              {!canEnter && <Lock className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />}
                              {ur > 0 && (
                                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-semibold text-white">
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
            })
          )}
        </div>

        {/* ── Footer nav ─────────────────────────────────────────── */}
        <div className="space-y-0.5 border-t border-[var(--color-border)] p-2">
          <NavItem href={`${base}/chats`} icon={MessageSquare} label="Chats" active={chatsActive} onClick={onNavigate} />
          <NavItem href={`${base}/members`} icon={Users} label="Members" active={membersActive} onClick={onNavigate} />
          <NavItem href={`${base}/leaderboard`} icon={Trophy} label="Leaderboard" active={leaderboardActive} onClick={onNavigate} />
        </div>

        {/* ── User card with XP bar ──────────────────────────────── */}
        <div className="hidden border-t border-[var(--color-border)] p-2 lg:block">
          <UserPointsCard profile={profile} points={points} />
        </div>
      </aside>

      {/* ── Upgrade dialog ──────────────────────────────────────── */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent
          className="border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] sm:max-w-md"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          <DialogHeader>
            <div
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center bg-[var(--color-accent-light)] text-[var(--color-accent)]"
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <Lock className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-[16px] font-semibold !text-[var(--color-text-primary)]">
              Members-only space
            </DialogTitle>
          </DialogHeader>

          <p className="text-center text-[13px] text-[var(--color-text-secondary)]">
            This room is part of the{" "}
            <span className="font-medium text-[var(--color-text-primary)]">{upgradePlan}</span>{" "}
            tier. Upgrade to unlock access to this and other premium spaces.
          </p>

          <div className="my-2 space-y-2">
            {[
              "Full access to all premium rooms",
              "Direct messaging with the creator",
              "Priority support and early features",
              "Cancel anytime",
            ].map((perk) => (
              <div key={perk} className="flex items-start gap-2 text-[13px] text-[var(--color-text-secondary)]">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                <span>{perk}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setUpgradeOpen(false)}
              className="border-[var(--color-border)]"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              Maybe later
            </Button>
            <Button
              asChild
              className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              <Link href={`/communities/${slug}/subscribe`}>See plans</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Atoms ─────────────────────────────────────────────────────── */

function NavItem({
  href, icon: Icon, label, active, badge, badgeTone, pulse, onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  badgeTone?: "accent" | "danger";
  pulse?: boolean;
  onClick?: () => void;
}) {
  const badgeClass = badgeTone === "danger"
    ? "bg-[var(--color-danger)] text-white"
    : "bg-[var(--color-accent)] text-white";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
      )}
    >
      <span className="relative">
        <Icon className="h-4 w-4" />
        {pulse && (
          <span className="absolute -right-0.5 -top-0.5 flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-danger)] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
          </span>
        )}
      </span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold",
            badgeClass
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function LiveSessionItem({
  session, base, onClick,
}: {
  session: LiveSessionLite;
  base: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={`${base}/live/${session.id}`}
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-secondary)]"
    >
      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
        {session.host_avatar ? (
          <Image src={session.host_avatar} alt="" fill sizes="28px" className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-[var(--color-text-muted)]">
            {session.host_name?.[0] ?? "?"}
          </div>
        )}
        <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-danger)] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full border border-[var(--color-surface)] bg-[var(--color-danger)]" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
          {session.title}
        </p>
        <p className="truncate text-[10px] text-[var(--color-text-muted)]">
          {session.viewer_count.toLocaleString()} watching · {session.host_name}
        </p>
      </div>
    </Link>
  );
}

function UserPointsCard({
  profile, points,
}: {
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: PointsSnapshot | null;
}) {
  const pts = points?.total_points ?? 0;
  const lvl = points?.level ?? 1;
  const streak = points?.streak_days ?? 0;

  // XP progress within current level
  const span = (points?.next_level_xp ?? 100) - (points?.level_start_xp ?? 0);
  const earned = pts - (points?.level_start_xp ?? 0);
  const pct = span > 0 ? Math.min(100, Math.max(0, (earned / span) * 100)) : 0;
  const remaining = Math.max(0, (points?.next_level_xp ?? 100) - pts);
  const closeToLevelUp = pct >= 80;

  const displayName = profile?.full_name || profile?.username || "Member";

  return (
    <div
      className="space-y-2 p-2.5 transition-colors hover:bg-[var(--color-surface-secondary)]"
      style={{ borderRadius: "var(--radius-md)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]"
          style={{ borderRadius: "var(--radius-full)" }}
        >
          {profile?.avatar_url && profile?.avatar_url.trim() ? (
            <Image src={profile.avatar_url} alt="" width={32} height={32} className="h-full w-full object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-[var(--color-accent)]">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
            {displayName}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Level {lvl} · {pts.toLocaleString()} XP
          </p>
        </div>
        {streak > 0 && (
          <div
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-warning)]"
            style={{
              background: "var(--color-warning-light)",
              borderRadius: "var(--radius-sm)",
            }}
            title={`${streak} day streak`}
          >
            <Flame className="h-3 w-3" />
            {streak}
          </div>
        )}
      </div>

      {/* XP progress bar */}
      <div>
        <div
          className="relative h-1 w-full overflow-hidden bg-[var(--color-border)]"
          style={{ borderRadius: "var(--radius-full)" }}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 transition-all duration-500",
              closeToLevelUp ? "animate-pulse" : ""
            )}
            style={{
              width: `${pct}%`,
              background: closeToLevelUp
                ? "linear-gradient(90deg, var(--color-accent), var(--color-warning))"
                : "var(--color-accent)",
              borderRadius: "var(--radius-full)",
            }}
          />
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          {closeToLevelUp
            ? <span className="font-medium text-[var(--color-accent)]">{remaining.toLocaleString()} XP to level {lvl + 1}!</span>
            : <>{remaining.toLocaleString()} XP to level {lvl + 1}</>
          }
        </p>
      </div>
    </div>
  );
}

function SpacesEmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-2 px-3 py-6 text-center"
      style={{
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface-secondary)",
      }}
    >
      <svg width="48" height="36" viewBox="0 0 48 36" fill="none" aria-hidden>
        <rect x="3" y="6" width="14" height="18" rx="2" fill="var(--color-border)" />
        <rect x="20" y="3" width="14" height="24" rx="2" fill="var(--color-border-strong)" opacity="0.6" />
        <rect x="37" y="9" width="8" height="14" rx="2" fill="var(--color-border)" />
        <circle cx="10" cy="30" r="2" fill="var(--color-accent)" opacity="0.4" />
        <circle cx="27" cy="32" r="2" fill="var(--color-accent)" opacity="0.6" />
        <circle cx="41" cy="28" r="2" fill="var(--color-accent)" opacity="0.4" />
      </svg>
      <p className="text-[12px] font-medium text-[var(--color-text-secondary)]">
        No spaces yet
      </p>
      <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
        Spaces organize discussions, courses, and events.
      </p>
    </div>
  );
}
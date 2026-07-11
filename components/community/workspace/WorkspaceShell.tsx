// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import { useRouter, useSearchParams, usePathname } from "next/navigation";
// import Link from "next/link";
// import { createClient } from "@/lib/supabase/client";
// import {
//   Home, Layers, Radio, Target, GraduationCap, Calendar, Users, BookOpen,
//   Plus, ChevronDown, ChevronRight, Bell, Settings, Flame,
//   MessageCircle, FileText, Folder, CheckSquare, LayoutList, Hash,
//   MoreHorizontal, Bookmark, User,
//   Image, Video, BarChart2, Zap, Sparkles, TrendingUp,
//   Heart, MessageSquare, Share2, Play, ShoppingBag, Wallet,
//   BarChart, Grid, Star, ChevronRight as ChevRight, X,
//   type LucideIcon,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { FeedSection } from "./sections/FeedSection";
// import { MissionsSection } from "./sections/MissionsSection";
// import { MembersSection } from "./sections/MembersSection";
// import { SpacesSection } from "./sections/SpacesSection";
// import { LiveSection } from "./sections/LiveSection";
// import { EventsSection } from "./sections/EventsSection";
// import { ResourcesSection } from "./sections/ResourcesSection";
// import { CoursesSection } from "./sections/course-section";
// import { WorkspaceProvider } from "@/components/community/workspace-context";
// import { CallProvider } from "@/components/community/call-context";
// import type { WorkspaceCommunity, WorkspaceRole, WorkspaceSection, WorkspaceView } from "@/types/workspace";
// import type { WorkspaceSpaceRow, PointsSnapshot, LiveSessionLite } from "@/components/community/workspace-context";
// import type { MembershipLite } from "@/lib/community-workspace-access";
// import { WorkspaceRoomOverlay } from "../workspace-room-overlay";
// import { RoomContent } from "./room-content";
// import type { Tables } from "@/types/supabase";

// /* ─── Types ──────────────────────────────────────────────────────── */

// interface Props {
//   community: WorkspaceCommunity;
//   currentUserId: string;
//   role: WorkspaceRole;
//   isAdmin: boolean;
//   isOwner: boolean;
//   initialSection: string;
//   initialView: WorkspaceView;
//   profile?: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
//   points?: PointsSnapshot | null;
//   spacesWithRooms?: WorkspaceSpaceRow[];
//   unreadNotifications?: number;
//   openMissionsCount?: number;
//   membership?: MembershipLite | null;
//   liveSessions?: LiveSessionLite[];
//   children?: React.ReactNode;
// }

// const SECTION_LIST = [
//   "feed", "messages", "spaces", "live", "missions",
//   "courses", "events", "members", "leaderboard", "resources",
// ] as const;

// type SectionKey = typeof SECTION_LIST[number];

// const SECTION_LABELS: Record<string, string> = {
//   feed: "Feed", messages: "Messages", spaces: "Spaces", live: "Live",
//   missions: "Missions", courses: "Courses", events: "Events",
//   members: "Members", leaderboard: "Leaderboard", resources: "Resources",
// };

// const SECTION_ICONS: Record<string, LucideIcon> = {
//   feed: Home, messages: MessageCircle, spaces: Layers, live: Radio,
//   missions: Target, courses: GraduationCap, events: Calendar,
//   members: Users, leaderboard: Trophy, resources: BookOpen,
// };

// function roomTypeIcon(t: string): LucideIcon {
//   switch (t) {
//     case "chat": return MessageCircle;
//     case "course": return BookOpen;
//     case "posts": return FileText;
//     case "resources": return Folder;
//     case "tasks": return CheckSquare;
//     default: return LayoutList;
//   }
// }

// function timeAgo(d: string): string {
//   const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
//   if (m < 1) return "now";
//   if (m < 60) return `${m}m`;
//   const h = Math.floor(m / 60);
//   if (h < 24) return `${h}h`;
//   return `${Math.floor(h / 24)}d`;
// }

// /* ─── Shared Avatar ──────────────────────────────────────────────── */

// function Avatar({
//   name, avatar, size = "md", online,
// }: {
//   name: string; avatar?: string | null; size?: "xs" | "sm" | "md" | "lg"; online?: boolean;
// }) {
//   const dims = { xs: "w-7 h-7 text-[10px]", sm: "w-8 h-8 text-[11px]", md: "w-10 h-10 text-[13px]", lg: "w-14 h-14 text-[18px]" }[size];
//   const colors = ["bg-[#fd5000]/15 text-[#fd5000]", "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400", "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400", "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"];
//   const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
//   return (
//     <div className="relative flex-shrink-0">
//       {avatar ? (
//         <div className={cn(dims, "rounded-full overflow-hidden ring-1 ring-border")}>
//           <img src={avatar} alt={name} className="w-full h-full object-cover" />
//         </div>
//       ) : (
//         <div className={cn(dims, "rounded-full flex items-center justify-center font-bold ring-1 ring-border", color)}>
//           {(name?.[0] ?? "U").toUpperCase()}
//         </div>
//       )}
//       {online && (
//         <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-bg" />
//       )}
//     </div>
//   );
// }

/* ═══════════════════════════════════════════════════════════════════
   MAIN SHELL
   ═══════════════════════════════════════════════════════════════════ */

"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Home, Radio, GraduationCap, Users, Trophy, Layers,
  Plus, ChevronDown, ChevronRight, Flame,
  MessageCircle, FileText, Folder, CheckSquare, LayoutList, Hash,
  MoreHorizontal, Star, UserPlus, ShieldCheck, Calendar, Megaphone, Target,
  Megaphone as MegaphoneIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceProvider } from "@/components/community/workspace-context";
import { CallProvider } from "@/components/community/call-context";
import type { WorkspaceCommunity, WorkspaceRole, WorkspaceView } from "@/types/workspace";
import type { WorkspaceSpaceRow, PointsSnapshot } from "@/components/community/workspace-context";
import type { CommunityOverviewStats } from "@/services/community/hub-data";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { WorkspaceRoomOverlay } from "../workspace-room-overlay";
import { RoomContent } from "./room-content";
import { LiveIndicator, ConnectionQuality } from "../hub/hub-live-page";

/* ─── Types ──────────────────────────────────────────────────────── */

interface Props {
  community: WorkspaceCommunity;
  currentUserId: string;
  role: WorkspaceRole;
  isAdmin: boolean;
  isOwner: boolean;
  initialView: WorkspaceView;
  profile?: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points?: PointsSnapshot | null;
  spacesWithRooms?: WorkspaceSpaceRow[];
  membership?: MembershipLite | null;
  overview?: CommunityOverviewStats | null;
  basePath?: string;
  hideSidebar?: boolean;
  children: React.ReactNode;
}

/* ─── Nav config ──────────────────────────────────────────────────── */

interface NavItem {
  href: string;        // relative to /c/[slug], or absolute when external
  label: string;
  icon: LucideIcon;
  matchExact?: boolean;
  external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Feed", icon: Home, matchExact: true },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/live", label: "Live", icon: Radio },
];

const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "", label: "Feed", icon: Home, matchExact: true },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/courses", label: "Courses", icon: GraduationCap },
  { href: "/members", label: "Members", icon: Users },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
];

function roomTypeIcon(t: string): LucideIcon {
  switch (t) {
    case "chat": return MessageCircle;
    case "course": return GraduationCap;
    case "posts": return FileText;
    case "resources": return Folder;
    case "tasks": return CheckSquare;
    default: return LayoutList;
  }
}

const ALLOWED_ROOM_PARAMS = new Set(["view", "space", "room"]);

/* ─── Shared Avatar ──────────────────────────────────────────────── */

function Avatar({ name, avatar, size = "md" }: { name: string; avatar?: string | null; size?: "xs" | "sm" | "md" | "lg" }) {
  const dims = {
    xs: "w-7 h-7 text-[10px]",
    sm: "w-8 h-8 text-[11px]",
    md: "w-10 h-10 text-[13px]",
    lg: "w-14 h-14 text-[18px]",
  }[size];
  const colors = [
    "bg-[#fd5000]/15 text-[#fd5000]",
    "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];

  return avatar ? (
    <div className={cn(dims, "rounded-full overflow-hidden ring-1 ring-border flex-shrink-0")}>
      <img src={avatar} alt={name} className="w-full h-full object-cover" />
    </div>
  ) : (
    <div className={cn(dims, "rounded-full flex items-center justify-center font-bold ring-1 ring-border flex-shrink-0", color)}>
      {(name?.[0] ?? "U").toUpperCase()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN LAYOUT
   ═══════════════════════════════════════════════════════════════════ */

export function WorkspaceLayout({
  community, currentUserId, role, isAdmin, isOwner,
  initialView,
  profile = null, points = null, spacesWithRooms = [],
  membership = null, overview = null, basePath: basePathProp,
  hideSidebar = false,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = basePathProp ?? `/c/${community.slug}`;

  const urlView = searchParams.get("view");
  const [view, setView] = useState<WorkspaceView>(
    urlView === "admin" ? "admin" : initialView
  );
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(spacesWithRooms.map((s) => [s.id, true]))
  );

  const ctx = {
    slug: community.slug,
    communityId: community.id,
    communityName: community.name,
    ownerId: community.owner_id,
    memberCount: community.member_count,
    avatarUrl: community.avatar_url,
    coverImage: community.cover_image,
    userId: currentUserId,
    currentUserId,
    view,
    isAdmin,
    isOwner,
    profile,
    membership,
    spacesWithRooms,
    points,
    overview,
  };

  // URL helper — only allow whitelisted query params
  const buildParams = (next: { view?: WorkspaceView; space?: string | null; room?: string | null }) => {
    const p = new URLSearchParams();
    for (const [k, v] of searchParams) {
      if (ALLOWED_ROOM_PARAMS.has(k)) p.set(k, v);
    }
    if (next.view !== undefined) {
      if (next.view === "admin") p.set("view", "admin");
      else p.delete("view");
    }
    if (next.space !== undefined) {
      if (next.space === null) p.delete("space");
      else p.set("space", next.space);
    }
    if (next.room !== undefined) {
      if (next.room === null) p.delete("room");
      else p.set("room", next.room);
    }
    return p;
  };

  const navigateWithParams = (params: URLSearchParams) => {
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const toggleView = () => {
    if (!isAdmin) return;
    const next: WorkspaceView = view === "admin" ? "member" : "admin";
    setView(next);
    navigateWithParams(buildParams({ view: next }));
  };

  const openRoom = (spaceId: string, roomId: string) => {
    navigateWithParams(buildParams({ space: spaceId, room: roomId }));
  };

  const closeRoom = () => {
    navigateWithParams(buildParams({ space: null, room: null }));
  };

  const activeSpaceId = searchParams.get("space");
  const activeRoomId = searchParams.get("room");
  const activeSpace = activeSpaceId ? spacesWithRooms.find((s) => s.id === activeSpaceId) : null;
  const activeRoom = activeSpace && activeRoomId ? activeSpace.rooms.find((r) => r.id === activeRoomId) : null;
  const roomOverlayOpen = !!(activeSpace && activeRoom);

  return (
    <WorkspaceProvider value={ctx}>
      <CallProvider>
        <div className="flex flex-col bg-[var(--color-bg)] font-[family-name:var(--font-dm-sans)] h-full min-h-0">
          <div
            className={cn(
              "flex flex-1 min-h-0",
              hideSidebar ? "p-0 pb-14 lg:pb-0" : "px-4 lg:px-6 py-4 lg:py-6 pb-24 lg:pb-6",
              roomOverlayOpen
                ? "flex flex-col"
                : hideSidebar
                  ? "flex flex-col"
                  : "lg:grid lg:grid-cols-[260px_1fr] lg:gap-6",
            )}
          >
            {!roomOverlayOpen && !hideSidebar && (
              <aside className="hidden lg:flex flex-col flex-shrink-0">
                <Sidebar
                  community={community}
                  basePath={basePath}
                  pathname={pathname}
                  view={view}
                  isAdmin={isAdmin}
                  onViewToggle={toggleView}
                  profile={profile}
                  points={points}
                  overview={overview}
                  spacesWithRooms={spacesWithRooms}
                  expandedSpaces={expandedSpaces}
                  onToggleSpace={(id) =>
                    setExpandedSpaces((p) => ({ ...p, [id]: !p[id] }))
                  }
                  onNavigateRoom={openRoom}
                />
              </aside>
            )}

            {/* ── Main content slot ── */}
            <main className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", roomOverlayOpen && "overflow-hidden")}>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>

              {roomOverlayOpen && (
                <WorkspaceRoomOverlay
                  communityName={community.name}
                  spaceName={activeSpace!.name}
                  spaceIconName={activeSpace!.icon ?? null}
                  roomName={activeRoom!.name}
                  roomType={activeRoom!.room_type}
                  onClose={closeRoom}
                >
                  <RoomContent
                    community={community}
                    space={activeSpace!}
                    room={activeRoom!}
                    currentUserId={currentUserId}
                  />
                </WorkspaceRoomOverlay>
              )}
            </main>
          </div>

          <MobileBottomNav basePath={basePath} pathname={pathname} />
        </div>
      </CallProvider>
    </WorkspaceProvider>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LEFT SIDEBAR
   ═══════════════════════════════════════════════════════════════════ */

function Sidebar({
  community, basePath, pathname, view, isAdmin, onViewToggle,
  profile, points, overview, spacesWithRooms, expandedSpaces, onToggleSpace, onNavigateRoom,
}: {
  community: WorkspaceCommunity;
  basePath: string;
  pathname: string;
  view: WorkspaceView;
  isAdmin: boolean;
  onViewToggle: () => void;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: PointsSnapshot | null;
  overview: CommunityOverviewStats | null;
  spacesWithRooms: WorkspaceSpaceRow[];
  expandedSpaces: Record<string, boolean>;
  onToggleSpace: (id: string) => void;
  onNavigateRoom: (spaceId: string, roomId: string) => void;
}) {
  const isPremium = false; // TODO: wire to community_memberships.plan_type !== 'free'

  const isActive = (item: NavItem) => {
    const fullPath = item.external ? item.href : `${basePath}${item.href}`;
    if (item.matchExact) return pathname === fullPath;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  return (
    <div className="sticky top-0 flex flex-col h-[calc(100vh-var(--hub-topbar-h,56px))] overflow-y-auto pb-4 bg-[var(--color-bg-elevated)] border-r border-[var(--color-border)]/50">

      {/* Community header */}
      <div className="px-4 py-4 flex-shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            {community.avatar_url ? (
              <img
                src={community.avatar_url}
                alt={community.name}
                className="w-11 h-11 rounded-xl object-cover ring-2 ring-[var(--color-accent)]/30 flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#fd5000] to-[#ff7a30] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0">
                {community.name[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[14px] font-black text-[var(--color-text-primary)] truncate">{community.name}</h3>
              <ShieldCheck className="w-4 h-4 text-[#fd5000] flex-shrink-0" />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {(community as { is_private?: boolean }).is_private ? "Private Community" : "Public Community"}
            </p>
            <p className="text-[10px] text-emerald-500 font-medium">
              {(overview?.membersOnline ?? community.member_count ?? 0).toLocaleString()} members online
            </p>
          </div>
        </div>

        <Link
          href={`${basePath}/members`}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#fd5000] px-3 py-2 text-[12px] font-semibold text-white shadow-sm shadow-[#fd5000]/25 transition-opacity hover:opacity-90"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite People
        </Link>
      </div>

      {/* Admin/Member toggle */}
      {isAdmin && (
        <div className="px-4 pb-2 flex-shrink-0">
          <button
            type="button"
            onClick={onViewToggle}
            className={cn(
              "w-full px-3 py-2 text-[11px] font-semibold rounded-lg transition-all",
              view === "admin"
                ? "bg-[#fd5000]/10 text-[#fd5000]"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            )}
          >
            Viewing as: {view === "admin" ? "Admin" : "Member"}
          </button>
        </div>
      )}

      <div className="h-px bg-[var(--color-border)] mx-3 flex-shrink-0" />

      {/* Overview links */}
      <div className="flex-shrink-0 py-2 px-3">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Overview</p>
        <nav className="space-y-0.5">
          {[
            { href: "", label: "Announcements", icon: MegaphoneIcon, badge: overview?.messagesThisWeek ? String(Math.min(overview.messagesThisWeek, 99)) : null, matchExact: true },
            { href: "/live", label: "Events", icon: Calendar, badge: overview?.upcomingEvents?.length ? String(overview.upcomingEvents.length) : null },
            { href: "/courses", label: "Courses", icon: GraduationCap, badge: overview?.courseCount ? String(overview.courseCount) : null },
            { href: "/members", label: "Members", icon: Users },
            { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
            { href: "/c/missions", label: "Challenges", icon: Target, external: true },
          ].map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const linkHref = item.external ? item.href : `${basePath}${item.href}`;
            return (
              <Link
                key={item.label}
                href={linkHref}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all",
                  active
                    ? "bg-[#fd5000] text-white shadow-sm shadow-[#fd5000]/25"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                )}
              >
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg shrink-0", active ? "bg-white/15" : "bg-[var(--color-surface-secondary)]")}>
                  <Icon className="w-4 h-4" style={{ color: active ? "white" : "var(--color-text-muted)" }} />
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="h-px bg-[var(--color-border)] mx-3 flex-shrink-0" />

      {/* Quick access */}
      <nav className="flex-shrink-0 space-y-0.5 py-2 px-3">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Quick access</p>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href || "feed"}
              href={`${basePath}${item.href}`}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
                active
                  ? "bg-[#fd5000] text-white shadow-sm shadow-[#fd5000]/25"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
              )}
            >
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg shrink-0", active ? "bg-white/15" : "bg-[var(--color-surface-secondary)]")}>
                <Icon className="w-4 h-4" style={{ color: active ? "white" : "var(--color-text-muted)" }} />
              </div>
              <span className="flex-1 text-left">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="h-px bg-[var(--color-border)] mx-3 flex-shrink-0" />

      {/* Spaces tree */}
      <div className="flex-shrink-0 py-3">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Spaces</p>
          {isAdmin && view === "admin" && (
            <button
              type="button"
              aria-label="Create space"
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[#fd5000] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        {spacesWithRooms.length === 0 ? (
          <p className="px-3 text-[11px] text-[var(--color-text-muted)]">No spaces yet</p>
        ) : (
          <div className="space-y-0.5 px-2">
            {spacesWithRooms.map((space) => {
              const isOpen = expandedSpaces[space.id] !== false;
              return (
                <div key={space.id}>
                  <button
                    type="button"
                    onClick={() => onToggleSpace(space.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left hover:bg-[var(--color-surface-secondary)] transition-colors group"
                  >
                    <div className="w-6 h-6 rounded-md bg-[#fd5000]/10 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-3 h-3 text-[#fd5000]" />
                    </div>
                    <span className="flex-1 truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                      {space.name}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)]" />
                    )}
                  </button>

                  {isOpen && space.rooms.length > 0 && (
                    <ul className="ml-4 mt-0.5 space-y-px border-l border-[var(--color-border)]/40 pl-2.5">
                      {space.rooms.map((room) => {
                        const RoomIcon = roomTypeIcon(room.room_type);
                        return (
                          <li key={room.id}>
                            <button
                              type="button"
                              onClick={() => onNavigateRoom(space.id, room.id)}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                              <RoomIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                              <span className="truncate">{room.name}</span>
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
        )}

        {isAdmin && view === "admin" && (
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-4 py-1.5 mt-1 rounded-lg text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[#fd5000] hover:bg-[#fd5000]/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Space
          </button>
        )}
      </div>

      <div className="h-px bg-[var(--color-border)] mx-3 flex-shrink-0" />

      {/* Premium upsell */}
      {!isPremium && (
        <div className="flex-shrink-0 mx-3 mt-3 p-3 rounded-xl p-4 text-white hover-lift"
          style={{
            background: "linear-gradient(135deg, var(--color-berry) 0%, var(--color-berry) 50%, var(--color-amber) 100%)",
            backgroundSize: "200% 200%",
            animation: "gradient-shift 4s ease infinite",
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Star className="w-4 h-4 fill-white" />
            <span className="text-[13px] font-bold">Go Premium</span>
          </div>
          <p className="text-[11px] text-white/80 mb-2.5 leading-snug">
            Unlock unlimited live sessions, advanced analytics & priority support.
          </p>
          <button
            type="button"
            className="w-full py-1.5 rounded-lg bg-white py-2 text-[12px] font-bold transition-colors hover:opacity-90"
            style={{ color: "var(--color-berry)" }}
          >
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   USER PROFILE CARD
   ═══════════════════════════════════════════════════════════════════ */

function UserProfileCard({
  profile, points,
}: {
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: PointsSnapshot | null;
}) {
  const pts = points?.total_points ?? 0;
  const lvl = points?.level ?? 1;
  const streak = points?.streak_days ?? 0;
  const span = (points?.next_level_xp ?? 100) - (points?.level_start_xp ?? 0);
  const earned = pts - (points?.level_start_xp ?? 0);
  const pct = span > 0 ? Math.min(100, Math.max(0, (earned / span) * 100)) : 0;
  const remaining = Math.max(0, (points?.next_level_xp ?? 100) - pts);
  const close = pct >= 80;
  const name = profile?.full_name || profile?.username || "Member";

  return (
    <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors hover-lift">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar name={name} avatar={profile?.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate">{name}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">Level {lvl} · {pts.toLocaleString()} XP</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 dark:bg-amber-900/30 rounded-full">
            <Flame className="w-3 h-3" />
            {streak}
          </div>
        )}
        <button
          type="button"
          aria-label="More"
          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] transition-colors ml-auto"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
      <div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
              close && "animate-pulse",
            )}
            style={{
              width: `${pct}%`,
              background: close ? "linear-gradient(90deg,var(--color-accent),var(--color-amber))" : "var(--color-accent)",
            }}
          />
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          {close ? (
            <span className="font-semibold text-[var(--color-accent)]">
              {remaining.toLocaleString()} XP to level {lvl + 1}!
            </span>
          ) : (
            <>{remaining.toLocaleString()} XP to level {lvl + 1}</>
          )}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV
   ══════════════════════════════════════════════════════════════════ */

function MobileBottomNav({ basePath, pathname }: { basePath: string; pathname: string }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--color-bg)]/95 backdrop-blur-md border-t border-[var(--color-border)] safe-area-pb">
      <div className="grid grid-cols-5 h-14">
        {MOBILE_NAV_ITEMS.map((item) => {
          const fullPath = `${basePath}${item.href}`;
          const active = item.matchExact
            ? pathname === fullPath
            : pathname === fullPath || pathname.startsWith(`${fullPath}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href || "feed"}
              href={fullPath}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-[var(--color-accent)] animate-in animate-scale-in" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
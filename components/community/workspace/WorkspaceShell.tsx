"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Home, GraduationCap, Layers,
  Plus, ChevronDown, ChevronRight, Flame,
  Hash,
  MoreHorizontal, Star, UserPlus, ShieldCheck, Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceProvider } from "@/components/community/workspace-context";
import { CallProvider } from "@/components/community/call-context";
import { WorkspaceUnreadSync } from "@/components/community/workspace/WorkspaceUnreadSync";
import type { WorkspaceCommunity, WorkspaceRole, WorkspaceView } from "@/types/workspace";
import type { WorkspaceSpaceRow, PointsSnapshot } from "@/components/community/workspace-context";
import type { CommunityOverviewStats } from "@/services/community/hub-data";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { CreateSpaceDialog } from "@/components/community/CreateSpaceDialog";
import {
  communityChannelHref,
  communityGroupHref,
  roomTypeIcon as sharedRoomTypeIcon,
} from "@/lib/community/workspace";

/* ─── Types ──────────────────────────────────────────────────────── */

interface Props {
  community: WorkspaceCommunity & {
    is_private?: boolean | null;
    tagline?: string | null;
  };
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
  ownerName?: string | null;
  joinedAt?: string | null;
  basePath?: string;
  hideSidebar?: boolean;
  children: React.ReactNode;
}

/* ─── Nav config ──────────────────────────────────────────────────── */

interface NavItem {
  href: string;        // relative to /communities/[slug], or absolute when external
  label: string;
  icon: LucideIcon;
  matchExact?: boolean;
  external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Overview", icon: Home, matchExact: true },
  { href: "/courses", label: "Courses", icon: GraduationCap },
  { href: "/missions", label: "Challenges", icon: Target },
  { href: "/about", label: "About", icon: ShieldCheck },
];

const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "", label: "Overview", icon: Home, matchExact: true },
  { href: "/courses", label: "Courses", icon: GraduationCap },
  { href: "/missions", label: "Challenges", icon: Target },
  { href: "/about", label: "About", icon: ShieldCheck },
];

function roomTypeIcon(t: string): LucideIcon {
  return sharedRoomTypeIcon(t);
}

const ALLOWED_VIEW_PARAMS = new Set(["view"]);

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
   ══════════════════════════════════════════════════════════════════ */

export function WorkspaceLayout({
  community, currentUserId, role, isAdmin, isOwner,
  initialView,
  profile = null, points = null, spacesWithRooms = [],
  membership = null, overview = null, ownerName = null, joinedAt = null,
  basePath: basePathProp,
  hideSidebar = false,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = basePathProp ?? `/communities/${community.slug}`;

  const urlView = searchParams.get("view");
  const [view, setView] = useState<WorkspaceView>(
    urlView === "admin" ? "admin" : initialView
  );
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(spacesWithRooms.map((s) => [s.id, true]))
  );

  const ctx = useMemo(
    () => ({
      slug: community.slug,
      communityId: community.id,
      communityName: community.name,
      ownerId: community.owner_id,
      ownerName,
      memberCount: community.member_count,
      avatarUrl: community.avatar_url,
      coverUrl: community.cover_image ?? null,
      tagline: community.tagline ?? null,
      isPrivate: !!community.is_private,
      joinedAt,
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
    }),
    [
      community.slug,
      community.id,
      community.name,
      community.owner_id,
      community.member_count,
      community.avatar_url,
      community.cover_image,
      community.tagline,
      community.is_private,
      ownerName,
      joinedAt,
      currentUserId,
      view,
      isAdmin,
      isOwner,
      profile,
      membership,
      spacesWithRooms,
      points,
      overview,
    ]
  );

  // URL helper — only allow whitelisted query params (view toggle)
  const buildParams = (next: { view?: WorkspaceView }) => {
    const p = new URLSearchParams();
    for (const [k, v] of searchParams) {
      if (ALLOWED_VIEW_PARAMS.has(k)) p.set(k, v);
    }
    if (next.view !== undefined) {
      if (next.view === "admin") p.set("view", "admin");
      else p.delete("view");
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

  const openRoom = (space: WorkspaceSpaceRow, roomSlug: string) => {
    router.push(communityChannelHref(community.slug, roomSlug));
  };

  const openGroup = (space: WorkspaceSpaceRow) => {
    router.push(communityGroupHref(community.slug, space.slug));
  };

  return (
    <WorkspaceProvider value={ctx}>
      <CallProvider>
        <WorkspaceUnreadSync
          communityId={community.id}
          userId={currentUserId}
        />
        <div className="flex flex-col bg-bg font-[family-name:var(--font-dm-sans)] h-full min-h-0">
          <div
            className={cn(
              "flex flex-1 min-h-0",
              hideSidebar ? "p-0 pb-14 lg:pb-0" : "px-4 lg:px-6 py-4 lg:py-6 pb-24 lg:pb-6",
              hideSidebar
                ? "flex flex-col"
                : "lg:grid lg:grid-cols-[240px_1fr] lg:gap-5",
            )}
          >
            {!hideSidebar && (
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
                  membership={membership}
                  spacesWithRooms={spacesWithRooms}
                  expandedSpaces={expandedSpaces}
                  onToggleSpace={(id) =>
                    setExpandedSpaces((p) => ({ ...p, [id]: !p[id] }))
                  }
                  onNavigateRoom={openRoom}
                  onOpenGroup={openGroup}
                />
              </aside>
            )}

            {/* ── Main content slot ── */}
            <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {children}
              </div>
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
   ══════════════════════════════════════════════════════════════════ */

function Sidebar({
  community, basePath, pathname, view, isAdmin, onViewToggle,
  profile, points, overview, membership, spacesWithRooms, expandedSpaces, onToggleSpace, onNavigateRoom,
  onOpenGroup,
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
  membership?: MembershipLite | null;
  spacesWithRooms: WorkspaceSpaceRow[];
  expandedSpaces: Record<string, boolean>;
  onToggleSpace: (id: string) => void;
  onNavigateRoom: (space: WorkspaceSpaceRow, roomSlug: string) => void;
  onOpenGroup?: (space: WorkspaceSpaceRow) => void;
}) {
  const router = useRouter();
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const isPremium =
    membership?.plan_type === "monthly" ||
    membership?.plan_type === "yearly" ||
    membership?.plan_type === "lifetime" ||
    (membership?.plan_type != null && membership.plan_type !== "free");

  const isActive = (item: NavItem) => {
    const fullPath = item.external ? item.href : `${basePath}${item.href}`;
    if (item.matchExact) return pathname === fullPath;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  return (
    <div className="sticky top-0 flex flex-col h-[calc(100vh-var(--hub-topbar-h,56px))] overflow-y-auto pb-4">
      <CreateSpaceDialog
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
        communityId={community.id}
        onCreated={() => router.refresh()}
      />
      {/* Community header */}
      <div className="px-3 py-3 flex-shrink-0 space-y-2.5">
        <div className="flex items-center gap-2.5">
          {community.avatar_url ? (
            <img
              src={community.avatar_url}
              alt={community.name}
              className="w-9 h-9 rounded-md object-cover ring-1 ring-border flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-md bg-[#fd5000] text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
              {community.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-[13px] font-bold text-text-primary truncate">{community.name}</p>
              <ShieldCheck className="w-3.5 h-3.5 text-[#fd5000] flex-shrink-0" />
            </div>
            <p className="text-[10px] text-text-muted">
              {(community as { is_private?: boolean }).is_private ? "Private Community" : "Public Community"}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium">
              {new Intl.NumberFormat("en-US").format(
                overview?.membersOnline ?? community.member_count ?? 0
              )}{" "}
              members online
            </p>
          </div>
        </div>

        <Link
          href={`${basePath}/members`}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[#fd5000] px-3 py-2 text-[12px] font-semibold text-white shadow-sm shadow-[#fd5000]/25 transition-opacity hover:opacity-90"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite People
        </Link>
      </div>

      {/* Admin/Member toggle */}
      {isAdmin && (
        <div className="px-3 pb-2 flex-shrink-0">
          <button
            type="button"
            onClick={onViewToggle}
            className={cn(
              "w-full px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all",
              view === "admin"
                ? "bg-[#fd5000]/10 text-[#fd5000]"
                : "bg-surface-secondary text-text-muted hover:text-text-primary",
            )}
          >
            Viewing as: {view === "admin" ? "Admin" : "Member"}
          </button>
        </div>
      )}

      <div className="h-px bg-border mx-2 flex-shrink-0" />

      {/* Overview links */}
      <div className="flex-shrink-0 py-2 px-2">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Overview</p>
        <nav className="space-y-0.5">
          {[
            { href: "", label: "Overview", icon: Home, badge: null as string | null, matchExact: true },
            { href: "/courses", label: "Courses", icon: GraduationCap, badge: overview?.courseCount ? String(overview.courseCount) : null },
            { href: "/missions", label: "Challenges", icon: Target, badge: null as string | null },
            { href: "/about", label: "About", icon: ShieldCheck, badge: null as string | null },
          ].map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const linkHref = `${basePath}${item.href}`;
            return (
              <Link
                key={item.label}
                href={linkHref}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all",
                  active
                    ? "bg-[#fd5000]/10 text-[#fd5000]"
                    : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="rounded-md bg-surface-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="h-px bg-border mx-2 flex-shrink-0" />

      {/* Quick links */}
      <nav className="flex-shrink-0 space-y-0.5 py-2 px-2">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Quick access</p>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href || "overview"}
              href={`${basePath}${item.href}`}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all",
                active
                  ? "bg-[#fd5000] text-white shadow-sm shadow-[#fd5000]/25"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="h-px bg-border mx-2 flex-shrink-0" />

      {/* Spaces tree */}
      <div className="flex-shrink-0 py-3">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Spaces</p>
          {isAdmin && view === "admin" && (
            <button
              type="button"
              aria-label="Create space"
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-surface-secondary text-text-muted hover:text-[#fd5000] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        {spacesWithRooms.length === 0 ? (
          <p className="px-3 text-[11px] text-text-muted">No spaces yet</p>
        ) : (
          <div className="space-y-0.5 px-2">
            {spacesWithRooms.map((space) => {
              const isOpen = expandedSpaces[space.id] !== false;
              return (
                <div key={space.id}>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onOpenGroup?.(space)}
                      className="min-w-0 flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-left hover:bg-surface-secondary transition-colors group"
                    >
                      <div className="w-6 h-6 rounded-md bg-[#fd5000]/10 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-3 h-3 text-[#fd5000]" />
                      </div>
                      <span className="flex-1 truncate text-[12px] font-medium text-text-primary">
                        {space.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={isOpen ? "Collapse rooms" : "Expand rooms"}
                      onClick={() => onToggleSpace(space.id)}
                      className="rounded-md p-1.5 text-text-muted hover:bg-surface-secondary"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {isOpen && space.rooms.length > 0 && (
                    <ul className="ml-4 mt-0.5 space-y-px border-l border-border/60 pl-2.5">
                      {space.rooms.map((room) => {
                        const RoomIcon = roomTypeIcon(room.room_type);
                        return (
                          <li key={room.id}>
                            <button
                              type="button"
                              onClick={() => onNavigateRoom(space, room.slug)}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
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
            onClick={() => setCreateSpaceOpen(true)}
            className="w-full flex items-center gap-2.5 px-5 py-1.5 mt-1 rounded-md text-[12px] font-medium text-text-muted hover:text-[#fd5000] hover:bg-[#fd5000]/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Space
          </button>
        )}
      </div>

      <div className="h-px bg-border mx-2 flex-shrink-0" />

      {/* Premium upsell */}
      {!isPremium && (
        <div className="flex-shrink-0 mx-2 mt-3 p-3 rounded-lg bg-gradient-to-br from-[#fd5000] to-[#ff8c42] text-white">
          <div className="flex items-center gap-2 mb-1.5">
            <Star className="w-4 h-4 fill-white" />
            <span className="text-[13px] font-bold">Go Premium</span>
          </div>
          <p className="text-[11px] text-white/80 mb-2.5 leading-snug">
            Unlock exclusive tools, higher earnings and more.
          </p>
          <button
            type="button"
            className="w-full py-1.5 rounded-md bg-white text-[#fd5000] text-[12px] font-bold hover:bg-white/90 transition-colors"
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
   ══════════════════════════════════════════════════════════════════ */

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
    <div className="p-3 rounded-md bg-surface border border-border hover:border-border-hover transition-colors">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar name={name} avatar={profile?.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-text-primary truncate">{name}</p>
          <p className="text-[10px] text-text-muted">
            Level {lvl} · {new Intl.NumberFormat("en-US").format(pts)} XP
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-[#f0b429] bg-[#fffbea] dark:bg-[#2a1f00] rounded-full">
            <Flame className="w-3 h-3" />
            {streak}
          </div>
        )}
        <button
          type="button"
          aria-label="More"
          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-surface-secondary text-text-muted transition-colors ml-auto"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
      <div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
              close && "animate-pulse",
            )}
            style={{
              width: `${pct}%`,
              background: close ? "linear-gradient(90deg,#fd5000,#f0b429)" : "#fd5000",
            }}
          />
        </div>
        <p className="mt-1 text-[10px] text-text-muted">
          {close ? (
            <span className="font-semibold text-[#fd5000]">
              {new Intl.NumberFormat("en-US").format(remaining)} XP to level {lvl + 1}!
            </span>
          ) : (
            <>{new Intl.NumberFormat("en-US").format(remaining)} XP to level {lvl + 1}</>
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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur-md border-t border-border safe-area-pb">
      <div className="grid grid-cols-5 h-14">
        {MOBILE_NAV_ITEMS.map((item) => {
          const fullPath = `${basePath}${item.href}`;
          const active = item.matchExact
            ? pathname === fullPath
            : pathname === fullPath || pathname.startsWith(`${fullPath}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href || "overview"}
              href={fullPath}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-[#fd5000]" : "text-text-muted hover:text-text-primary",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
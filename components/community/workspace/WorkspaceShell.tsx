"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Layers, Radio, Target, GraduationCap, Calendar, Users, BookOpen,
  Plus, ChevronDown, ChevronRight, Bell, Settings, Flame,
  MessageCircle, FileText, Folder, CheckSquare, LayoutList, Hash, Trophy,
  Send, ArrowLeft, Search, MoreHorizontal, Bookmark, User,
  Image, Video, BarChart2, Zap, Sparkles, TrendingUp,
  Heart, MessageSquare, Share2, Play, ShoppingBag, Wallet,
  BarChart, Grid, Star, ChevronRight as ChevRight, X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedSection } from "./sections/FeedSection";
import { MissionsSection } from "./sections/MissionsSection";
import { MembersSection } from "./sections/MembersSection";
import { SpacesSection } from "./sections/SpacesSection";
import { LiveSection } from "./sections/LiveSection";
import { EventsSection } from "./sections/EventsSection";
import { ResourcesSection } from "./sections/ResourcesSection";
import { CoursesSection } from "./sections/course-section";
import { WorkspaceProvider } from "@/components/community/workspace-context";
import { CallProvider } from "@/components/community/call-context";
import type { WorkspaceCommunity, WorkspaceRole, WorkspaceSection, WorkspaceView } from "@/types/workspace";
import type { WorkspaceSpaceRow, PointsSnapshot, LiveSessionLite } from "@/components/community/workspace-context";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { WorkspaceRoomOverlay } from "../workspace-room-overlay";
import { RoomContent } from "./room-content";
import type { Tables } from "@/types/supabase";

/* ─── Types ──────────────────────────────────────────────────────── */

interface Props {
  community: WorkspaceCommunity;
  currentUserId: string;
  role: WorkspaceRole;
  isAdmin: boolean;
  isOwner: boolean;
  initialSection: string;
  initialView: WorkspaceView;
  profile?: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points?: PointsSnapshot | null;
  spacesWithRooms?: WorkspaceSpaceRow[];
  unreadNotifications?: number;
  openMissionsCount?: number;
  membership?: MembershipLite | null;
  liveSessions?: LiveSessionLite[];
  children?: React.ReactNode;
}

const SECTION_LIST = [
  "feed", "messages", "spaces", "live", "missions",
  "courses", "events", "members", "leaderboard", "resources",
] as const;

type SectionKey = typeof SECTION_LIST[number];

const SECTION_LABELS: Record<string, string> = {
  feed: "Feed", messages: "Messages", spaces: "Spaces", live: "Live",
  missions: "Missions", courses: "Courses", events: "Events",
  members: "Members", leaderboard: "Leaderboard", resources: "Resources",
};

const SECTION_ICONS: Record<string, LucideIcon> = {
  feed: Home, messages: MessageCircle, spaces: Layers, live: Radio,
  missions: Target, courses: GraduationCap, events: Calendar,
  members: Users, leaderboard: Trophy, resources: BookOpen,
};

function roomTypeIcon(t: string): LucideIcon {
  switch (t) {
    case "chat": return MessageCircle;
    case "course": return BookOpen;
    case "posts": return FileText;
    case "resources": return Folder;
    case "tasks": return CheckSquare;
    default: return LayoutList;
  }
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* ─── Shared Avatar ──────────────────────────────────────────────── */

function Avatar({
  name, avatar, size = "md", online,
}: {
  name: string; avatar?: string | null; size?: "xs" | "sm" | "md" | "lg"; online?: boolean;
}) {
  const dims = { xs: "w-7 h-7 text-[10px]", sm: "w-8 h-8 text-[11px]", md: "w-10 h-10 text-[13px]", lg: "w-14 h-14 text-[18px]" }[size];
  const colors = ["bg-[#fd5000]/15 text-[#fd5000]", "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400", "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400", "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="relative flex-shrink-0">
      {avatar ? (
        <div className={cn(dims, "rounded-full overflow-hidden ring-1 ring-border")}>
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={cn(dims, "rounded-full flex items-center justify-center font-bold ring-1 ring-border", color)}>
          {(name?.[0] ?? "U").toUpperCase()}
        </div>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-bg" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN SHELL
   ══════════════════════════════════════════════════════════════════ */

export function WorkspaceShell({
  community, currentUserId, role, isAdmin, isOwner,
  initialSection, initialView,
  profile = null, points = null, spacesWithRooms = [],
  unreadNotifications = 0, openMissionsCount = 0,
  membership = null, liveSessions = [],
  children,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isRoot = pathname === `/c/${community.slug}/workspace`;

  const resolve = (s: string): SectionKey =>
    s === "chats" ? "messages" : (SECTION_LIST as readonly string[]).includes(s) ? s as SectionKey : "feed";

  const [section, setSection] = useState<SectionKey>(resolve(initialSection));
  const [view, setView] = useState<WorkspaceView>(initialView);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(spacesWithRooms.map((s) => [s.id, true]))
  );

  const isMessages = section === "messages";

  const ctx = {
    slug: community.slug, communityId: community.id, communityName: community.name,
    ownerId: community.owner_id, memberCount: community.member_count, avatarUrl: community.avatar_url,
    userId: currentUserId, currentUserId, view, isAdmin, profile, membership,
    spacesWithRooms, points, liveSessions, unreadNotifications, openMissionsCount,
  };

  const updateUrl = (next: { section?: SectionKey; view?: WorkspaceView }) => {
    const p = new URLSearchParams(searchParams.toString());
    if (next.section) p.set("section", next.section);
    if (next.view) { if (next.view === "admin") p.set("view", "admin"); else p.delete("view"); }
    const qs = p.toString();
    router.replace(`/c/${community.slug}/workspace${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const changeSection = (s: SectionKey) => { setSection(s); updateUrl({ section: s }); };
  const toggleView = () => {
    if (!isAdmin) return;
    const next: WorkspaceView = view === "admin" ? "member" : "admin";
    setView(next); updateUrl({ view: next });
  };

  const sectionProps = { community, currentUserId, role, view, isAdmin, isOwner };

  const sectionMap: Record<string, React.ReactNode> = {
    feed: <FeedSection />,
    messages: <MessagesSection community={community} currentUserId={currentUserId} spacesWithRooms={spacesWithRooms} profile={profile} />,
    missions: <MissionsSection {...sectionProps} />,
    members: <MembersSection {...sectionProps} />,
    leaderboard: <LeaderboardSection community={community} currentUserId={currentUserId} />,
    spaces: <SpacesSection community={community} spacesWithRooms={spacesWithRooms} isAdmin={isAdmin} isOwner={isOwner} />,
    live: <LiveSection />,
    courses: <CoursesSection />,
    events: <EventsSection />,
    resources: <ResourcesSection />,
  };

  const openRoom = (spaceId: string, roomId: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("space", spaceId); p.set("room", roomId);
    router.replace(`/c/${community.slug}/workspace?${p.toString()}`, { scroll: false });
  };

  const closeRoom = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("space"); p.delete("room");
    const qs = p.toString();
    router.replace(`/c/${community.slug}/workspace${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const activeSpaceId = searchParams.get("space");
  const activeRoomId = searchParams.get("room");
  const activeSpace = activeSpaceId ? spacesWithRooms.find((s) => s.id === activeSpaceId) : null;
  const activeRoom = activeSpace && activeRoomId ? activeSpace.rooms.find((r) => r.id === activeRoomId) : null;

  return (
    <WorkspaceProvider value={ctx}>
      <CallProvider>
        <div className="min-h-screen bg-bg font-[family-name:var(--font-dm-sans)]">
          {/* Top bar */}
          <TopBar
            community={community} section={section} view={view} isAdmin={isAdmin}
            onViewToggle={toggleView} unreadNotifications={unreadNotifications} profile={profile}
          />

          <div className={cn("mx-auto", isMessages ? "max-w-none" : "max-w-[1400px]")}>
            <div className={cn(
              "py-4 lg:py-6 pb-24 lg:pb-6",
              isMessages
                ? "px-0"
                : "px-4 lg:px-6 lg:grid lg:grid-cols-[240px_1fr_300px] lg:gap-5"
            )}>

              {/* ── Left sidebar ── */}
              {!isMessages && (
                <aside className="hidden lg:flex flex-col gap-0 flex-shrink-0">
                  <Sidebar
                    community={community} section={section} view={view} isAdmin={isAdmin}
                    onSectionChange={changeSection} profile={profile} points={points}
                    spacesWithRooms={spacesWithRooms} expandedSpaces={expandedSpaces}
                    onToggleSpace={(id) => setExpandedSpaces((p) => ({ ...p, [id]: !p[id] }))}
                    onNavigateRoom={openRoom} openMissionsCount={openMissionsCount}
                    unreadNotifications={unreadNotifications}
                    onOpenBookmarks={() => setBookmarksOpen(true)}
                  />
                </aside>
              )}

              {/* ── Main content ── */}
              {isMessages ? (
                <div className="relative min-w-0">
                  <MessagesSection community={community} currentUserId={currentUserId} spacesWithRooms={spacesWithRooms} profile={profile} />
                </div>
              ) : (
                <main className="relative min-w-0 min-h-[60vh]">
                  <div className="min-w-0">
                    {isRoot ? sectionMap[section] : children}
                  </div>

                  {activeSpace && activeRoom && (
                    <WorkspaceRoomOverlay
                      communityName={community.name}
                      spaceName={activeSpace.name}
                      spaceIconName={(activeSpace as any).icon ?? null}
                      roomName={activeRoom.name}
                      roomType={activeRoom.room_type}
                      onClose={closeRoom}
                    >
                      <RoomContent community={community} space={activeSpace} room={activeRoom} currentUserId={currentUserId} />
                    </WorkspaceRoomOverlay>
                  )}
                </main>
              )}

              {/* ── Right rail ── */}
              {!isMessages && (
                <aside className="hidden lg:block flex-shrink-0">
                  <RightRail community={community} points={points} liveSessions={liveSessions} spacesWithRooms={spacesWithRooms} openMissionsCount={openMissionsCount} />
                </aside>
              )}
            </div>
          </div>
          <MobileBottomNav section={section} onSectionChange={changeSection} unreadNotifications={unreadNotifications} openMissionsCount={openMissionsCount} />

          {/* Bookmarks panel (slide-out) */}
          {bookmarksOpen && (
            <BookmarksPanel
              communityId={community.id}
              currentUserId={currentUserId}
              onClose={() => setBookmarksOpen(false)}
              onNavigateRoom={(spaceId, roomId) => {
                openRoom(spaceId, roomId);
                setBookmarksOpen(false);
              }}
            />
          )}
        </div>
      </CallProvider>
    </WorkspaceProvider>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TOP BAR
   ══════════════════════════════════════════════════════════════════ */

function TopBar({ community, section, view, isAdmin, onViewToggle, unreadNotifications, profile }: {
  community: WorkspaceCommunity; section: SectionKey; view: WorkspaceView;
  isAdmin: boolean; onViewToggle: () => void; unreadNotifications: number;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
}) {
  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur-md border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-14 flex items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href={`/c/${community.slug}/workspace`} className="flex items-center gap-2 flex-shrink-0">
            {community.avatar_url ? (
              <img src={community.avatar_url} alt={community.name} className="w-7 h-7 rounded-lg object-cover ring-1 ring-border" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#fd5000] text-white font-bold text-xs flex items-center justify-center">{community.name[0]?.toUpperCase()}</div>
            )}
            <span className="text-[13px] font-semibold text-text-primary truncate hidden sm:block max-w-[140px]">{community.name}</span>
          </Link>
          <ChevronRight className="text-text-muted w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[13px] font-semibold text-text-primary">{SECTION_LABELS[section]}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isAdmin && (
            <button type="button" onClick={onViewToggle}
              className={cn("px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all",
                view === "admin" ? "bg-[#fd5000]/10 text-[#fd5000]" : "bg-surface-secondary text-text-muted hover:text-text-primary")}>
              {view === "admin" ? "Admin" : "Member"}
            </button>
          )}
          <button type="button" aria-label="Settings"
            className="w-8 h-8 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Notifications"
            className="w-8 h-8 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors flex items-center justify-center relative">
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-[#fd5000]">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>
          <Link href={`/u/${profile?.username ?? ""}`}
            className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-border hover:ring-[#fd5000]/40 transition-all flex-shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-[#fd5000]/10 text-[#fd5000] flex items-center justify-center text-[11px] font-bold">{(profile?.full_name?.[0] ?? "U").toUpperCase()}</div>}
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LEFT SIDEBAR
   ══════════════════════════════════════════════════════════════════ */

function Sidebar({
  community, section, view, isAdmin, onSectionChange, profile, points,
  spacesWithRooms, expandedSpaces, onToggleSpace, onNavigateRoom,
  openMissionsCount, unreadNotifications, onOpenBookmarks,
}: {
  community: WorkspaceCommunity; section: SectionKey; view: WorkspaceView; isAdmin: boolean;
  onSectionChange: (s: SectionKey) => void;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: PointsSnapshot | null; spacesWithRooms: WorkspaceSpaceRow[];
  expandedSpaces: Record<string, boolean>; onToggleSpace: (id: string) => void;
  onNavigateRoom: (spaceId: string, roomId: string) => void;
  openMissionsCount: number; unreadNotifications: number;
  onOpenBookmarks: () => void;
}) {
  const mainNav: { key: SectionKey; badge?: number }[] = [
    { key: "feed" },
    { key: "messages", badge: unreadNotifications },
    { key: "live" },
    { key: "missions", badge: openMissionsCount },
    { key: "courses" },
    { key: "events" },
    { key: "members" },
    { key: "leaderboard" },
  ];

  const isPremium = false; // wire to membership

  return (
    <div className="sticky top-[3.75rem] flex flex-col h-[calc(100vh-3.75rem)] overflow-y-auto pb-4">

      {/* Main nav */}
      <nav className="flex-shrink-0 space-y-0.5 py-3">
        {mainNav.map(({ key, badge }) => {
          const Icon = SECTION_ICONS[key];
          const active = section === key;
          return (
            <button key={key} type="button" onClick={() => onSectionChange(key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all",
                active ? "bg-[#fd5000] text-white shadow-sm shadow-[#fd5000]/25"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
              )}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{SECTION_LABELS[key]}</span>
              {badge !== undefined && badge > 0 && (
                <span className={cn("h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                  active ? "bg-white/25 text-white" : "bg-[#fd5000] text-white")}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Bookmarks — opens the slide-out panel */}
        <button
          type="button"
          onClick={onOpenBookmarks}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-all"
        >
          <Bookmark className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">Bookmarks</span>
        </button>

        <Link href={`/u/${profile?.username ?? ""}`}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-all">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">My Profile</span>
        </Link>
      </nav>

      <div className="h-px bg-border mx-2 flex-shrink-0" />

      {/* My Spaces */}
      <div className="flex-shrink-0 py-3">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">My Spaces</p>
          {isAdmin && view === "admin" && (
            <button type="button"
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-surface-secondary text-text-muted hover:text-[#fd5000] transition-colors">
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        {spacesWithRooms.length === 0 ? (
          <p className="px-3 text-[11px] text-text-muted">No spaces yet</p>
        ) : (
          <div className="space-y-0.5">
            {spacesWithRooms.map((space) => {
              const isOpen = expandedSpaces[space.id] !== false;
              return (
                <div key={space.id}>
                  <button type="button" onClick={() => onToggleSpace(space.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-left hover:bg-surface-secondary transition-colors group">
                    <div className="w-6 h-6 rounded-lg bg-[#fd5000]/10 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-3 h-3 text-[#fd5000]" />
                    </div>
                    <span className="flex-1 truncate text-[12px] font-medium text-text-primary">{space.name}</span>
                    {isOpen
                      ? <ChevronDown className="w-3 h-3 text-text-muted" />
                      : <ChevronRight className="w-3 h-3 text-text-muted" />}
                  </button>

                  {isOpen && space.rooms.length > 0 && (
                    <ul className="ml-4 mt-0.5 space-y-px border-l border-border/60 pl-2.5">
                      {space.rooms.map((room) => {
                        const RoomIcon = roomTypeIcon(room.room_type);
                        return (
                          <li key={room.id}>
                            <button type="button" onClick={() => onNavigateRoom(space.id, room.id)}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px] text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors">
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

        <button type="button"
          className="w-full flex items-center gap-2.5 px-3 py-1.5 mt-1 rounded-xl text-[12px] font-medium text-text-muted hover:text-[#fd5000] hover:bg-[#fd5000]/5 transition-all">
          <Plus className="w-3.5 h-3.5" />
          Create Space
        </button>
      </div>

      <div className="h-px bg-border mx-2 flex-shrink-0" />

      {/* Premium upsell */}
      {!isPremium && (
        <div className="flex-shrink-0 mx-2 mt-3 p-3 rounded-2xl bg-gradient-to-br from-[#fd5000] to-[#ff8c42] text-white">
          <div className="flex items-center gap-2 mb-1.5">
            <Star className="w-4 h-4 fill-white" />
            <span className="text-[13px] font-bold">Go Premium</span>
          </div>
          <p className="text-[11px] text-white/80 mb-2.5 leading-snug">
            Unlock exclusive tools, higher earnings and more.
          </p>
          <button type="button"
            className="w-full py-1.5 rounded-lg bg-white text-[#fd5000] text-[12px] font-bold hover:bg-white/90 transition-colors">
            Upgrade Now
          </button>
        </div>
      )}

      {/* User profile card at bottom */}
      <div className="mt-auto pt-3 flex-shrink-0">
        <UserProfileCard profile={profile} points={points} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BOOKMARKS PANEL
   ══════════════════════════════════════════════════════════════════ */

type SavedPostWithPost = Tables<"community_saved_posts"> & {
  community_posts:
  | (Pick<Tables<"community_posts">, "id" | "title" | "body" | "created_at" | "like_count" | "comment_count" | "room_id" | "space_id" | "images"> & {
    profiles: Pick<Tables<"profiles">, "full_name" | "avatar_url" | "username"> | null;
  })
  | null;
};

function BookmarksPanel({
  communityId,
  currentUserId,
  onClose,
  onNavigateRoom,
}: {
  communityId: string;
  currentUserId: string;
  onClose: () => void;
  onNavigateRoom: (spaceId: string, roomId: string) => void;
}) {
  const [items, setItems] = useState<SavedPostWithPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("community_saved_posts")
        .select(`
          *,
          community_posts!inner (
            id, title, body, created_at, like_count, comment_count,
            room_id, space_id, images, community_id,
            profiles:author_id ( full_name, avatar_url, username )
          )
        `)
        .eq("user_id", currentUserId)
        .eq("community_posts.community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        console.error("[Bookmarks] load failed:", error);
        setItems([]);
      } else {
        setItems((data ?? []) as unknown as SavedPostWithPost[]);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [communityId, currentUserId]);

  async function removeBookmark(savedId: string) {
    const supabase = createClient();
    // Optimistic — restore on failure
    const prev = items;
    setItems((p) => p.filter((b) => b.id !== savedId));
    const { error } = await supabase
      .from("community_saved_posts")
      .delete()
      .eq("id", savedId)
      .eq("user_id", currentUserId);
    if (error) {
      console.error("[Bookmarks] remove failed:", error);
      setItems(prev);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-full max-w-md bg-bg border-r border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#fd5000]" />
            <h2 className="text-[15px] font-bold text-text-primary">Bookmarks</h2>
            <span className="text-[11px] text-text-muted">({items.length})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bookmarks"
            className="w-8 h-8 rounded-lg hover:bg-surface-secondary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface animate-pulse" />
            ))
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center mb-3">
                <Bookmark className="w-5 h-5 text-[#fd5000]" />
              </div>
              <p className="text-[13px] font-semibold text-text-primary mb-1">
                No bookmarks yet
              </p>
              <p className="text-[11px] text-text-muted max-w-[240px]">
                Save posts in this community to find them here later.
              </p>
            </div>
          ) : (
            items.map((saved) => {
              const post = saved.community_posts;
              if (!post) return null;
              const author = post.profiles;
              const preview =
                post.title ||
                ((post.body ?? "").slice(0, 80) +
                  ((post.body?.length ?? 0) > 80 ? "…" : ""));
              return (
                <article
                  key={saved.id}
                  className="group rounded-xl border border-border bg-surface p-3 hover:border-border-hover transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onNavigateRoom(post.space_id, post.room_id)}
                    className="w-full text-left"
                  >
                    <p className="text-[13px] font-semibold text-text-primary line-clamp-2 mb-1">
                      {preview || "Untitled post"}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <span className="truncate">
                        {author?.full_name ?? author?.username ?? "Member"}
                      </span>
                      <span>·</span>
                      <span>{timeAgo(post.created_at ?? saved.created_at ?? new Date().toISOString())}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" />
                        {post.like_count ?? 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="w-3 h-3" />
                        {post.comment_count ?? 0}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBookmark(saved.id)}
                    className="mt-2 text-[10px] text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RIGHT RAIL
   ══════════════════════════════════════════════════════════════════ */

function RightRail({ community, points, liveSessions, spacesWithRooms, openMissionsCount }: {
  community: WorkspaceCommunity; points: PointsSnapshot | null;
  liveSessions: LiveSessionLite[]; spacesWithRooms: WorkspaceSpaceRow[];
  openMissionsCount: number;
}) {
  const [showAI, setShowAI] = useState(true);

  const missions = [
    { label: "Post a video or reel", xp: 20, done: 1, total: 1, complete: true },
    { label: "Comment on 3 posts", xp: 10, done: 2, total: 3, complete: false },
    { label: "Watch a live stream", xp: 15, done: 0, total: 1, complete: false },
    { label: "Invite 2 creators", xp: 30, done: 1, total: 2, complete: false },
  ];

  return (
    <div className="sticky top-[3.75rem] h-[calc(100vh-3.75rem)] overflow-y-auto pb-4 space-y-4 pt-4">

      {/* AI Assistant */}
      {showAI && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-text-primary">AI Assistant</p>
              <p className="text-[10px] text-emerald-500 font-medium">● Online</p>
            </div>
            <button type="button" onClick={() => setShowAI(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-secondary text-text-muted transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="text-[13px] text-text-primary mb-3">
              Hi there! 👋<br />
              <span className="text-text-muted text-[12px]">How can I help you today?</span>
            </p>
            <div className="space-y-1.5">
              {[
                { icon: Target, label: "Find missions for me" },
                { icon: TrendingUp, label: "Analyze my growth" },
                { icon: Sparkles, label: "Generate content ideas" },
                { icon: Play, label: "Summarize this live chat" },
              ].map(({ icon: Icon, label }) => (
                <button key={label} type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-secondary hover:bg-border/60 transition-colors text-[12px] text-text-primary font-medium text-left">
                  <Icon className="w-3.5 h-3.5 text-[#fd5000] flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 bg-bg rounded-lg border border-border px-3 py-2">
              <input
                type="text"
                placeholder="Ask anything…"
                className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted outline-none"
              />
              <button type="button" className="w-6 h-6 flex items-center justify-center rounded-md bg-[#fd5000] text-white">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Now */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-1.5">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e5484d] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e5484d]" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Live Now</span>
          </div>
          <button type="button" className="text-[11px] text-[#fd5000] font-medium hover:underline">View all</button>
        </div>
        {liveSessions.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <Radio className="w-6 h-6 text-text-muted opacity-40 mb-2" />
            <p className="text-[11px] text-text-muted">No live sessions right now</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {liveSessions.slice(0, 2).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-surface-secondary overflow-hidden flex-shrink-0 relative">
                  {s.thumbnail_url && <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                  <span className="absolute top-0.5 left-0.5 bg-[#e5484d] text-white text-[8px] font-bold px-1 py-0.5 rounded">LIVE</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary truncate">{s.title}</p>
                  <p className="text-[11px] text-text-muted">{s.host_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Missions */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Daily Missions</span>
          <button type="button" className="text-[11px] text-[#fd5000] font-medium hover:underline">View all</button>
        </div>
        <div className="divide-y divide-border">
          {missions.map((m) => (
            <div key={m.label} className="flex items-start gap-3 px-4 py-3">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                m.complete ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-surface-secondary")}>
                {m.complete
                  ? <span className="text-[10px]">✓</span>
                  : <Target className="w-3.5 h-3.5 text-text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-medium text-text-primary truncate">{m.label}</p>
                  <span className={cn("text-[10px] font-bold ml-2 flex-shrink-0",
                    m.complete ? "text-emerald-500" : "text-[#fd5000]")}>
                    +{m.xp} XP
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", m.complete ? "bg-emerald-400" : "bg-[#fd5000]")}
                      style={{ width: `${(m.done / m.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted flex-shrink-0">{m.done}/{m.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#fffbea] dark:bg-amber-900/15 border-t border-amber-200/50">
          <Flame className="w-4 h-4 text-amber-500" />
          <div className="flex-1">
            <span className="text-[12px] font-bold text-amber-700 dark:text-amber-400">7 Day Streak</span>
            <span className="text-[11px] text-amber-600/80 dark:text-amber-500/80 ml-1">Keep it up!</span>
          </div>
          <span className="text-[11px] font-bold text-amber-500">+50 XP</span>
        </div>
      </div>

      {/* Active Spaces */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Active Spaces</span>
          <button type="button" className="text-[11px] text-[#fd5000] font-medium hover:underline">View all</button>
        </div>
        {spacesWithRooms.length === 0 ? (
          <p className="text-[11px] text-text-muted text-center py-6">No spaces yet</p>
        ) : (
          <div className="divide-y divide-border">
            {spacesWithRooms.slice(0, 4).map((space) => {
              const colors = ["bg-[#fd5000]", "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500"];
              const color = colors[(space.name.charCodeAt(0) || 0) % colors.length];
              return (
                <div key={space.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-secondary transition-colors cursor-pointer">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
                    <span className="text-white font-bold text-[11px]">{space.name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-text-primary truncate">{space.name}</p>
                    <p className="text-[10px] text-text-muted">{space.rooms.length} rooms</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-text-muted">online</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MESSAGES SECTION
   ══════════════════════════════════════════════════════════════════ */

type ConvItem = {
  id: string; peerId: string; peerName: string; peerAvatar: string | null;
  lastMessage: string; lastMessageTime: string; unread?: boolean;
};
type MsgItem = { id: string; body: string; sender_id: string; created_at: string; };

function MessagesSection({ community, currentUserId, spacesWithRooms, profile }: {
  community: WorkspaceCommunity; currentUserId: string;
  spacesWithRooms: WorkspaceSpaceRow[];
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
}) {
  const [convs, setConvs] = useState<ConvItem[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activePeer, setActivePeer] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const [messages, setMessages] = useState<MsgItem[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatRooms = spacesWithRooms.flatMap((s) =>
    s.rooms.filter((r) => r.room_type === "chat").map((r) => ({ id: r.id, name: r.name, spaceName: s.name, spaceId: s.id }))
  );

  useEffect(() => {
    let dead = false;
    async function load() {
      setLoadingConvs(true);
      try {
        const { data } = await createClient()
          .from("community_inbox_conversations")
          .select(`id,user_high,user_low,updated_at,community_inbox_messages(body,created_at,sender_id)`)
          .eq("community_id", community.id)
          .or(`user_high.eq.${currentUserId},user_low.eq.${currentUserId}`)
          .order("updated_at", { ascending: false }).limit(50);

        if (dead || !data) return;
        const peerIds = data.map((c: any) => c.user_high === currentUserId ? c.user_low : c.user_high);
        const { data: profs } = await createClient().from("profiles").select("id,full_name,avatar_url,username").in("id", peerIds);
        const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));

        setConvs(data.map((c: any) => {
          const peerId = c.user_high === currentUserId ? c.user_low : c.user_high;
          const peer = pm.get(peerId) as any;
          const msgs = [...(c.community_inbox_messages ?? [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const last = msgs[0];
          return {
            id: c.id, peerId,
            peerName: peer?.full_name || peer?.username || "Member",
            peerAvatar: peer?.avatar_url ?? null,
            lastMessage: last?.body || "No messages yet",
            lastMessageTime: last?.created_at || c.updated_at,
            unread: last && last.sender_id !== currentUserId,
          };
        }));
      } finally { if (!dead) setLoadingConvs(false); }
    }
    load();
    return () => { dead = true; };
  }, [community.id, currentUserId]);

  useEffect(() => {
    if (!activeConvId) return;
    let dead = false;
    async function load() {
      setLoadingMsgs(true);
      try {
        const { data } = await createClient()
          .from("community_inbox_messages")
          .select("id,body,sender_id,created_at")
          .eq("conversation_id", activeConvId!)
          .eq("is_deleted", false)
          .order("created_at", { ascending: true }).limit(100);
        if (!dead) setMessages(data ?? []);
      } finally { if (!dead) setLoadingMsgs(false); }
    }
    load();

    const supabase = createClient();
    const ch = supabase.channel(`conv:${activeConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_inbox_messages", filter: `conversation_id=eq.${activeConvId}` },
        (p: any) => setMessages((prev) => [...prev, p.new as MsgItem]))
      .subscribe();
    return () => { dead = true; supabase.removeChannel(ch); };
  }, [activeConvId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      const { data } = await createClient()
        .from("community_memberships")
        .select("user_id,profiles!inner(id,full_name,avatar_url,username)")
        .eq("community_id", community.id).eq("status", "active").neq("user_id", currentUserId).limit(8);
      const q = searchQ.toLowerCase();
      setSearchRes((data ?? []).filter((m: any) => {
        const p = m.profiles as any;
        return (p?.full_name || p?.username || "").toLowerCase().includes(q);
      }).map((m: any) => m.profiles));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, community.id, currentUserId]);

  const openConv = useCallback((conv: ConvItem) => {
    setActiveConvId(conv.id);
    setActivePeer({ id: conv.peerId, name: conv.peerName, avatar: conv.peerAvatar });
  }, []);

  const startDM = useCallback(async (peer: any) => {
    setSearchQ(""); setSearchRes([]);
    try {
      const { data: convId } = await createClient().rpc("get_or_create_community_inbox_conversation",
        { p_community_id: community.id, p_peer_id: peer.id });
      if (convId) {
        const existing = convs.find((c) => c.id === convId);
        const conv: ConvItem = existing ?? {
          id: convId, peerId: peer.id, peerName: peer.full_name || peer.username || "Member",
          peerAvatar: peer.avatar_url ?? null, lastMessage: "No messages yet", lastMessageTime: new Date().toISOString(),
        };
        if (!existing) setConvs((p) => [conv, ...p]);
        openConv(conv);
      }
    } catch (e) { console.error(e); }
  }, [community.id, convs, openConv]);

  const sendMsg = useCallback(async () => {
    const text = draft.trim();
    if (!text || !activeConvId || sending) return;
    setSending(true); setDraft("");
    try {
      await createClient().from("community_inbox_messages").insert({
        conversation_id: activeConvId, sender_id: currentUserId, body: text, message_type: "text",
      });
    } catch (e) { console.error(e); setDraft(text); }
    finally { setSending(false); }
  }, [draft, activeConvId, sending, currentUserId]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left: list */}
      <div className={cn("flex-shrink-0 flex flex-col border-r border-border bg-surface w-full lg:w-[300px]", activeConvId ? "hidden lg:flex" : "flex")}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
          <h2 className="text-[15px] font-bold text-text-primary">Messages</h2>
        </div>

        <div className="px-3 py-2 border-b border-border flex-shrink-0 relative">
          <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2 border border-border focus-within:border-[#fd5000]/50 transition-colors">
            <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search members…"
              className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted outline-none" />
          </div>
          {searchRes.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 z-30 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
              {searchRes.map((p: any) => (
                <button key={p.id} type="button" onClick={() => startDM(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-secondary transition-colors">
                  <Avatar name={p.full_name || p.username || "M"} avatar={p.avatar_url} size="sm" online />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{p.full_name || p.username}</p>
                    {p.username && <p className="text-[11px] text-text-muted">@{p.username}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {chatRooms.length > 0 && (
          <div className="px-3 pt-2 pb-1 flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1 mb-1">Chat Rooms</p>
            {chatRooms.map((r) => (
              <Link key={r.id} href={`/c/${community.slug}/workspace?space=${r.spaceId}&room=${r.id}`}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-surface-secondary transition-colors group mb-0.5">
                <div className="w-8 h-8 rounded-xl bg-[#fd5000]/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-[#fd5000]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary truncate">{r.name}</p>
                  <p className="text-[10px] text-text-muted">{r.spaceName}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
            {convs.length > 0 && <div className="h-px bg-border my-2" />}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {convs.length > 0 && <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-4 pt-1 pb-1">Direct Messages</p>}
          {loadingConvs ? (
            <div className="space-y-1 px-3 pt-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-surface-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 rounded bg-surface-secondary" />
                    <div className="h-2 w-40 rounded bg-surface-secondary" />
                  </div>
                </div>
              ))}
            </div>
          ) : convs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-[#fd5000]" />
              </div>
              <p className="text-[13px] font-semibold text-text-primary mb-1">No messages yet</p>
              <p className="text-[11px] text-text-muted">Search above to start a conversation.</p>
            </div>
          ) : (
            <div className="space-y-px px-2 py-1">
              {convs.map((conv) => (
                <button key={conv.id} type="button" onClick={() => openConv(conv)}
                  className={cn("w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors text-left",
                    activeConvId === conv.id ? "bg-[#fd5000]/8 border border-[#fd5000]/20" : "hover:bg-surface-secondary border border-transparent")}>
                  <Avatar name={conv.peerName} avatar={conv.peerAvatar} size="md" online />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={cn("text-[13px] truncate", conv.unread ? "font-bold text-text-primary" : "font-semibold text-text-primary")}>{conv.peerName}</p>
                      <span className="text-[10px] text-text-muted flex-shrink-0 ml-2">{timeAgo(conv.lastMessageTime)}</span>
                    </div>
                    <p className={cn("text-[12px] truncate", conv.unread ? "text-text-primary font-medium" : "text-text-muted")}>{conv.lastMessage}</p>
                  </div>
                  {conv.unread && <span className="w-2 h-2 rounded-full bg-[#fd5000] flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: thread */}
      <div className={cn("flex-1 flex flex-col min-w-0 bg-bg", !activeConvId ? "hidden lg:flex" : "flex")}>
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-[#fd5000]/8 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-[#fd5000]" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-text-primary mb-1">Select a conversation</p>
              <p className="text-[13px] text-text-muted max-w-xs">Choose from the list or search for a member.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface flex-shrink-0">
              <button type="button" onClick={() => setActiveConvId(null)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-secondary text-text-muted">
                <ArrowLeft className="w-4 h-4" />
              </button>
              {activePeer && <Avatar name={activePeer.name} avatar={activePeer.avatar} size="sm" online />}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-text-primary">{activePeer?.name}</p>
                <p className="text-[11px] text-emerald-500 font-medium">Active now</p>
              </div>
              <button type="button" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-secondary text-text-muted">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {loadingMsgs ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={cn("flex gap-2 animate-pulse", i % 2 === 0 ? "" : "flex-row-reverse")}>
                      <div className="w-7 h-7 rounded-full bg-surface-secondary flex-shrink-0" />
                      <div className="h-10 w-48 rounded-2xl bg-surface-secondary" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
                  {activePeer && <Avatar name={activePeer.name} avatar={activePeer.avatar} size="lg" />}
                  <p className="text-[14px] font-bold text-text-primary">{activePeer?.name}</p>
                  <p className="text-[12px] text-text-muted">Say hello!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUserId;
                    const prev = idx > 0 ? messages[idx - 1] : null;
                    const showAv = !isMe && (!prev || prev.sender_id !== msg.sender_id);
                    const consecutive = prev && prev.sender_id === msg.sender_id;
                    return (
                      <div key={msg.id} className={cn("flex gap-2 group", isMe ? "flex-row-reverse" : "flex-row", consecutive ? "mt-0.5" : "mt-3")}>
                        <div className="w-7 flex-shrink-0">
                          {showAv && activePeer && <Avatar name={activePeer.name} avatar={activePeer.avatar} size="xs" />}
                        </div>
                        <div className={cn("flex flex-col gap-0.5 max-w-[70%]", isMe ? "items-end" : "items-start")}>
                          <div className={cn("px-3.5 py-2 text-[13px] leading-relaxed break-words",
                            isMe ? "bg-[#fd5000] text-white rounded-2xl rounded-br-sm" : "bg-surface border border-border text-text-primary rounded-2xl rounded-bl-sm")}>
                            {msg.body}
                          </div>
                          <span className="text-[10px] text-text-muted px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-surface">
              <div className={cn("flex items-end gap-2 bg-bg rounded-xl border px-3 py-2 transition-colors", draft ? "border-[#fd5000]/40" : "border-border")}>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                  placeholder={`Message ${activePeer?.name ?? ""}…`} rows={1}
                  className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted outline-none resize-none max-h-32 leading-relaxed"
                  style={{ minHeight: "24px" }} />
                <button type="button" onClick={sendMsg} disabled={!draft.trim() || sending}
                  className={cn("flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    draft.trim() && !sending ? "bg-[#fd5000] text-white hover:bg-[#e04800] active:scale-95" : "bg-surface-secondary text-text-muted cursor-not-allowed")}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LEADERBOARD
   ══════════════════════════════════════════════════════════════════ */

function LeaderboardSection({ community, currentUserId }: { community: WorkspaceCommunity; currentUserId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "week" | "month">("all");

  useEffect(() => {
    fetch(`/api/communities/${community.slug}/leaderboard`)
      .then((r) => r.ok ? r.json() : { rows: [] })
      .then((d) => setRows(d.rows || []))
      .finally(() => setLoading(false));
  }, [community.slug]);

  const now = new Date();
  const filtered = rows.filter((r) => {
    if (tab === "all") return true;
    const d = new Date(r.last_active_at || r.created_at);
    if (tab === "week") { const s = new Date(now); s.setDate(s.getDate() - s.getDay()); s.setHours(0, 0, 0, 0); return d >= s; }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[18px] font-bold text-text-primary">Leaderboard</h2>
      <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
        {(["all", "week", "month"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn("flex-1 px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors",
              tab === t ? "bg-[#fd5000] text-white" : "text-text-muted hover:text-text-primary")}>
            {t === "all" ? "All Time" : t === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border animate-pulse">
              <div className="w-8 h-8 rounded-full bg-surface-secondary" />
              <div className="flex-1 h-3 rounded bg-surface-secondary" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
          <Trophy className="w-8 h-8 text-[#fd5000] opacity-40 mb-3" />
          <h3 className="text-[15px] font-bold text-text-primary mb-1">No rankings yet</h3>
          <p className="text-[12px] text-text-muted">Earn points by participating.</p>
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="flex justify-center items-end gap-3 py-4">
              {top3[1] && <PodiumCard row={top3[1]} place={2} currentUserId={currentUserId} />}
              {top3[0] && <PodiumCard row={top3[0]} place={1} large currentUserId={currentUserId} />}
              {top3[2] && <PodiumCard row={top3[2]} place={3} currentUserId={currentUserId} />}
            </div>
          )}
          {rest.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-surface-secondary/60">
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-text-muted">Rank</th>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-text-muted">Member</th>
                  <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-text-muted">Level</th>
                  <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-text-muted">Points</th>
                </tr></thead>
                <tbody>
                  {rest.map((r, i) => (
                    <tr key={r.user_id} className={cn("border-b border-border last:border-0", r.user_id === currentUserId && "bg-[#fd5000]/5")}>
                      <td className="py-2 px-3 font-bold text-text-muted text-[12px]">{i + 4}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.profile?.full_name || r.profile?.username || "U"} avatar={r.profile?.avatar_url} size="xs" />
                          <span className="font-semibold text-text-primary text-[12px] truncate">{r.profile?.full_name || r.profile?.username || "Member"}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-[12px]">{r.level}</td>
                      <td className="py-2 px-3 text-right font-bold text-[#fd5000] text-[12px]">{r.total_points?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PodiumCard({ row, place, large, currentUserId }: { row: any; place: number; large?: boolean; currentUserId: string }) {
  return (
    <div className={cn("flex flex-col items-center text-center", large ? "order-2" : place === 2 ? "order-1" : "order-3")}>
      <div className={cn("rounded-xl border border-border bg-surface p-3 flex flex-col items-center", large ? "h-32" : "h-24", row.user_id === currentUserId && "ring-2 ring-[#fd5000]")}>
        <Avatar name={row.profile?.full_name || row.profile?.username || "U"} avatar={row.profile?.avatar_url} size={large ? "md" : "sm"} />
        <p className={cn("mt-2 truncate max-w-[90px] font-semibold text-text-primary", large ? "text-[12px]" : "text-[11px]")}>{row.profile?.full_name || row.profile?.username}</p>
        <p className="text-[10px] font-bold text-[#fd5000]">{row.total_points?.toLocaleString()} pts</p>
      </div>
      <div className={cn("mt-2 font-bold text-text-muted", large ? "text-lg" : "text-base")}>#{place}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   USER PROFILE CARD
   ══════════════════════════════════════════════════════════════════ */

function UserProfileCard({ profile, points }: {
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
    <div className="p-3 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar name={name} avatar={profile?.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-text-primary truncate">{name}</p>
          <p className="text-[10px] text-text-muted">Level {lvl} · {pts.toLocaleString()} XP</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-[#f0b429] bg-[#fffbea] dark:bg-[#2a1f00] rounded-full">
            <Flame className="w-3 h-3" />{streak}
          </div>
        )}
        <button type="button" className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-surface-secondary text-text-muted transition-colors ml-auto">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
      <div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", close && "animate-pulse")}
            style={{ width: `${pct}%`, background: close ? "linear-gradient(90deg,#fd5000,#f0b429)" : "#fd5000" }} />
        </div>
        <p className="mt-1 text-[10px] text-text-muted">
          {close ? <span className="font-semibold text-[#fd5000]">{remaining.toLocaleString()} XP to level {lvl + 1}!</span>
            : <>{remaining.toLocaleString()} XP to level {lvl + 1}</>}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV
   ══════════════════════════════════════════════════════════════════ */

function MobileBottomNav({ section, onSectionChange, unreadNotifications, openMissionsCount }: {
  section: SectionKey; onSectionChange: (s: SectionKey) => void;
  unreadNotifications: number; openMissionsCount: number;
}) {
  const items: { key: SectionKey; label: string; icon: LucideIcon; badge?: number }[] = [
    { key: "feed", label: "Home", icon: Home },
    { key: "messages", label: "Messages", icon: MessageCircle, badge: unreadNotifications },
    { key: "missions", label: "Missions", icon: Target, badge: openMissionsCount },
    { key: "members", label: "Members", icon: Users },
    { key: "leaderboard", label: "Ranks", icon: Trophy },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur-md border-t border-border safe-area-pb">
      <div className="grid grid-cols-5 h-14">
        {items.map(({ key, label, icon: Icon, badge }) => {
          const active = section === key;
          return (
            <button key={key} type="button" onClick={() => onSectionChange(key)}
              className={cn("relative flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-[#fd5000]" : "text-text-muted hover:text-text-primary")}>
              <span className="relative">
                <Icon className="w-5 h-5" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 h-3.5 min-w-[14px] flex items-center justify-center rounded-full bg-[#fd5000] px-0.5 text-[8px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
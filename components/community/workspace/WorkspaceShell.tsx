// components/workspace/WorkspaceShell.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Home, Layers, Radio, Target, GraduationCap, Calendar, Users, BookOpen,
  Plus, Sparkles, ChevronDown, ChevronRight, Bell, Settings, Flame,
  MessageCircle, FileText, Folder, CheckSquare, LayoutList, Hash, Trophy,
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
}

/* ─── Main Shell ─────────────────────────────────────────────────── */

export function WorkspaceShell({
  community, currentUserId, role, isAdmin, isOwner,
  initialSection, initialView,
  profile = null, points = null, spacesWithRooms = [],
  unreadNotifications = 0, openMissionsCount = 0,
  membership = null, liveSessions = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Build workspace context value
  const workspaceContext = {
    slug: community.slug,
    communityId: community.id,
    communityName: community.name,
    ownerId: community.owner_id,
    memberCount: community.member_count,
    avatarUrl: community.avatar_url,
    userId: currentUserId,
    profile,
    membership,
    spacesWithRooms,
    points,
    liveSessions,
    unreadNotifications,
    openMissionsCount,
  };

  const [section, setSection] = useState<WorkspaceSection>(
    SECTION_LIST.includes(initialSection as WorkspaceSection) ? initialSection as WorkspaceSection : "feed"
  );
  const [view, setView] = useState<WorkspaceView>(initialView);
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    spacesWithRooms.forEach((s) => { init[s.id] = true; });
    return init;
  });

  const updateUrl = (next: { section?: WorkspaceSection; view?: WorkspaceView }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.section) params.set("section", next.section);
    if (next.view) {
      if (next.view === "admin") params.set("view", "admin");
      else params.delete("view");
    }
    const qs = params.toString();
    router.replace(`/c/${community.slug}/workspace${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const handleSectionChange = (s: WorkspaceSection) => {
    setSection(s);
    updateUrl({ section: s });
  };

  const handleViewToggle = () => {
    if (!isAdmin) return;
    const next: WorkspaceView = view === "admin" ? "member" : "admin";
    setView(next);
    updateUrl({ view: next });
  };

  const sectionProps = { community, currentUserId, role, view, isAdmin, isOwner };

  const sectionMap: Record<WorkspaceSection, React.ReactNode> = {
    feed: <FeedSection {...sectionProps} />,
    chats: <ChatsSection community={community} currentUserId={currentUserId} spacesWithRooms={spacesWithRooms} />,
    missions: <MissionsSection {...sectionProps} />,
    members: <MembersSection {...sectionProps} />,
    leaderboard: <LeaderboardSection {...sectionProps} />,
    spaces: <SpacesSection />,
    live: <LiveSection />,
    courses: <CoursesSection />,
    events: <EventsSection />,
    resources: <ResourcesSection />,
  };

  return (
    <WorkspaceProvider value={workspaceContext}>
      <CallProvider>
        <div className="min-h-screen bg-bg font-[family-name:var(--font-dm-sans)]">
          {/* ── Top Bar ──────────────────────────────────────────────── */}
          <TopBar
            community={community}
            section={section}
            view={view}
            isAdmin={isAdmin}
            onViewToggle={handleViewToggle}
            unreadNotifications={unreadNotifications}
            profile={profile}
          />

          <div className="max-w-[1400px] mx-auto">
            <div className="lg:grid lg:grid-cols-[268px_1fr_320px] lg:gap-6 px-4 lg:px-6 py-4 lg:py-6 pb-24 lg:pb-6">

              {/* ── Left Sidebar: Spaces + Rooms tree ─────────────────── */}
              <aside className="hidden lg:block flex-shrink-0">
                <Sidebar
                  community={community}
                  section={section}
                  view={view}
                  isAdmin={isAdmin}
                  onSectionChange={handleSectionChange}
                  profile={profile}
                  points={points}
                  spacesWithRooms={spacesWithRooms}
                  expandedSpaces={expandedSpaces}
                  onToggleSpace={(id) => setExpandedSpaces((prev) => ({ ...prev, [id]: !prev[id] }))}
                  onNavigateRoom={(spaceId, roomId) => {
                    router.push(`/c/${community.slug}/workspace?space=${spaceId}&room=${roomId}`);
                  }}
                  openMissionsCount={openMissionsCount}
                  unreadNotifications={unreadNotifications}
                />
              </aside>

              {/* ── Main Content ─────────────────────────────────────── */}
              <main className="min-w-0">
                {sectionMap[section]}
              </main>

              {/* ── Right Rail ───────────────────────────────────────── */}
              <aside className="hidden lg:block flex-shrink-0">
                <RightRail community={community} />
              </aside>
            </div>
          </div>

          {/* ── Mobile Bottom Nav ───────────────────────────────────── */}
          <MobileBottomNav
            section={section}
            onSectionChange={handleSectionChange}
            unreadNotifications={unreadNotifications}
            openMissionsCount={openMissionsCount}
            profile={profile}
          />
        </div>
      </CallProvider>
    </WorkspaceProvider>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   TOP BAR
   ════════════════════════════════════════════════════════════════════ */

function TopBar({
  community, section, view, isAdmin, onViewToggle, unreadNotifications, profile,
}: {
  community: WorkspaceCommunity;
  section: WorkspaceSection;
  view: WorkspaceView;
  isAdmin: boolean;
  onViewToggle: () => void;
  unreadNotifications: number;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
}) {
  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-14 flex items-center gap-3">
        {/* Left: community link */}
        <Link
          href={`/c/${community.slug}`}
          className="flex items-center gap-2 min-w-0 flex-shrink-0"
        >
          {community.avatar_url ? (
            <img src={community.avatar_url} alt={community.name} className="w-7 h-7 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#fd5000] text-white font-bold text-xs flex items-center justify-center">
              {community.name[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-[13px] font-semibold text-text-primary truncate hidden sm:block max-w-[160px]">
            {community.name}
          </span>
        </Link>

        {/* Center: section label */}
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[13px] font-semibold text-text-primary uppercase tracking-wider">
            {SECTION_LABELS[section]}
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={onViewToggle}
              className={cn(
                "px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all",
                view === "admin"
                  ? "bg-[#fd5000]/10 text-[#fd5000]"
                  : "bg-surface-secondary text-text-muted hover:text-text-primary"
              )}
            >
              {view === "admin" ? "Admin" : "Member"}
            </button>
          )}

          <button
            type="button"
            className="w-8 h-8 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors flex items-center justify-center"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="w-8 h-8 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors flex items-center justify-center relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white transition-opacity",
                unreadNotifications > 0 ? "opacity-100 bg-[#fd5000]" : "opacity-0"
              )}
            >
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          </button>

          {/* User avatar */}
          <Link
            href={`/u/${profile?.username ?? ""}`}
            className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-border hover:ring-[#fd5000]/40 transition-all flex-shrink-0"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#fd5000]/10 text-[#fd5000] flex items-center justify-center text-[11px] font-bold">
                {(profile?.full_name?.[0] ?? profile?.username?.[0] ?? "U").toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SIDEBAR — Spaces tree + Rooms + User profile card
   ════════════════════════════════════════════════════════════════════ */

function Sidebar({
  community, section, view, isAdmin, onSectionChange,
  profile, points, spacesWithRooms, expandedSpaces, onToggleSpace, onNavigateRoom,
  openMissionsCount, unreadNotifications,
}: {
  community: WorkspaceCommunity;
  section: WorkspaceSection;
  view: WorkspaceView;
  isAdmin: boolean;
  onSectionChange: (s: WorkspaceSection) => void;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: PointsSnapshot | null;
  spacesWithRooms: WorkspaceSpaceRow[];
  expandedSpaces: Record<string, boolean>;
  onToggleSpace: (id: string) => void;
  onNavigateRoom: (spaceId: string, roomId: string) => void;
  openMissionsCount: number;
  unreadNotifications: number;
}) {
  return (
    <div className="sticky top-20 flex flex-col gap-1 max-h-[calc(100vh-6rem)] overflow-y-auto">
      {/* ── Quick nav ──────────────────────────────────────────── */}
      <div className="space-y-0.5 mb-2">
        {SECTION_LIST.filter((s) => ["feed", "chats", "missions", "live"].includes(s)).map((key) => {
          const Icon = SECTION_ICONS[key];
          const isActive = section === key;
          const badge = key === "missions" ? openMissionsCount : key === "chats" ? unreadNotifications : 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSectionChange(key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
                isActive
                  ? "bg-[#fd5000] text-white shadow-sm shadow-[#fd5000]/20"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{SECTION_LABELS[key]}</span>
              {badge > 0 && (
                <span className={cn(
                  "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-[#fd5000] text-white"
                )}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Divider ────────────────────────────────────────────── */}
      <div className="h-px bg-border mx-2" />

      {/* ── Spaces tree ────────────────────────────────────────── */}
      <div className="mt-1 mb-2">
        <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Spaces
        </p>

        {spacesWithRooms.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-[11px] text-text-muted">No spaces yet</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {spacesWithRooms.map((space) => {
              const isOpen = expandedSpaces[space.id] !== false;
              return (
                <div key={space.id}>
                  <button
                    type="button"
                    onClick={() => onToggleSpace(space.id)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-left hover:bg-surface-secondary transition-colors"
                  >
                    {isOpen
                      ? <ChevronDown className="w-3 h-3 shrink-0 text-text-muted" />
                      : <ChevronRight className="w-3 h-3 shrink-0 text-text-muted" />}
                    <Hash className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                    <span className="flex-1 truncate text-[12px] font-medium text-text-primary">
                      {space.name}
                    </span>
                  </button>

                  {isOpen && space.rooms.length > 0 && (
                    <ul className="ml-5 mt-0.5 space-y-px border-l border-border pl-2">
                      {space.rooms.map((room) => {
                        const RoomIcon = roomTypeIcon(room.room_type);
                        return (
                          <li key={room.id}>
                            <button
                              type="button"
                              onClick={() => onNavigateRoom(space.id, room.id)}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
                            >
                              <RoomIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="flex-1 truncate">{room.name}</span>
                              {room.is_locked && (
                                <span className="w-2 h-2 rounded-full bg-text-muted/40" title="Locked" />
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
        )}
      </div>

      {/* ── Divider ────────────────────────────────────────────── */}
      <div className="h-px bg-border mx-2" />

      {/* ── More nav ───────────────────────────────────────────── */}
      <div className="mt-1 space-y-0.5">
        {SECTION_LIST.filter((s) => ["members", "leaderboard", "courses", "events", "resources"].includes(s)).map((key) => {
          const Icon = SECTION_ICONS[key];
          const isActive = section === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSectionChange(key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
                isActive
                  ? "bg-[#fd5000] text-white shadow-sm shadow-[#fd5000]/20"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{SECTION_LABELS[key]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Admin quick action ─────────────────────────────────── */}
      {isAdmin && view === "admin" && (
        <button
          type="button"
          className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-[#fd5000]/50 hover:bg-[#fd5000]/5 transition-all text-[12px] font-semibold text-text-muted hover:text-[#fd5000]"
        >
          <Plus className="w-3.5 h-3.5" />
          New mission
        </button>
      )}

      {/* ── User Profile Card ───────────────────────────────────── */}
      <div className="mt-auto pt-3">
        <UserProfileCard profile={profile} points={points} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   CHATS SECTION
   ════════════════════════════════════════════════════════════════════ */

function ChatsSection({ community, currentUserId, spacesWithRooms }: { community: WorkspaceCommunity; currentUserId: string; spacesWithRooms: WorkspaceSpaceRow[] }) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const chatRooms = spacesWithRooms.flatMap((s) =>
    s.rooms.filter((r) => r.room_type === "chat").map((r) => ({
      id: r.id,
      name: r.name,
      spaceName: s.name,
      type: "room" as const,
      spaceId: s.id,
    }))
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/communities/${community.slug}/inbox`);
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [community.slug]);

  const hasContent = chatRooms.length > 0 || conversations.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-text-primary">Chats</h2>
        <span className="text-[12px] text-text-muted">{chatRooms.length + conversations.length} total</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border animate-pulse">
              <div className="w-10 h-10 rounded-full bg-surface-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-surface-secondary" />
                <div className="h-2 w-48 rounded bg-surface-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasContent ? (
        <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center mb-3">
            <MessageCircle className="w-6 h-6 text-[#fd5000]" />
          </div>
          <h3 className="text-[15px] font-bold text-text-primary mb-1">No chats yet</h3>
          <p className="text-[12px] text-text-muted max-w-sm">
            Chat rooms appear when a space has chat-type rooms. Start a conversation with a community member!
          </p>
        </div>
      ) : (
        <>
          {/* Chat rooms from spaces */}
          {chatRooms.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">Chat Rooms</p>
              <div className="space-y-2">
                {chatRooms.map((room) => (
                  <Link
                    key={room.id}
                    href={`/c/${community.slug}/workspace/chats?room=${room.id}&space=${room.spaceId}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-[#fd5000]/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#fd5000]/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-[#fd5000]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary truncate">{room.name}</p>
                      <p className="text-[11px] text-text-muted truncate">in {room.spaceName}</p>
                    </div>
                    <span className="text-[11px] text-text-muted">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Direct messages / inbox conversations */}
          {conversations.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">Direct Messages</p>
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/c/${community.slug}/workspace/chats?conv=${conv.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-[#fd5000]/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-border bg-surface-secondary flex-shrink-0">
                      {conv.peerAvatar ? (
                        <img src={conv.peerAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[12px] font-bold text-[#fd5000]">
                          {(conv.peerName?.[0] ?? "U").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary truncate">{conv.peerName}</p>
                      <p className="text-[11px] text-text-muted truncate">{conv.lastMessage || "Tap to open conversation"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LEADERBOARD SECTION
   ════════════════════════════════════════════════════════════════════ */

function LeaderboardSection({ community, currentUserId }: { community: WorkspaceCommunity; currentUserId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "week" | "month">("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/communities/${community.slug}/leaderboard`);
        if (res.ok) {
          const data = await res.json();
          setRows(data.rows || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [community.slug]);

  const filtered = rows.filter((r) => {
    if (tab === "all") return true;
    const ref = r.last_active_at || r.created_at;
    if (!ref) return true;
    const d = new Date(ref);
    const now = new Date();
    if (tab === "week") {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      return d >= start;
    }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-text-primary">Leaderboard</h2>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
        {(["all", "week", "month"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors",
              tab === t ? "bg-[#fd5000] text-white" : "text-text-muted hover:text-text-primary"
            )}
          >
            {t === "all" ? "All Time" : t === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border animate-pulse">
              <div className="w-8 h-8 rounded-full bg-surface-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-surface-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center mb-3">
            <Trophy className="w-6 h-6 text-[#fd5000]" />
          </div>
          <h3 className="text-[15px] font-bold text-text-primary mb-1">No rankings yet</h3>
          <p className="text-[12px] text-text-muted max-w-sm">
            Points are earned by participating in the community. Check back soon!
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {top3.length > 0 && (
            <div className="flex justify-center items-end gap-3 py-4">
              {top3[1] && <PodiumCard row={top3[1]} place={2} />}
              {top3[0] && <PodiumCard row={top3[0]} place={1} large />}
              {top3[2] && <PodiumCard row={top3[2]} place={3} />}
            </div>
          )}

          {/* Rest of list */}
          {rest.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary/60">
                    <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-text-muted">Rank</th>
                    <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-text-muted">Member</th>
                    <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-text-muted">Level</th>
                    <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-text-muted">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((r, i) => (
                    <tr
                      key={r.user_id}
                      className={cn(
                        "border-b border-border last:border-0",
                        r.user_id === currentUserId && "bg-[#fd5000]/5"
                      )}
                    >
                      <td className="py-2 px-3 font-bold text-text-muted text-[12px]">{i + 4}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-border bg-surface-secondary flex-shrink-0">
                            {r.profile?.avatar_url ? (
                              <img src={r.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[#fd5000]">
                                {(r.profile?.full_name?.[0] ?? r.profile?.username?.[0] ?? "U").toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-text-primary text-[12px] truncate">
                            {r.profile?.full_name || r.profile?.username || "Member"}
                          </span>
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

function PodiumCard({ row, place, large }: { row: any; place: number; large?: boolean }) {
  const h = large ? "h-32" : "h-24";
  return (
    <div className={cn("flex flex-col items-center text-center", large ? "order-2" : place === 1 ? "order-1" : "order-3")}>
      <div
        className={cn(
          "rounded-xl border border-border bg-surface p-3 flex flex-col items-center",
          h,
          row.user_id === row.currentUserId && "ring-2 ring-[#fd5000]"
        )}
      >
        <div className={cn("rounded-full overflow-hidden ring-1 ring-border bg-surface-secondary", large ? "w-12 h-12" : "w-10 h-10")}>
          {row.profile?.avatar_url ? (
            <img src={row.profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[14px] font-bold text-[#fd5000]">
              {(row.profile?.full_name?.[0] ?? row.profile?.username?.[0] ?? "U").toUpperCase()}
            </div>
          )}
        </div>
        <p className={cn("mt-2 truncate max-w-[100px] font-semibold text-text-primary", large ? "text-[12px]" : "text-[11px]")}>
          {row.profile?.full_name || row.profile?.username}
        </p>
        <p className="text-[10px] font-bold text-[#fd5000]">{row.total_points?.toLocaleString()} pts</p>
      </div>
      <div className={cn("mt-2 font-bold text-text-muted", large ? "text-lg" : "text-base")}>#{place}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   USER PROFILE CARD (with XP bar)
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
  const closeToLevelUp = pct >= 80;

  const displayName = profile?.full_name || profile?.username || "Member";

  return (
    <div className="p-3 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-border bg-surface-secondary flex-shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[12px] font-bold text-[#fd5000]">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-text-primary truncate">{displayName}</p>
          <p className="text-[10px] text-text-muted">Level {lvl} · {pts.toLocaleString()} XP</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-[#f0b429] bg-[#fffbea] dark:bg-[#2a1f00] rounded-full">
            <Flame className="w-3 h-3" />
            {streak}
          </div>
        )}
      </div>

      {/* XP progress bar */}
      <div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
              closeToLevelUp ? "animate-pulse" : ""
            )}
            style={{
              width: `${pct}%`,
              background: closeToLevelUp
                ? "linear-gradient(90deg, #fd5000, #f0b429)"
                : "#fd5000",
            }}
          />
        </div>
        <p className="mt-1 text-[10px] text-text-muted">
          {closeToLevelUp ? (
            <span className="font-semibold text-[#fd5000]">{remaining.toLocaleString()} XP to level {lvl + 1}!</span>
          ) : (
            <>{remaining.toLocaleString()} XP to level {lvl + 1}</>
          )}
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   RIGHT RAIL
   ════════════════════════════════════════════════════════════════════ */

function RightRail({ community }: { community: WorkspaceCommunity }) {
  return (
    <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto flex flex-col gap-4">
      {/* Live now */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e5484d] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e5484d]" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Live now</span>
        </div>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center mb-2">
            <Radio className="w-4 h-4 text-text-muted" />
          </div>
          <p className="text-[11px] text-text-muted text-center py-3">No live sessions right now</p>
        </div>
      </div>

      {/* Top earners */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Top this week</span>
          <Link href={`/c/${community.slug}/workspace?section=members`} className="text-[11px] text-[#fd5000] font-medium hover:underline">
            See all →
          </link>
        </div>
        <p className="text-[11px] text-text-muted text-center py-3">Leaderboard updates every Monday</p>
      </div>

      {/* Upcoming events */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-3.5 h-3.5 text-[#fd5000]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Coming up</span>
        </div>
        <p className="text-[11px] text-text-muted text-center py-3">No events scheduled yet</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV (5 tabs)
   ═══════════════════════════════════════════════════════════════════ */

function MobileBottomNav({
  section, onSectionChange, unreadNotifications, openMissionsCount, profile,
}: {
  section: WorkspaceSection;
  onSectionChange: (s: WorkspaceSection) => void;
  unreadNotifications: number;
  openMissionsCount: number;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
}) {
  const items: { key: WorkspaceSection; label: string; icon: LucideIcon; badge?: number }[] = [
    { key: "feed", label: "Home", icon: Home },
    { key: "chats", label: "Chats", icon: MessageCircle },
    { key: "missions", label: "Missions", icon: Target, badge: openMissionsCount },
    { key: "members", label: "Members", icon: Users },
    { key: "leaderboard", label: "Ranks", icon: Trophy },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur-md border-t border-border safe-area-pb">
      <div className="grid grid-cols-5 h-14">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = section === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSectionChange(item.key)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 transition-colors",
                isActive ? "text-[#fd5000]" : "text-text-muted hover:text-text-primary"
              )}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#fd5000] px-0.5 text-[8px] font-bold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ═════════════════════════════════════════════════════════════════════ */

export default function MobileBottomNavExport({
  section, onSectionChange, unreadNotifications, openMissionsCount, profile,
}: {
  section: WorkspaceSection;
  onSectionChange: (s: WorkspaceSection) => void;
  unreadNotifications: number;
  openMissionsCount: number;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
}) {
  return <MobileBottomNav section={section} onSectionChange={onSectionChange} unreadNotifications={unreadNotifications} openMissionsCount={openMissionsCount} profile={profile} />;
}
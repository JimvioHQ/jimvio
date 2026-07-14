"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crown,
  GraduationCap,
  Home,
  Layers,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Target,
  User,
  Wallet,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, getInitials } from "@/lib/utils";
import { SidebarBadgeDot } from "@/components/ui/sidebar";
import { HUB_AUTH_NAV_IDS, buildHubLoginUrl } from "@/lib/community/hub-auth";

export type SidebarItem =
  | "feed" | "explore" | "live" | "spaces" | "messages"
  | "missions" | "courses" | "events" | "wallet" | "analytics"
  | "bookmarks" | "profile" | "dashboard";

type NavItem = {
  id: SidebarItem;
  label: string;
  href: string;
  icon: typeof Home;
  badge?: { type: "count" | "new" | "live"; value?: string | number };
  featureColor?: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "feed", label: "Feed", href: "/c", icon: Home, featureColor: "growth" },
  { id: "explore", label: "Explore", href: "/communities", icon: Compass, featureColor: "events" },
  { id: "live", label: "Live", href: "/c/live", icon: Radio, badge: { type: "live" }, featureColor: "live" },
  { id: "spaces", label: "Spaces", href: "/c/spaces", icon: Layers, featureColor: "social" },
  { id: "messages", label: "Messages", href: "/c/messages", icon: MessageSquare, badge: { type: "count", value: 4 }, featureColor: "growth" },
  { id: "missions", label: "Missions", href: "/c/missions", icon: Target, badge: { type: "new" }, featureColor: "social" },
  { id: "courses", label: "Courses", href: "/c/courses", icon: GraduationCap, featureColor: "events" },
  { id: "events", label: "Events", href: "/c/events", icon: Calendar, featureColor: "events" },
  { id: "wallet", label: "Wallet", href: "/c/wallet", icon: Wallet, featureColor: "growth" },
  { id: "analytics", label: "Analytics", href: "/c/analytics", icon: BarChart3, featureColor: "live" },
  { id: "dashboard", label: "Dashboard", href: "/c/dashboard", icon: BarChart3, featureColor: "live" },
  { id: "bookmarks", label: "Bookmarks", href: "/c/bookmarks", icon: Bookmark, featureColor: "growth" },
  { id: "profile", label: "My Profile", href: "/c/profile", icon: User, featureColor: "events" },
];

type CommunityRow = { id: string; name: string; slug: string; avatar_url?: string | null; unread?: boolean };

export type PrimarySidebarProps = {
  activeItem?: SidebarItem;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  user?: {
    name: string;
    avatarUrl?: string | null;
    level: number;
    role: string;
    verified?: boolean;
    xp: number;
    xpGoal: number;
  };
  className?: string;
  unreadNotifications?: number;
  // New props for hover-expand and notification drawer
  onNotificationOpen?: () => void;
  onProfileClick?: () => void;
};

export function resolveSidebarActiveItem(pathname: string): SidebarItem {
  if (pathname === "/c" || pathname === "/c/") return "feed";
  if (pathname.startsWith("/c/live")) return "live";
  if (pathname.startsWith("/c/messages")) return "messages";
  if (pathname.startsWith("/c/spaces")) return "spaces";
  if (pathname.startsWith("/c/missions")) return "missions";
  if (pathname.startsWith("/c/courses")) return "courses";
  if (pathname.startsWith("/c/events")) return "events";
  if (pathname.startsWith("/c/wallet")) return "wallet";
  if (pathname.startsWith("/c/analytics")) return "analytics";
  if (pathname.startsWith("/c/dashboard")) return "dashboard";
  if (pathname.startsWith("/c/bookmarks")) return "bookmarks";
  if (pathname.startsWith("/c/profile")) return "profile";
  if (pathname.startsWith("/communities")) return "explore";
  if (/^\/c\/[^/]+/.test(pathname)) return "feed";
  return "feed";
}

function NavBadge({ badge }: { badge: NonNullable<NavItem["badge"]> }) {
  if (badge.type === "count") {
    return (
      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white bg-[var(--color-accent)] leading-none">
        {badge.value}
      </span>
    );
  }
  if (badge.type === "new") {
    return (
      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold text-white bg-[var(--color-accent)] leading-none">
        New
      </span>
    );
  }
  return (
    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wider text-white bg-[var(--color-accent)] animate-pulse-glow leading-none">
      Live
    </span>
  );
}

export function PrimarySidebar({
  activeItem,
  collapsed = false,
  onToggleCollapse,
  user: userProp,
  className,
  onNotificationOpen,
  onProfileClick,
  unreadNotifications,
}: PrimarySidebarProps) {
  const pathname = usePathname();
  const resolvedActive = activeItem ?? resolveSidebarActiveItem(pathname);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [user, setUser] = useState(userProp);
  const [isHovered, setIsHovered] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
    actor?: { username: string; avatar_url: string | null };
  }>>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Effective collapsed state - true if collapsed and not hovered
  const effectiveCollapsed = collapsed && !isHovered;

  useEffect(() => {
    if (userProp) setUser(userProp);
  }, [userProp]);

  // Load notifications when drawer opens
  useEffect(() => {
    if (notificationsOpen && notifications.length === 0) {
      loadNotifications();
    }
  }, [notificationsOpen]);

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select(`
          id,
          type,
          title,
          message,
          created_at,
          is_read,
          actor:profiles!notifications_actor_id_fkey(username, avatar_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data as any);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === "message" || notification.type === "reply") {
      // Navigate to messages
    } else if (notification.type === "community_invite" || notification.type === "community_post") {
      // Navigate to community
    } else if (notification.type === "live_started") {
      // Navigate to live
    } else {
      // Default to feed
    }
    setNotificationsOpen(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || cancelled) return;

      if (!userProp) {
        const [profRes, pointsRes] = await Promise.all([
          supabase.from("profiles").select("full_name, username, avatar_url").eq("id", authUser.id).maybeSingle(),
          supabase.from("member_points").select("total_points, level").eq("user_id", authUser.id).maybeSingle(),
        ]);
        if (!cancelled && profRes.data) {
          const level = pointsRes.data?.level ?? 1;
          const xp = pointsRes.data?.total_points ?? 0;
          setUser({
            name: profRes.data.full_name ?? profRes.data.username ?? "Member",
            avatarUrl: profRes.data.avatar_url,
            level,
            role: "Creator",
            verified: true,
            xp: xp % 1000,
            xpGoal: 1000,
          });
        }
      }

      const { data } = await supabase
        .from("community_memberships")
        .select("communities!inner(id, name, slug, avatar_url, is_active)")
        .eq("user_id", authUser.id)
        .eq("status", "active")
        .eq("communities.is_active", true)
        .limit(20);

      if (cancelled) return;
      setCommunities(
        (data ?? [])
          .map((row: { communities: CommunityRow | null }) => row.communities)
          .filter(Boolean) as CommunityRow[]
      );
    }
    load();
    return () => { cancelled = true; };
  }, [userProp]);

  const profile = user ?? {
    name: "John Doe",
    level: 42,
    role: "Creator",
    verified: true,
    xp: 4250,
    xpGoal: 6000,
  };

  const xpPct = Math.round((profile.xp / profile.xpGoal) * 100);
  const xpRemaining = profile.xpGoal - profile.xp;

  function renderCollapsedItem(item: NavItem) {
    const active = item.id === resolvedActive;
    const noCollapsedBg = effectiveCollapsed && pathname.startsWith("/c/messages");
    return (
      <Link
        key={item.id}
        href={item.href}
        className="flex items-center justify-center rounded px-0 py-2 text-sm transition-all duration-200"
        title={item.label}
        style={{
          backgroundColor: active && !noCollapsedBg ? "var(--color-surface-secondary)" : "transparent",
          color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        }}
      >
        <div className="relative">
          <item.icon className="h-5 w-5 shrink-0" style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-muted)" }} />
          {item.badge?.type === "count" && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ring-2 ring-[var(--color-bg)] leading-none"
              style={{ backgroundColor: "var(--color-accent)" }}>
              {item.badge.value}
            </span>
          )}
          {item.badge?.type === "new" && (
            <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[32px] items-center justify-center rounded-full px-1.5 text-[8px] font-bold text-white ring-2 ring-[var(--color-bg)] leading-none"
              style={{ backgroundColor: "var(--color-accent)" }}>
              New
            </span>
          )}
          <SidebarBadgeDot show={item.badge?.type === "live"} />
        </div>
      </Link>
    );
  }

  function renderExpandedItem(item: NavItem, i: number) {
    const active = item.id === resolvedActive;
    return (
      <div key={item.id} className={cn("flex items-center gap-0", i === 0 && "relative")}>
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-2.5 rounded text-sm transition-all duration-200 flex-1 min-w-0",
            active ? "font-medium" : ""
          )}
          style={{
            backgroundColor: active ? "var(--color-surface-secondary)" : "transparent",
            color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            padding: "0.5rem 0.75rem",
          }}
        >
          <item.icon className="h-4 w-4 shrink-0" style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-muted)" }} />
          <span className="truncate">{item.label}</span>
          {item.badge && <NavBadge badge={item.badge} />}
        </Link>
      </div>
    );
  }

  return (
    <>
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col transition-all duration-220 ease-[cubic-bezier(.4,0,.2,1)] group/sidebar bg-[var(--color-bg)]",
        effectiveCollapsed ? "w-16" : "w-[250px]",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
<nav className={cn(effectiveCollapsed ? "px-2 pt-1" : "px-3 pt-1")}>
            {effectiveCollapsed && (
              <div className="flex justify-center mb-2 pt-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity h-0 overflow-hidden group-hover/sidebar:h-auto">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex items-center justify-center rounded-lg p-1.5 transition-colors text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </div>
            )}
            {NAV_ITEMS.map((item, i) => (
              effectiveCollapsed ? renderCollapsedItem(item) : renderExpandedItem(item, i)
            ))}

            {!effectiveCollapsed && (
              <div className="flex justify-center pt-3">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex items-center justify-center rounded p-1.5 transition-colors text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            )}
          </nav>

          {!effectiveCollapsed && (
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => setCommunitiesOpen((o) => !o)}
              className="mb-2 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              My Communities
              {communitiesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {communitiesOpen && (
              <div className="space-y-0.5 animate-in animate-fade-in">
                {(communities.length ? communities : []).map((c) => (
                  <Link
                    key={c.id}
                    href={`/c/${c.slug}`}
                    className="flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-all duration-200 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                  >
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name} className="h-7 w-7 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{c.name}</span>
                    {c.unread && <span className="ml-auto h-2 w-2 shrink-0 rounded-full animate-breathe" style={{ backgroundColor: "var(--color-accent)" }} />}
                  </Link>
                ))}
                {communities.length === 0 && (
                  <div className="px-3 py-2 text-center text-[11px] text-[var(--color-text-muted)]">
                    No communities yet
                  </div>
                )}
                <Link
                  href="/communities"
                  className="flex items-center gap-2.5 rounded px-3 py-2 text-xs transition-all duration-200 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
                    +
                  </span>
                  Discover communities
                </Link>
              </div>
            )}
          </div>
        )}

        {!effectiveCollapsed && (
          <div className="mx-3 mb-3 rounded-2xl p-4 text-white hover-lift"
            style={{
              background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 50%, var(--color-accent) 100%)",
              backgroundSize: "200% 200%",
              animation: "gradient-shift 4s ease infinite",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-semibold">Go Premium</span>
            </div>
            <ul className="mb-3 space-y-1 text-xs" style={{ color: "rgba(255,255,255,0.9)" }}>
              <li>• Unlimited live sessions</li>
              <li>• Advanced analytics</li>
              <li>• Priority support</li>
            </ul>
            <button
              type="button"
              className="w-full rounded-lg py-2 text-xs font-semibold transition-colors hover:opacity-90"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)" }}
            >
              Upgrade Now
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <div className="p-3">
          {effectiveCollapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative"
                title="Notifications"
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-[var(--color-accent)]/30" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))" }}>
                    {getInitials(profile.name)}
                  </span>
                )}
                {(unreadNotifications ?? 0) > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[8px] font-bold text-white leading-none">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-8 w-8 rounded-full object-cover ring-2 ring-[var(--color-accent)]/30" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))" }}>
                  {getInitials(profile.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{profile.name}</p>
                  {profile.verified && (
                    <svg className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <p className="text-[11px] truncate text-[var(--color-text-muted)]">Level {profile.level} {profile.role}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {(unreadNotifications ?? 0) > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[8px] font-bold text-white leading-none">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {!effectiveCollapsed && (
        <div className="shrink-0 p-3" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-muted)]">XP Progress</span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {profile.xp.toLocaleString()} / {profile.xpGoal.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${xpPct}%`, backgroundColor: "var(--color-accent)" }} />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">Next reward in {xpRemaining.toLocaleString()} XP</p>
        </div>
      )}
    </aside>
      {notificationsOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setNotificationsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[var(--color-bg)] shadow-xl animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg)] z-10">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Notifications</h2>
              <div className="flex items-center gap-2">
                {!loadingNotifications && notifications.some(n => !n.is_read) && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
                  aria-label="Close notifications"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4" ref={notificationsRef}>
              {loadingNotifications ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-text-muted)]">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "w-full p-3 rounded-xl text-left transition-colors border border-[var(--color-border)]",
                        !notification.is_read
                          ? "bg-[var(--color-accent)]/5 ring-1 ring-[var(--color-accent)]/20"
                          : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                          !notification.is_read 
                            ? "bg-[var(--color-accent)]/10" 
                            : "bg-[var(--color-surface-secondary)]"
                        )}>
                          {notification.actor?.avatar_url ? (
                            <img 
                              src={notification.actor.avatar_url} 
                              alt={notification.actor.username} 
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-[var(--color-text-muted)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "font-medium text-sm leading-snug",
                              !notification.is_read ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
                            )}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="flex-shrink-0 h-2 w-2 rounded-full animate-breathe bg-[var(--color-accent)]" />
                            )}
                          </div>
                          <p className={cn(
                            "mt-1 text-sm line-clamp-2",
                            !notification.is_read ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"
                          )}>
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

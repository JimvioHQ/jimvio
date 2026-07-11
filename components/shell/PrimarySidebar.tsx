"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bookmark,
  ChevronDown,
  ChevronUp,
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

export type SidebarItem =
  | "feed"
  | "explore"
  | "live"
  | "spaces"
  | "messages"
  | "missions"
  | "courses"
  | "events"
  | "wallet"
  | "analytics"
  | "bookmarks"
  | "profile";

type NavItem = {
  id: SidebarItem;
  label: string;
  href: string;
  icon: typeof Home;
  badge?: { type: "count" | "new" | "live"; value?: string | number };
  featureColor?: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "feed", label: "Feed", href: "/c", icon: Home, featureColor: "sage" },
  { id: "explore", label: "Explore", href: "/communities", icon: Compass, featureColor: "amber" },
  { id: "live", label: "Live", href: "/c/live", icon: Radio, badge: { type: "live" }, featureColor: "ocean" },
  { id: "spaces", label: "Spaces", href: "/c/spaces", icon: Layers, featureColor: "berry" },
  { id: "messages", label: "Messages", href: "/c/messages", icon: MessageSquare, badge: { type: "count", value: 4 }, featureColor: "sage" },
  { id: "missions", label: "Missions", href: "/c/missions", icon: Target, badge: { type: "new" }, featureColor: "berry" },
  { id: "courses", label: "Courses", href: "/c/courses", icon: GraduationCap, featureColor: "amber" },
  { id: "events", label: "Events", href: "/c/events", icon: Calendar, featureColor: "amber" },
  { id: "wallet", label: "Wallet", href: "/c/wallet", icon: Wallet, featureColor: "sage" },
  { id: "analytics", label: "Analytics", href: "/c/analytics", icon: BarChart3, featureColor: "ocean" },
  { id: "bookmarks", label: "Bookmarks", href: "/c/bookmarks", icon: Bookmark, featureColor: "sage" },
  { id: "profile", label: "My Profile", href: "/c/profile", icon: User, featureColor: "amber" },
];

type CommunityRow = { id: string; name: string; slug: string; unread?: boolean };

type PrimarySidebarProps = {
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
  if (pathname.startsWith("/c/bookmarks")) return "bookmarks";
  if (pathname.startsWith("/c/profile")) return "profile";
  if (pathname.startsWith("/communities")) return "explore";
  if (/^\/c\/[^/]+/.test(pathname)) return "feed";
  return "feed";
}

function NavBadge({ badge }: { badge: NonNullable<NavItem["badge"]> }) {
  if (badge.type === "count") {
    return (
      <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white bg-[var(--color-accent)]">
        {badge.value}
      </span>
    );
  }
  if (badge.type === "new") {
    return (
      <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white bg-[var(--color-accent)]">
        New
      </span>
    );
  }
  return (
    <span className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white bg-[var(--color-accent)] animate-pulse-glow">
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
}: PrimarySidebarProps) {
  const pathname = usePathname();
  const resolvedActive = activeItem ?? resolveSidebarActiveItem(pathname);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [user, setUser] = useState(userProp);

  useEffect(() => {
    if (userProp) setUser(userProp);
  }, [userProp]);

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

  return (
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col transition-all duration-220 ease-[cubic-bezier(.4,0,.2,1)] group/sidebar bg-[var(--color-bg)] border-r border-[var(--color-border)]",
          collapsed ? "w-16" : "w-[250px]",
          className
        )}
      >
        {/* ── Scrollable area ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <nav className={cn(collapsed ? "px-2 pt-1" : "px-3 pt-1")}>
            {collapsed && (
              <div className="flex justify-center mb-3 pt-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
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
            {NAV_ITEMS.map((item, i) => {
              const active = item.id === resolvedActive;
              const Icon = item.icon;
              const featureColor = item.featureColor ? `var(--color-${item.featureColor})` : undefined;
              return collapsed ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center rounded-lg px-0 py-2 text-sm transition-all duration-200",
                    active ? "font-medium" : ""
                  )}
                  title={item.label}
                  style={{
                    backgroundColor: active ? featureColor : "transparent",
                    color: active ? "white" : "var(--color-text-secondary)",
                  }}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5 shrink-0" style={{ color: active ? "white" : "var(--color-text-muted)" }} />
                    {item.badge?.type === "live" && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full animate-breathe" style={{ backgroundColor: "var(--color-accent)" }} />
                    )}
                    {item.badge?.type === "count" && (
                      <span className="absolute -right-1 -top-1 h-4 min-w-[14px] flex items-center justify-center rounded-full px-1 text-[8px] font-black text-white" style={{ backgroundColor: "var(--color-accent)" }}>
                        {item.badge.value}
                      </span>
                    )}
                    {item.badge?.type === "new" && (
                      <span className="absolute -right-1 -top-1 h-4 min-w-[18px] flex items-center justify-center rounded-full px-1 text-[8px] font-black text-white" style={{ backgroundColor: "var(--color-accent)" }}>
                        New
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <div key={item.id} className={cn("flex items-center gap-0", i === 0 && "relative")}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg text-sm transition-all duration-200 flex-1 min-w-0 hover-lift",
                      active ? "font-medium" : ""
                    )}
                    style={{
                      backgroundColor: active ? featureColor : "transparent",
                      color: active ? "white" : "var(--color-text-secondary)",
                      padding: "0.5rem 0.75rem",
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "white" : "var(--color-text-muted)" }} />
                    <span className="truncate">{item.label}</span>
                    {item.badge && <NavBadge badge={item.badge} />}
                  </Link>
                  {i === 0 && (
                    <button
                      type="button"
                      onClick={onToggleCollapse}
                      className="flex items-center justify-center rounded-lg p-1.5 transition-colors shrink-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                      title="Collapse sidebar"
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </nav>

          {/* ── Communities (expanded only) ── */}
          {!collapsed && (
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
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 hover-lift text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
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
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-200 hover-lift text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
                      +
                    </span>
                    Discover communities
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ── Premium upsell (expanded only) ── */}
          {!collapsed && (
            <div className="mx-3 mb-3 rounded-2xl p-4 text-white hover-lift"
              style={{
                background: "linear-gradient(135deg, var(--color-berry) 0%, var(--color-berry) 50%, var(--color-amber) 100%)",
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
                className="w-full rounded-lg bg-white py-2 text-xs font-semibold transition-colors hover:opacity-90"
                style={{ color: "var(--color-berry)" }}
              >
                Upgrade Now
              </button>
            </div>
          )}
        </div>

        {/* ── Profile section ── */}
        <div className="shrink-0">
          <div className={cn(collapsed ? "p-3" : "p-3")}>
            {collapsed ? (
              <div className="flex justify-center">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-[var(--color-accent)]/30" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))" }}>
                    {getInitials(profile.name)}
                  </span>
                )}
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
              </div>
            )}
          </div>
        </div>

        {/* ── Footer: XP bar (expanded only) ── */}
        {!collapsed && (
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
  );
}
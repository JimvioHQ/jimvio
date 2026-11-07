"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Compass,
  Crown,
  Bell,
  GraduationCap,
  Home,
  Layers,
  MessageSquare,
  Plus,
  Radio,
  Settings2,
  Target,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, getInitials } from "@/lib/utils";
import { useFeedHubSnapshot, useFeedUser } from "@/lib/feed/use-feed-user";
import { fetchPinsShared } from "@/lib/community/pins-client";
import { manageCommunityHref } from "@/lib/community/owner-console/nav";

export type SidebarItem =
  | "feed"
  | "explore"
  | "live"
  | "messages"
  | "groups"
  | "channels"
  | "missions"
  | "courses"
  | "events"
  | "leaderboard"
  | "notifications"
  | "profile"
  | "wallet"
  | "settings";

type NavItem = {
  id: SidebarItem;
  label: string;
  href: string;
  icon: typeof Home;
  badge?: { type: "count" | "new" | "live"; value?: string | number };
};

const NAV_ITEMS: NavItem[] = [
  { id: "feed", label: "Feed", href: "/communities", icon: Home },
  { id: "explore", label: "Explore", href: "/communities/explore", icon: Compass },
  { id: "live", label: "Live", href: "/communities/live", icon: Radio, badge: { type: "live" } },
  { id: "messages", label: "Messages", href: "/communities/messages", icon: MessageSquare },
  { id: "groups", label: "Spaces", href: "/communities/spaces", icon: Layers },
  { id: "missions", label: "Missions", href: "/communities/missions", icon: Target },
  { id: "courses", label: "Courses", href: "/communities/courses", icon: GraduationCap },
  { id: "events", label: "Events", href: "/communities/events", icon: Calendar },
  { id: "leaderboard", label: "Leaderboard", href: "/communities/leaderboard", icon: Crown },
  { id: "notifications", label: "Notifications", href: "/communities/notifications", icon: Bell },
  { id: "wallet", label: "Wallet", href: "/wallet", icon: Wallet },
];

const GUEST_PROFILE = {
  name: "Guest",
  avatarUrl: null as string | null,
  level: 0,
  role: "",
  verified: false,
  xp: 0,
  xpGoal: 1,
};

type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string | null;
  unread?: boolean;
};

type PrimarySidebarProps = {
  activeItem?: SidebarItem;
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
  if (pathname === "/communities" || pathname === "/communities/") return "feed";
  if (pathname.startsWith("/communities/explore")) return "explore";
  if (pathname.startsWith("/communities/live")) return "live";
  if (pathname.startsWith("/communities/messages")) return "messages";
  if (pathname.startsWith("/communities/channels")) return "groups";
  if (pathname.startsWith("/communities/spaces")) return "groups";
  if (pathname.startsWith("/communities/missions")) return "missions";
  if (pathname.startsWith("/communities/courses")) return "courses";
  if (pathname.startsWith("/communities/events")) return "events";
  if (pathname.startsWith("/communities/leaderboard")) return "leaderboard";
  if (pathname.startsWith("/communities/notifications")) return "notifications";
  if (pathname.startsWith("/communities/profile") || pathname.startsWith("/identity") || pathname.startsWith("/u/")) {
    return "profile";
  }
  if (pathname === "/wallet" || pathname.startsWith("/wallet/")) return "wallet";
  if (pathname.startsWith("/communities/settings")) return "settings";
  return "feed";
}

function NavBadge({ badge }: { badge: NonNullable<NavItem["badge"]> }) {
  if (badge.type === "count") {
    return (
      <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {badge.value}
      </span>
    );
  }
  if (badge.type === "new") {
    return (
      <span className="ml-auto rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        New
      </span>
    );
  }
  return (
    <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
      Live
    </span>
  );
}

export function PrimarySidebar({ activeItem, user: userProp, className }: PrimarySidebarProps) {
  const pathname = usePathname();
  const { user: feedUser, isAuthenticated, isLoading: authLoading } = useFeedUser();
  const resolvedActive = activeItem ?? resolveSidebarActiveItem(pathname);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const hubSnapshot = useFeedHubSnapshot();
  const initialUserIdRef = useRef<string | null>(feedUser?.id ?? null);
  const [communities, setCommunities] = useState<CommunityRow[]>(() => hubSnapshot?.joined ?? []);
  const [pinned, setPinned] = useState<CommunityRow[]>([]);
  /** Server-verified manage target; null → "Create Community". */
  const [manage, setManage] = useState<{ slug: string; name: string } | null>(
    () => hubSnapshot?.manage ?? null,
  );
  const [communitiesLoading, setCommunitiesLoading] = useState(() => !hubSnapshot);
  const [communitiesError, setCommunitiesError] = useState(false);
  const [user, setUser] = useState(userProp ?? null);
  const lastGoodCommunitiesRef = useRef<CommunityRow[]>(hubSnapshot?.joined ?? []);

  useEffect(() => {
    if (userProp) {
      setUser(userProp);
      return;
    }
    if (feedUser) {
      setUser({
        name: feedUser.fullName ?? feedUser.displayName,
        avatarUrl: feedUser.avatarUrl,
        level: hubSnapshot?.level ?? 1,
        role: "Member",
        verified: false,
        xp: hubSnapshot?.xp ?? 0,
        xpGoal: 1000,
      });
      return;
    }
    if (!authLoading && !isAuthenticated) setUser(null);
  }, [userProp, feedUser, isAuthenticated, authLoading, hubSnapshot]);

  useEffect(() => {
    let cancelled = false;

    async function loadPins() {
      const pinJson = await fetchPinsShared();
      if (cancelled || !pinJson) return;
      const pinsMapped: CommunityRow[] = [];
      for (const pin of (pinJson.pins ?? []) as Array<{ community?: CommunityRow | null }>) {
        const c = pin.community;
        if (c?.id && c?.slug && c?.name) {
          pinsMapped.push({ id: c.id, name: c.name, slug: c.slug, avatar_url: c.avatar_url ?? null });
        }
      }
      setPinned(pinsMapped);
    }

    async function load() {
      // Wait for auth hydration — never treat "still loading" as signed-out empty.
      if (authLoading && !userProp && !feedUser?.id) {
        if (lastGoodCommunitiesRef.current.length === 0) {
          setCommunitiesLoading(true);
        }
        return;
      }

      if (!isAuthenticated && !userProp && !feedUser?.id) {
        lastGoodCommunitiesRef.current = [];
        setCommunities([]);
        setPinned([]);
        setManage(null);
        setCommunitiesLoading(false);
        setCommunitiesError(false);
        return;
      }

      // Server snapshot (hub layout): communities, manage access and level are
      // already known — only pins are fetched, no Supabase round trips.
      if (hubSnapshot && (!feedUser?.id || feedUser.id === initialUserIdRef.current)) {
        void loadPins();
        return;
      }

      // Fallback (no server snapshot): one auth read, then everything in parallel.
      if (lastGoodCommunitiesRef.current.length === 0) {
        setCommunitiesLoading(true);
      }
      setCommunitiesError(false);
      const supabase = createClient();
      const authUserId =
        feedUser?.id ?? (await supabase.auth.getUser()).data.user?.id ?? null;
      if (!authUserId || cancelled) {
        if (!cancelled && lastGoodCommunitiesRef.current.length === 0) {
          setCommunitiesLoading(true);
        }
        return;
      }

      const [profRes, pointsRes, joinedRes, ownedRes] = await Promise.all([
        userProp
          ? Promise.resolve({ data: null })
          : supabase.from("profiles").select("full_name, username, avatar_url").eq("id", authUserId).maybeSingle(),
        userProp
          ? Promise.resolve({ data: null })
          : supabase.from("member_points").select("total_points, level").eq("user_id", authUserId).order("total_points", { ascending: false }).limit(1).maybeSingle(),
        supabase
          .from("community_memberships")
          .select("communities!inner(id, name, slug, avatar_url, is_active)")
          .eq("user_id", authUserId)
          .eq("status", "active")
          .eq("communities.is_active", true)
          .limit(20),
        supabase
          .from("communities")
          .select("id, name, slug, avatar_url")
          .eq("owner_id", authUserId)
          .eq("is_active", true)
          .order("name")
          .limit(8),
        loadPins(),
      ]);
      if (cancelled) return;

      const prof = profRes.data as { full_name: string | null; username: string | null; avatar_url: string | null } | null;
      if (prof) {
        const points = pointsRes.data as { level?: number | null; total_points?: number | null } | null;
        setUser({
          name: prof.full_name ?? prof.username ?? "Member",
          avatarUrl: prof.avatar_url,
          level: points?.level ?? 1,
          role: "Member",
          verified: true,
          xp: (points?.total_points ?? 0) % 1000,
          xpGoal: 1000,
        });

        // Prefer the user's chosen professional identity when available.
        void supabase
          .from("jip_identity")
          .select("industries")
          .eq("user_id", authUserId)
          .maybeSingle()
          .then(({ data: identity }) => {
            if (cancelled) return;
            const industries = (identity?.industries as string[] | null) ?? [];
            const label = industries[0]?.trim();
            if (!label) return;
            setUser((prev) => (prev ? { ...prev, role: label } : prev));
          });
      }

      if (joinedRes.error) {
        setCommunitiesError(true);
        setCommunitiesLoading(false);
        return;
      }

      const mapped: CommunityRow[] = [];
      for (const row of joinedRes.data ?? []) {
        const raw = (row as { communities: CommunityRow | CommunityRow[] | null }).communities;
        const c = Array.isArray(raw) ? raw[0] : raw;
        if (c?.id && c?.slug && c?.name) {
          mapped.push({ id: c.id, name: c.name, slug: c.slug, avatar_url: c.avatar_url ?? null });
        }
      }
      lastGoodCommunitiesRef.current = mapped;
      setCommunities(mapped);
      setCommunitiesError(false);
      const owned = (ownedRes.data ?? []) as { slug: string; name: string }[];
      setManage(owned[0] ? { slug: owned[0].slug, name: owned[0].name } : null);
      setCommunitiesLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [userProp, isAuthenticated, feedUser?.id, authLoading, hubSnapshot]);

  const profile = user ?? GUEST_PROFILE;
  const isGuest = !authLoading && !isAuthenticated && !userProp;

  return (
    <aside className={cn("flex h-full w-[240px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]", className)}>
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-[var(--color-border)] p-4">
          <Link
            href={isGuest ? "/login?next=/communities" : "/identity"}
            className="flex items-center gap-3 rounded-lg transition hover:bg-[var(--color-surface-secondary)]"
            aria-label={isGuest ? "Sign in" : "Open Jimvio Identity"}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-400 text-sm font-semibold text-white">
                {getInitials(profile.name)}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="truncate text-sm font-semibold text-gray-900">{profile.name}</p>
                {profile.verified && (
                  <svg className="h-3.5 w-3.5 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {isGuest
                  ? "Sign in to continue"
                  : profile.role && profile.role !== "Member"
                    ? profile.role
                    : profile.level > 1
                      ? `Level ${profile.level}`
                      : "Member"}
              </p>
            </div>
          </Link>
          {manage ? (
            <Link
              href={manageCommunityHref(manage.slug)}
              className="mt-3 flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-600 transition hover:bg-orange-100"
              aria-label={`Manage ${manage.name}`}
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden />
              Manage Community
            </Link>
          ) : !communitiesLoading || isGuest ? (
            <Link
              href={isGuest ? "/login?next=/communities/create" : "/communities/create"}
              className="mt-3 flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[#fd5000] px-3 text-xs font-semibold text-white transition hover:bg-[#e64800]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Create Community
            </Link>
          ) : (
            <span className="mt-3 block h-9 animate-pulse rounded-lg bg-gray-100" aria-hidden />
          )}
        </div>

        <nav className="space-y-0.5 p-3">
          {NAV_ITEMS.map((item) => {
            const active = item.id === resolvedActive;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-orange-50 font-medium text-orange-500" : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-orange-500" : "text-gray-500")} />
                <span className="truncate">{item.label}</span>
                {item.badge && <NavBadge badge={item.badge} />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => setCommunitiesOpen((o) => !o)}
            className="mb-2 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
          >
            My Communities
            {communitiesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {communitiesOpen && (
            <div className="space-y-0.5">
              {pinned.length > 0 ? (
                <>
                  <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-orange-400">
                    Pinned
                  </p>
                  {pinned.map((c) => (
                    <Link
                      key={`pin-${c.id}`}
                      href={`/communities/${c.slug}`}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[10px] font-semibold text-orange-600">
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">{c.name}</span>
                    </Link>
                  ))}
                  <div className="mx-3 my-1.5 border-t border-gray-100" />
                </>
              ) : null}
              {communitiesLoading && communities.length === 0 ? (
                <div className="space-y-2 px-3 py-1" aria-busy="true" aria-label="Loading communities">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="h-7 w-7 animate-pulse rounded-lg bg-gray-100" />
                      <span className="h-3 flex-1 animate-pulse rounded bg-gray-100" />
                    </div>
                  ))}
                </div>
              ) : communities.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-gray-400">
                  {communitiesError
                    ? "Couldn't load communities. Try again."
                    : "No communities joined yet"}
                </p>
              ) : (
                communities.map((c) => (
                  <Link
                    key={c.id}
                    href={`/communities/${c.slug}`}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {c.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-semibold text-gray-600">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{c.name}</span>
                    {c.unread ? (
                      <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                    ) : null}
                  </Link>
                ))
              )}
              <Link
                href="/communities/explore"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-gray-500 transition-colors hover:text-gray-700"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400">
                  +
                </span>
                Discover communities
              </Link>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
}

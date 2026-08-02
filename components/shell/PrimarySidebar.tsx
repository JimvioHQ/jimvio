"use client";

import { useEffect, useState } from "react";
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
  Radio,
  Target,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, getInitials } from "@/lib/utils";

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
  { id: "wallet", label: "Wallet", href: "/communities/wallet", icon: Wallet },
];

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
  if (pathname.startsWith("/communities/wallet")) return "wallet";
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
  const resolvedActive = activeItem ?? resolveSidebarActiveItem(pathname);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [pinned, setPinned] = useState<CommunityRow[]>([]);
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
          supabase.from("member_points").select("total_points, level").eq("user_id", authUser.id).order("total_points", { ascending: false }).limit(1).maybeSingle(),
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
      const mapped: CommunityRow[] = [];
      for (const row of data ?? []) {
        const raw = (row as { communities: CommunityRow | CommunityRow[] | null })
          .communities;
        const c = Array.isArray(raw) ? raw[0] : raw;
        if (c?.id && c?.slug && c?.name) {
          mapped.push({
            id: c.id,
            name: c.name,
            slug: c.slug,
            avatar_url: c.avatar_url ?? null,
          });
        }
      }
      setCommunities(mapped);

      try {
        const pinRes = await fetch("/api/c/pins", { cache: "no-store" });
        if (pinRes.ok && !cancelled) {
          const pinJson = await pinRes.json();
          const pinsMapped: CommunityRow[] = [];
          for (const pin of pinJson.pins ?? []) {
            const c = pin.community;
            if (c?.id && c?.slug && c?.name) {
              pinsMapped.push({
                id: c.id,
                name: c.name,
                slug: c.slug,
                avatar_url: c.avatar_url ?? null,
              });
            }
          }
          setPinned(pinsMapped);
        }
      } catch {
        /* optional */
      }
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

  return (
    <aside className={cn("flex h-full w-[240px] shrink-0 flex-col border-r border-gray-200 bg-white", className)}>
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 p-4">
          <Link
            href="/identity"
            className="flex items-center gap-3 rounded-lg transition hover:bg-gray-50"
            aria-label="Open Jimvio Identity"
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
                Level {profile.level} {profile.role}
              </p>
            </div>
          </Link>
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
              {communities.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-gray-400">
                  No communities joined yet
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

        <div className="mx-3 mb-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white">
          <div className="mb-2 flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <span className="text-sm font-semibold">Go Premium</span>
          </div>
          <ul className="mb-3 space-y-1 text-xs text-orange-100">
            <li>• Unlimited live sessions</li>
            <li>• Advanced analytics</li>
            <li>• Priority support</li>
          </ul>
          <button
            type="button"
            className="w-full rounded-lg bg-white py-2 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </aside>
  );
}

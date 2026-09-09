"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Sparkles,
    Menu,
    Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import HubPrimarySidebar from "@/components/shell/HubPrimarySidebar";
import { CommunitySidebar } from "@/components/shell/CommunitySidebar";
import { AppTopNav } from "@/components/shell/AppTopNav";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { cn } from "@/lib/utils";
import type { Profile as DbProfile } from "@/types/db";
import { buildHubLoginUrl, getCommunitySlugFromPath, isHubAuthRequired } from "@/lib/community/hub-auth";
import { CommunityAiPanel } from "@/components/community/hub/CommunityAiPanel";
import { OPEN_HUB_SEARCH_EVENT } from "@/lib/community/hub-search-event";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import { useFeedUser } from "@/lib/feed/use-feed-user";
import {
  MobilePrimaryBottomNav,
  MOBILE_PRIMARY_BOTTOM_NAV_PAD,
} from "@/components/layout/mobile-primary-bottom-nav";

type Profile = Pick<DbProfile, "id" | "username" | "full_name" | "avatar_url">;

// ── Page title hook (mobile header) ───────────────────────────────────────────
function usePageTitle(pathname: string): string {
    const [communityName, setCommunityName] = useState<string | null>(null);

    let staticTitle = "";
    if (pathname === "/communities") staticTitle = "Feed";
    else if (pathname.startsWith("/communities/messages")) staticTitle = "Messages";
    else if (pathname.startsWith("/communities/bookmarks")) staticTitle = "Bookmarks";
    else if (pathname.startsWith("/communities/live")) staticTitle = "Live";
    else if (pathname.startsWith("/communities/channels")) staticTitle = "Spaces";
    else if (pathname.startsWith("/communities/spaces")) staticTitle = "Spaces";
    else if (pathname.startsWith("/communities/wallet")) staticTitle = "Wallet";
    else if (pathname.startsWith("/communities/analytics")) staticTitle = "Analytics";
    else if (pathname.startsWith("/communities/missions")) staticTitle = "Missions";
    else if (pathname.startsWith("/communities/courses")) staticTitle = "Courses";
    else if (pathname.startsWith("/communities/events")) staticTitle = "Events";
    else if (pathname.startsWith("/communities/my-communities")) staticTitle = "My Communities";
    else if (pathname.startsWith("/communities/u/")) {
        const parts = pathname.split("/");
        const username = parts[3];
        if (parts[4] === "edit") staticTitle = "Edit Profile";
        else if (username) staticTitle = `@${username}`;
        else staticTitle = "Profile";
    }

    const slug = getCommunitySlugFromPath(pathname);

    useEffect(() => {
        if (!slug) { setCommunityName(null); return; }
        let cancelled = false;
        (async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("communities")
                .select("name")
                .eq("slug", slug)
                .maybeSingle();
            if (!cancelled) setCommunityName(data?.name ?? null);
        })();
        return () => { cancelled = true; };
    }, [slug]);

    if (slug) return communityName ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return staticTitle;
}

function useCommunityIdFromPath(pathname: string): string | null {
    const slug = getCommunitySlugFromPath(pathname);
    const [communityId, setCommunityId] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) {
            setCommunityId(null);
            return;
        }
        let cancelled = false;
        (async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("communities")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();
            if (!cancelled) setCommunityId(data?.id ?? null);
        })();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    return communityId;
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function HubLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const { user: feedUser, isAuthenticated, isLoading: authLoading } = useFeedUser();
    const [myCommunityHome, setMyCommunityHome] = useState<{
      href: string;
      label: string;
    } | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [aiOpen, setAiOpen] = useState(false);
    const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);

    const pageTitle = usePageTitle(pathname);
    const communitySlug = getCommunitySlugFromPath(pathname);
    const communityId = useCommunityIdFromPath(pathname);
    const isCommunityWorkspace = Boolean(communitySlug);
    const isLiveStudio =
      pathname.startsWith("/communities/live") ||
      /\/communities\/[^/]+\/live(?:\/|$)/.test(pathname);
    const { refreshCounts } = useCartStore();
    const { openAssistant } = useAIStore();

    // Close mobile nav on route change
    useEffect(() => { setMobileNavOpen(false); }, [pathname]);

    // Hub Search actions open the unified global Command+K experience
    useEffect(() => {
        const onOpenSearch = () => openCommandCenter();
        window.addEventListener(OPEN_HUB_SEARCH_EVENT, onOpenSearch);
        return () => window.removeEventListener(OPEN_HUB_SEARCH_EVENT, onOpenSearch);
    }, [openCommandCenter]);

    // Close mobile nav when returning to desktop width
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)");
        const closeOnDesktop = () => { if (mq.matches) setMobileNavOpen(false); };
        closeOnDesktop();
        mq.addEventListener("change", closeOnDesktop);
        return () => mq.removeEventListener("change", closeOnDesktop);
    }, []);

    useEffect(() => {
        if (feedUser) {
            setProfile({
                id: feedUser.id,
                username: feedUser.username,
                full_name: feedUser.fullName,
                avatar_url: feedUser.avatarUrl,
            });
            return;
        }
        if (!isAuthenticated) setProfile(null);
    }, [feedUser, isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) {
            setMyCommunityHome(null);
            return;
        }
        let cancelled = false;
        void fetch("/api/c/me/community-home")
            .then(async (res) => {
                if (!res.ok) return null;
                return (await res.json()) as { href?: string; label?: string };
            })
            .then((data) => {
                if (cancelled || !data?.href) return;
                setMyCommunityHome({
                    href: data.href,
                    label: data.label || "My Community",
                });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, feedUser?.id]);

    useEffect(() => {
        let cancelled = false;
        const supabase = createClient();
        const userId = feedUser?.id;
        if (!userId) {
            setUnreadMessages(0);
            setUnreadNotifications(0);
            refreshCounts();
            return;
        }

        async function load() {
            const [notifResult, msgResult] = await Promise.all([
                supabase
                    .from("notifications")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("is_read", false),
                supabase
                    .from("notifications")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("type", "message")
                    .eq("is_read", false),
            ]);

            if (cancelled) return;
            setUnreadNotifications(notifResult.count ?? 0);
            setUnreadMessages(msgResult.count ?? 0);
        }

        let channel: ReturnType<typeof supabase.channel> | null = null;
        void load();
        channel = supabase
            .channel(`hub-notifications-${userId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
                () => { void load(); }
            )
            .subscribe();

        refreshCounts();

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [feedUser?.id, refreshCounts]);

    useEffect(() => {
        if (authLoading) return;
        if (isAuthenticated) return;
        if (isHubAuthRequired(pathname)) {
            router.replace(buildHubLoginUrl(pathname));
        }
    }, [authLoading, isAuthenticated, pathname, router]);

    const profileHref = profile?.username ? `/communities/profile/${profile.username}` : "/communities/profile";
    const loginHref = buildHubLoginUrl(pathname);
    const navUser =
        isAuthenticated && profile
            ? {
                  name: profile.full_name || profile.username || "Account",
                  avatarUrl: profile.avatar_url,
              }
            : isAuthenticated && feedUser
              ? {
                    name: feedUser.fullName || feedUser.username || "Account",
                    avatarUrl: feedUser.avatarUrl,
                }
              : undefined;

    // Live Studio is a full-bleed workspace — do not mount hub chrome
    // (header/sidebars/cart). Errors in that chrome were escaping to
    // Next.js DefaultGlobalError ("This page couldn't load").
    if (isLiveStudio) {
        return (
            <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
                {children}
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg,#f4f4f5)] text-[var(--color-text-primary,#18181b)]">

            {/* Shared product header — same AppTopNav as UGC / Affiliates */}
            <AppTopNav
                activeNav="Communities"
                createContext="communities"
                user={navUser}
                notificationCount={unreadNotifications}
                messageCount={unreadMessages}
                signInHref={isAuthenticated === false ? loginHref : undefined}
                extraAccountItems={
                    isAuthenticated
                        ? [
                              {
                                  label: myCommunityHome?.label ?? "My Community",
                                  href: myCommunityHome?.href ?? profileHref,
                                  icon: Users,
                              },
                          ]
                        : undefined
                }
                leadingAction={
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen((o) => !o)}
                        aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={mobileNavOpen}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 lg:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                }
                extraActions={
                    <button
                        type="button"
                        onClick={() => {
                            if (pathname.startsWith("/communities")) setAiOpen(true);
                            else openAssistant();
                        }}
                        aria-label="AI assistant"
                        className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-[#fd5000] transition-colors hover:bg-[#fd5000]/10 sm:grid"
                    >
                        <Sparkles className="h-[18px] w-[18px]" />
                    </button>
                }
            />

            {/* ── Body row: sidebar + content ── */}
            <div className="flex min-h-0 flex-1">
                {!isLiveStudio && !isCommunityWorkspace && (
                    <Suspense fallback={null}>
                        <HubPrimarySidebar
                            collapsed={collapsed}
                            onToggleCollapse={() => setCollapsed((c) => !c)}
                            username={profile?.username ?? ""}
                            unreadMessages={unreadMessages}
                            mobileOpen={mobileNavOpen}
                            onMobileClose={() => setMobileNavOpen(false)}
                        />
                    </Suspense>
                )}

                {!isLiveStudio && isCommunityWorkspace && communitySlug && (
                    <Suspense fallback={null}>
                        <CommunitySidebar
                            slug={communitySlug}
                            communityName={pageTitle}
                            mobileOpen={mobileNavOpen}
                            onMobileClose={() => setMobileNavOpen(false)}
                        />
                    </Suspense>
                )}

                {/* Mobile overlay backdrop (hub mode only — community drawer owns its backdrop) */}
                {!isLiveStudio && !isCommunityWorkspace && (
                    <div
                        className={cn(
                            "fixed inset-0 z-[98] bg-black/50 transition-opacity duration-200 motion-reduce:transition-none lg:hidden",
                            mobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                        )}
                        onClick={() => setMobileNavOpen(false)}
                        aria-hidden={!mobileNavOpen}
                    />
                )}

                {/* Page content */}
                <main className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide", isLiveStudio && "bg-[var(--color-bg)]")}>
                    {/* Mobile page title bar */}
                    {!isLiveStudio && (
                        <div className="flex min-h-10 items-center border-b border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] px-4 py-1 lg:hidden">
                            {isCommunityWorkspace && communitySlug ? (
                                <div className="flex w-full items-center gap-2">
                                    <Link
                                        href="/communities"
                                        className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1 text-[13px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Communities
                                    </Link>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14px] font-bold leading-tight text-[var(--color-text-primary)]">
                                            {pageTitle}
                                        </p>
                                        <p className="truncate text-[12px] font-semibold text-[var(--color-text-muted)]">
                                            {pathname.includes("/spaces")
                                                ? "Spaces"
                                                : pathname.includes("/courses")
                                                  ? "Courses"
                                                  : pathname.includes("/feed")
                                                    ? "Feeds"
                                                    : "Overview"}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="min-w-0">
                                    <p className="text-[12px] font-semibold text-[var(--color-text-muted)]">
                                        Communities
                                    </p>
                                    <h1 className="min-w-0 break-words text-[14px] font-bold leading-tight text-[var(--color-text-primary)]">
                                        {pageTitle || "Feed"}
                                    </h1>
                                </div>
                            )}
                        </div>
                    )}
                    <div
                        className={cn(
                            "flex min-h-0 flex-1 flex-col",
                            !isLiveStudio && !isCommunityWorkspace && MOBILE_PRIMARY_BOTTOM_NAV_PAD,
                        )}
                    >
                        {children}
                    </div>
                </main>
            </div>

            {/* Primary mobile bottom nav — layout-stable, not gated on feed/auth/API */}
            {!isLiveStudio && !isCommunityWorkspace && (
                <MobilePrimaryBottomNav isAuthenticated={isAuthenticated} />
            )}

            <CommunityAiPanel
                open={aiOpen}
                onClose={() => setAiOpen(false)}
                communityId={communityId}
            />
        </div>
    );
}

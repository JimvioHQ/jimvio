"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    ChevronDown,
    Search,
    Bell,
    ShoppingCart,
    Sparkles,
    Menu,
    Users,
    Package,
    Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import HubPrimarySidebar from "@/components/shell/HubPrimarySidebar";
import { CommunitySidebar } from "@/components/shell/CommunitySidebar";
import { CreateMenuDropdown } from "@/components/feed/CreateQuickLaunch";
import JimvioLogo from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { cn } from "@/lib/utils";
import type { Profile as DbProfile } from "@/types/db";
import { buildHubLoginUrl, getCommunitySlugFromPath, isHubAuthRequired } from "@/lib/community/hub-auth";
import {
  isCommunitiesNavActive,
  isOrdersActive,
  isPrimaryNavActive,
  isWalletActive,
  PRIMARY_NAV_ITEMS,
  resolvePrimaryNavHref,
} from "@/lib/navigation/primary-nav";
import { ProfileAccountMenu } from "@/components/shell/ProfileAccountMenu";
import { CommunityAiPanel } from "@/components/community/hub/CommunityAiPanel";
import { OPEN_HUB_SEARCH_EVENT } from "@/lib/community/hub-search-event";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import { useFeedUser } from "@/lib/feed/use-feed-user";
import {
  MobilePrimaryBottomNav,
  MOBILE_PRIMARY_BOTTOM_NAV_PAD,
} from "@/components/layout/mobile-primary-bottom-nav";

type Profile = Pick<DbProfile, "id" | "username" | "full_name" | "avatar_url">;

// ── Primary navigation (shared design system) ────────────────────────────────

// ── User avatar ───────────────────────────────────────────────────────────────
function UserAvatar({ profile, size = 32 }: { profile: Profile | null; size?: number }) {
    if (profile?.avatar_url) {
        return (
            <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "Profile"}
                className="rounded-full object-cover"
                style={{ width: size, height: size }}
            />
        );
    }
    const display = profile?.full_name ?? profile?.username ?? "?";
    const initials =
        display
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?";
    return (
        <span
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fd5000] to-[#ff7a30] font-bold text-white"
            style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
            {initials}
        </span>
    );
}

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
    const { cartCount, refreshCounts } = useCartStore();
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

            {/* ── Main header (full width, above sidebar) ── */}
            <header className="z-30 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1.5 border-b border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] px-2.5 sm:gap-x-3 sm:px-6 supports-[padding:max(0px)]:pt-[max(0px,env(safe-area-inset-top))]">
                {/* Mobile hamburger */}
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen((o) => !o)}
                        aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={mobileNavOpen}
                    className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 lg:hidden"
                    >
                    <Menu className="h-5 w-5" />
                    </button>

                {/* Logo — icon-only on narrow screens to avoid truncation */}
                <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="Jimvio home">
                    {/* Mobile: replace logo icon with compact brand text */}
                    <span className="sm:hidden inline-flex items-center text-[16px] font-black tracking-tight text-[#fd5000]">
                        Jimvio
                    </span>
                    <JimvioLogo
                        href={undefined}
                        size="md"
                        presentation="header"
                        variant="full"
                        className="hidden min-w-0 sm:flex"
                    />
                </Link>

                {/* Primary nav (desktop) — breathing room from logo */}
                <nav className="hidden min-w-0 items-center justify-center gap-3 overflow-hidden pl-4 min-[1060px]:flex min-[1060px]:flex-nowrap xl:gap-4 xl:pl-6">
                    {PRIMARY_NAV_ITEMS.map((item) => {
                        const { label, icon: Icon, dropdown } = item;
                        const href = resolvePrimaryNavHref(item, isAuthenticated);
                        const active =
                            item.label === "Communities"
                                ? isCommunitiesNavActive(pathname)
                                : isPrimaryNavActive(pathname, item, undefined, isAuthenticated);
                        return (
                    <Link
                                key={`${label}-${href}`}
                                href={href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40",
                                    active
                                        ? "bg-[#fd5000]/10 text-[#fd5000]"
                                        : "text-[var(--color-text-secondary,#52525b)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0 text-[#fd5000]" />
                                <span className="whitespace-nowrap">{label}</span>
                                {dropdown && <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />}
                    </Link>
                        );
                    })}
                </nav>

                <div className="col-start-3 ml-auto flex shrink-0 items-center justify-end gap-0.5 sm:gap-1.5">
                    {/* Search → unified Command+K */}
                    <button
                        type="button"
                        onClick={() => openCommandCenter()}
                        aria-label="Search everything or run a command"
                        className="hidden h-9 w-[132px] items-center gap-1.5 rounded-full border border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface-secondary,#f4f4f5)] px-2.5 text-left min-[1060px]:flex xl:w-[152px]"
                    >
                        <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-text-muted)]">Search…</span>
                        <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] px-1 py-px text-[9px] font-semibold text-[var(--color-text-muted)] 2xl:block">⌘K</kbd>
                    </button>

                    <button
                        type="button"
                        onClick={() => openCommandCenter()}
                        aria-label="Search"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] min-[1060px]:hidden"
                    >
                        <Search className="h-[18px] w-[18px]" />
                    </button>

                    {/* Create */}
                    <CreateMenuDropdown variant="compact" />

                    {/* AI — community panel on hub routes; global copilot otherwise */}
                    <button
                        onClick={() => {
                            if (pathname.startsWith("/communities")) setAiOpen(true);
                            else openAssistant();
                        }}
                        aria-label="AI assistant"
                        className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-[#fd5000] hover:bg-[#fd5000]/10 sm:grid"
                    >
                        <Sparkles className="h-[18px] w-[18px]" />
                    </button>

                    {/* Notifications */}
                    <Link
                        href="/settings/notifications"
                        aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
                        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                        <Bell className="h-[18px] w-[18px]" />
                        {unreadNotifications > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#fd5000] px-1 text-[9px] font-black text-white ring-2 ring-[var(--color-surface,#fff)]">
                                {unreadNotifications > 9 ? "9+" : unreadNotifications}
                            </span>
                        )}
                    </Link>

                    {/* Orders / Wallet — icon-only utilities */}
                    {isAuthenticated && (
                        <>
                            <Link
                                href="/orders"
                                aria-label="Orders"
                                title="Orders"
                                className={cn(
                                    "hidden h-9 w-9 shrink-0 place-items-center rounded-full transition-colors sm:grid",
                                    isOrdersActive(pathname)
                                        ? "bg-[#fd5000]/10 text-[#fd5000]"
                                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                                )}
                            >
                                <Package className="h-[18px] w-[18px]" />
                            </Link>
                            <Link
                                href="/wallet"
                                aria-label="Wallet"
                                title="Wallet"
                                className={cn(
                                    "hidden h-9 w-9 shrink-0 place-items-center rounded-full transition-colors sm:grid",
                                    isWalletActive(pathname)
                                        ? "bg-[#fd5000]/10 text-[#fd5000]"
                                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                                )}
                            >
                                <Wallet className="h-[18px] w-[18px]" />
                            </Link>
                        </>
                    )}

                    {/* Cart */}
                    <Link
                        href="/cart"
                        aria-label="Cart"
                        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                        <ShoppingCart className="h-[18px] w-[18px]" />
                        {cartCount > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#fd5000] px-1 text-[9px] font-black text-white ring-2 ring-[var(--color-surface,#fff)]">
                                {cartCount > 9 ? "9+" : cartCount}
                            </span>
                        )}
                    </Link>

                    {/* Theme */}
                    <div className="hidden sm:flex">
                        <ThemeToggle />
                    </div>

                    {/* Avatar / Sign in */}
                    {isAuthenticated === false ? (
                        <Link
                            href={loginHref}
                            className="ml-0.5 shrink-0 rounded-full border border-[#fd5000]/30 bg-[#fd5000]/10 px-3 py-1.5 text-[12px] font-bold text-[#fd5000] transition-colors hover:bg-[#fd5000]/15"
                        >
                            Sign in
                        </Link>
                    ) : (
                    <ProfileAccountMenu
                        user={{
                            name: profile?.full_name || profile?.username || "Account",
                            avatarUrl: profile?.avatar_url,
                        }}
                        messageCount={unreadMessages}
                        inboxCount={unreadNotifications}
                        extraAccountItems={[
                          {
                            label: myCommunityHome?.label ?? "My Community",
                            href: myCommunityHome?.href ?? profileHref,
                            icon: Users,
                          },
                        ]}
                        trigger={
                            <button
                                type="button"
                                aria-label="Open profile menu"
                                className="ml-0.5 shrink-0 rounded-full transition-opacity hover:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                            >
                                <UserAvatar profile={profile} size={32} />
                            </button>
                        }
                    />
                    )}
                </div>
                </header>

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
                                        Back
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
                                <h1 className="min-w-0 break-words text-[14px] font-bold leading-tight text-[var(--color-text-primary)]">
                                    {pageTitle}
                                </h1>
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

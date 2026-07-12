"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Home,
    ChevronDown,
    Search,
    Bell,
    ShoppingCart,
    Sparkles,
    Menu,
    Radio,
    Layers,
    MessageSquare,
    Target,
    LayoutDashboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import HubPrimarySidebar from "@/components/shell/HubPrimarySidebar";
import { CallProvider } from "@/components/community/call-context";
import { CreateMenuDropdown } from "@/components/feed/CreateQuickLaunch";
import JimvioLogo from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { useCartStore } from "@/lib/store/use-cart-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { cn } from "@/lib/utils";
import type { Profile as DbProfile } from "@/types/db";
import { buildHubLoginUrl, getCommunitySlugFromPath } from "@/lib/community/hub-auth";
import {
  isCommunitiesNavActive,
  isDashboardActive,
  isPrimaryNavActive,
  PRIMARY_NAV_ITEMS,
} from "@/lib/navigation/primary-nav";

type Profile = Pick<DbProfile, "id" | "username" | "full_name" | "avatar_url">;

const PRIMARY_NAV: { label: string; href: string; icon: typeof Home; dropdown?: boolean }[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, dropdown: true },
    { label: "Communities", href: "/communities", icon: Users },
    { label: "Affiliates", href: "/affiliates", icon: DollarSign },
    { label: "UGC & Clipping", href: "/ugc", icon: Clapperboard },
];

function UserAvatar({ profile, size = 32 }: { profile: Profile | null; size?: number }) {
    if (profile?.avatar_url) {
        return (
            <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "Profile"}
                className="rounded-full object-cover ring-2 ring-[var(--color-accent)]/30"
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
            className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
            style={{ width: size, height: size, fontSize: size * 0.38, background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))" }}
        >
            {initials}
        </span>
    );
}

function usePageTitle(pathname: string): string {
    const [communityName, setCommunityName] = useState<string | null>(null);

    let staticTitle = "";
    if (pathname === "/c") staticTitle = "Feed";
    else if (pathname.startsWith("/c/messages")) staticTitle = "Messages";
    else if (pathname.startsWith("/c/bookmarks")) staticTitle = "Bookmarks";
    else if (pathname.startsWith("/c/live")) staticTitle = "Live";
    else if (pathname.startsWith("/c/spaces")) staticTitle = "Spaces";
    else if (pathname.startsWith("/c/wallet")) staticTitle = "Wallet";
    else if (pathname.startsWith("/c/analytics")) staticTitle = "Analytics";
    else if (pathname.startsWith("/c/missions")) staticTitle = "Missions";
    else if (pathname.startsWith("/c/courses")) staticTitle = "Courses";
    else if (pathname.startsWith("/c/events")) staticTitle = "Events";
    else if (pathname.startsWith("/c/my-communities")) staticTitle = "My Communities";
    else if (pathname.startsWith("/c/u/")) {
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

function isNavActive(pathname: string, href: string): boolean {
    const h = href.replace(/\/$/, "") || "/";
    if (h === "/") return false;
    return pathname === h || pathname.startsWith(`${h}/`);
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const [collapsed, setCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);

    const manuallyToggled = useRef(false);

    const FULLSCREEN_ROUTES = ["/c/live", "/c/events", "/c/spaces"];

    function isFullscreenRoute(p: string) {
        return FULLSCREEN_ROUTES.some((route) => p.startsWith(route));
    }

    const isFullscreen = isFullscreenRoute(pathname);

    useEffect(() => {
        if (isFullscreenRoute(pathname)) {
            if (!manuallyToggled.current) setCollapsed(true);
        } else {
            manuallyToggled.current = false;
        }
    }, [pathname]);

    function handleToggleCollapse() {
        manuallyToggled.current = true;
        setCollapsed((c) => !c);
    }

    const pageTitle = usePageTitle(pathname);
    const { cartCount, refreshCounts } = useCartStore();
    const { openAssistant } = useAIStore();

    useEffect(() => { setMobileNavOpen(false); }, [pathname]);

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)");
        const closeOnDesktop = () => { if (mq.matches) setMobileNavOpen(false); };
        closeOnDesktop();
        mq.addEventListener("change", closeOnDesktop);
        return () => mq.removeEventListener("change", closeOnDesktop);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const supabase = createClient();

        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (cancelled) return;
            if (!user) {
                setIsAuthenticated(false);
                setProfile(null);
                return;
            }
            setIsAuthenticated(true);

            const [profResult, notifResult, msgResult] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("id, username, full_name, avatar_url")
                    .eq("id", user.id)
                    .maybeSingle(),
                supabase
                    .from("notifications")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("is_read", false),
                supabase
                    .from("notifications")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("type", "message")
                    .eq("is_read", false),
            ]);

            if (cancelled) return;
            if (profResult.data) setProfile(profResult.data);
            setUnreadNotifications(notifResult.count ?? 0);
            setUnreadMessages(msgResult.count ?? 0);

            return user;
        }

        let channel: ReturnType<typeof supabase.channel> | null = null;

        void load().then((user) => {
            if (!user || cancelled) return;
            const uniqueNotifId = `${user.id}-${Math.random().toString(36).substring(2, 11)}`;
            channel = supabase
                .channel(`hub-notifications-${uniqueNotifId}`)
                .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
                .subscribe();
        });

        refreshCounts();

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [refreshCounts]);

    const profileHref = profile?.username ? `/c/profile/${profile.username}` : "/c/profile";
    const loginHref = buildHubLoginUrl(pathname);

    return (
        <CallProvider>
            <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text-primary)]">

                {/* ── Main header (glassmorphism) ── */}
                <header className="z-30 flex h-[56px] shrink-0 items-center gap-3 border-b border-[var(--color-border)]/30 bg-[var(--color-surface)]/80 backdrop-blur-xl px-3 sm:px-6">
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileNavOpen((o) => !o)}
                        aria-label="Open navigation menu"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] lg:hidden transition-colors"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Logo */}
                    <Link href="/c" className="shrink-0" aria-label="Jimvio home">
                        <JimvioLogo href={undefined} size="lg" />
                    </Link>

                    {/* Primary nav (desktop) - soft pill tabs */}
                    <nav className="ml-2 hidden items-center gap-1 min-[1150px]:flex">
                        {PRIMARY_NAV.map(({ label, href, icon: Icon, dropdown }) => {
                            const active = isNavActive(pathname, href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold tracking-tight transition-all duration-200",
                                        active
                                            ? "bg-[var(--color-accent)] text-white shadow-[0_2px_8px_rgba(253,80,0,0.3)]"
                                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" style={{ color: active ? "white" : "var(--color-accent)" }} />
                                    {label}
                                    {dropdown && <ChevronDown className="h-3 w-3 opacity-60" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right cluster */}
                    <div className="ml-auto flex items-center gap-1.5">
                        {/* Search - expanding on focus */}
                        <div className="relative hidden lg:flex">
                            <button
                                onClick={() => setSearchOpen(true)}
                                aria-label="Search"
                                className="group flex items-center gap-2 rounded-full border border-[var(--color-border)]/30 bg-[var(--color-surface-secondary)]/50 px-3 py-1.5 pr-8 transition-all duration-300 min-w-[60px]"
                                style={{ width: searchOpen ? "240px" : "48px" }}
                            >
                                <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-opacity" style={{ opacity: searchOpen ? 1 : 0 }} />
                                {searchOpen && (
                                    <>
                                        <input
                                            placeholder="Search global community…"
                                            aria-label="Search"
                                            className="w-full bg-transparent text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                                            autoFocus
                                            onBlur={() => setTimeout(() => setSearchOpen(false), 100)}
                                        />
                                        <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] px-1 text-[10px] font-semibold text-[var(--color-text-muted)] xl:block">⌘K</kbd>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Create */}
                        <CreateMenuDropdown variant="compact" />

                        {/* AI */}
                        <button
                            onClick={() => openAssistant()}
                            aria-label="AI assistant"
                            className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 sm:grid transition-colors"
                        >
                            <Sparkles className="h-[18px] w-[18px]" />
                        </button>

                        {/* Notifications */}
                        <Link
                            href="/notifications"
                            aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
                            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                            <Bell className="h-[18px] w-[18px]" />
                            {unreadNotifications > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 animate-breathe grid h-4 min-w-[16px] place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-black text-white ring-2 ring-[var(--color-surface)]">
                                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                                </span>
                            )}
                        </Link>

                        {/* Cart */}
                        <Link
                            href="/cart"
                            aria-label="Cart"
                            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                            <ShoppingCart className="h-[18px] w-[18px]" />
                            {cartCount > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 animate-bounce grid h-4 min-w-[16px] place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-black text-white ring-2 ring-[var(--color-surface)]">
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
                                className="ml-0.5 shrink-0 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1.5 text-[12px] font-bold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/15"
                            >
                                Sign in
                            </Link>
                        ) : (
                        <Link
                            href={profileHref}
                            aria-label="My profile"
                            className="ml-0.5 shrink-0 rounded-full transition-opacity hover:opacity-80"
                        >
                            <UserAvatar profile={profile} size={32} />
                        </Link>
                        )}
                    </div>
                </header>

                {/* ── Body row: sidebar + content ── */}
                <div className="flex min-h-0 flex-1">
                    <Suspense fallback={null}>
                        <HubPrimarySidebar
                            collapsed={collapsed}
                            onToggleCollapse={handleToggleCollapse}
                            username={profile?.username ?? ""}
                            unreadMessages={unreadMessages}
                            mobileOpen={mobileNavOpen}
                            onMobileClose={() => setMobileNavOpen(false)}
                        />
                    </Suspense>

                    {/* Mobile overlay backdrop */}
                    {mobileNavOpen && (
                        <div
                            className="fixed inset-0 z-[98] bg-black/50 lg:hidden"
                            onClick={() => setMobileNavOpen(false)}
                            aria-hidden="true"
                        />
                    )}

                    {/* Page content */}
                    <main className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide", isFullscreen && "bg-[var(--color-bg)]")}>
                        {/* Mobile page title bar */}
                        {!isFullscreen && (
                        <div className="flex h-11 items-center border-b border-[var(--color-border)]/30 bg-[var(--color-surface)]/80 backdrop-blur-xl px-4 lg:hidden">
                            <h1 className="text-[14px] font-bold text-[var(--color-text-primary)]">{pageTitle}</h1>
                        </div>
                        )}
                        <div className="flex-1 pb-14 lg:pb-0">{children}</div>
                    </main>
                </div>

                {/* ── Mobile bottom nav (redesigned) ── */}
                <nav
                    className="fixed inset-x-0 bottom-0 z-[60] flex h-16 items-stretch justify-around border-t border-[var(--color-border)]/30 bg-[var(--color-surface)]/80 backdrop-blur-xl lg:hidden"
                    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                    aria-label="Mobile navigation"
                >
                    {[
                        { label: "Feed", href: "/c", auth: false, icon: Home },
                        { label: "Live", href: "/c/live", auth: true, icon: Radio },
                        { label: "Spaces", href: "/c/spaces", auth: true, icon: Layers },
                        { label: "Messages", href: "/c/messages", auth: true, icon: MessageSquare },
                        { label: "Missions", href: "/c/missions", auth: true, icon: Target },
                    ].map(({ label, href, auth, icon: Icon }) => {
                        const navHref = isAuthenticated === false && auth ? buildHubLoginUrl(href) : href;
                        const active = href === "/c" ? pathname === "/c" : pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={navHref}
                                aria-label={label}
                                className={cn(
                                    "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
                                    active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
                                )}
                            >
                                <div className="relative">
                                    <Icon className="h-5 w-5" />
                                </div>
                                {label}
                                {active && (
                                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-[var(--color-accent)] animate-in animate-scale-in" />
                                )}
                            </Link>
                        );
                    })}
                    <button
                        type="button"
                        aria-label="Open full menu"
                        onClick={() => setMobileNavOpen(true)}
                        className={cn(
                            "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
                            mobileNavOpen ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
                        )}
                    >
                        <Menu className="h-5 w-5" />
                        More
                    </button>
                </nav>
            </div>
        </CallProvider>
    );
}
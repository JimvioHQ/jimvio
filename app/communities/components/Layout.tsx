"use client";

import { Suspense, useEffect, useState } from "react";
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
    Globe,
    Radio,
    Layers,
    MessageSquare,
    Target,
    LayoutDashboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import HubPrimarySidebar from "@/components/shell/HubPrimarySidebar";
import { CommunitySidebar } from "@/components/shell/CommunitySidebar";
import { CreateMenuDropdown } from "@/components/feed/CreateQuickLaunch";
import JimvioLogo from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrencySelector } from "@/context/CurrencyContext";
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
import { CommunityAiPanel } from "@/components/community/hub/CommunityAiPanel";
import { HubSearchDialog } from "@/components/community/hub/HubSearchDialog";

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
    else if (pathname.startsWith("/communities/channels")) staticTitle = "Channels";
    else if (pathname.startsWith("/communities/spaces")) staticTitle = "Groups";
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

    const [collapsed, setCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);

    const pageTitle = usePageTitle(pathname);
    const communitySlug = getCommunitySlugFromPath(pathname);
    const communityId = useCommunityIdFromPath(pathname);
    const isCommunityWorkspace = Boolean(communitySlug);
    const isLiveStudio = pathname.startsWith("/communities/live");
    const { cartCount, refreshCounts } = useCartStore();
    const { openAssistant } = useAIStore();

    // Close mobile nav on route change
    useEffect(() => { setMobileNavOpen(false); }, [pathname]);

    // ⌘K / Ctrl+K opens hub search
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Close mobile nav when returning to desktop width
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
            channel = supabase
                .channel(`hub-notifications-${user.id}`)
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
                    () => { void load(); }
                )
                .subscribe();
        });

        refreshCounts();

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [refreshCounts]);

    const profileHref = profile?.username ? `/communities/profile/${profile.username}` : "/communities/profile";
    const loginHref = buildHubLoginUrl(pathname);

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg,#f4f4f5)] text-[var(--color-text-primary,#18181b)]">

            {/* ── Top utility strip (desktop) ── */}
            <div className="hidden border-b border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] lg:block">
                <div className="mx-auto flex h-7 max-w-[1600px] items-center justify-between px-6">
                    <div className="flex items-center gap-5">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-[var(--color-text-muted,#71717a)]">
                            <Globe className="h-3 w-3 text-[#fd5000]" />
                            Global Sourcing Network
                        </span>
                        <CurrencySelector className="h-5 border-0 bg-transparent px-1 text-[10px] font-bold text-[var(--color-text-muted,#71717a)] ring-0 transition-colors hover:text-[var(--color-text-primary)] focus:ring-0" />
                    </div>
                    <div className="flex items-center gap-5">
                        <Link href="/help" className="text-[10px] font-bold uppercase text-[var(--color-text-muted,#71717a)] transition-colors hover:text-[#fd5000]">Support</Link>
                        <span className="h-3 w-px bg-[var(--color-border,#e4e4e7)]" />
                        <Link href="/vendors" className="text-[10px] font-bold uppercase text-[var(--color-text-muted,#71717a)] transition-colors hover:text-[var(--color-text-primary)]">Sell on Jimvio</Link>
                    </div>
                </div>
            </div>

            {/* ── Main header (full width, above sidebar) ── */}
            <header className="z-30 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] px-3 sm:gap-x-3 sm:px-6">
                {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileNavOpen((o) => !o)}
                        aria-label="Open navigation menu"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] lg:hidden"
                    >
                    <Menu className="h-5 w-5" />
                    </button>

                {/* Logo */}
                <Link href="/communities" className="shrink-0" aria-label="Jimvio home">
                    <JimvioLogo href={undefined} size="lg" />
                </Link>

                {/* Primary nav (desktop) */}
                <nav className="hidden min-w-0 items-center justify-center gap-0.5 overflow-hidden min-[1060px]:flex min-[1060px]:flex-nowrap">
                    {PRIMARY_NAV_ITEMS.map((item) => {
                        const { label, href, icon: Icon, dropdown } = item;
                        const active =
                            item.label === "Communities"
                                ? isCommunitiesNavActive(pathname)
                                : isPrimaryNavActive(pathname, item);
                        return (
                    <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1.5 text-[12px] font-semibold tracking-tight transition-colors xl:px-2.5 xl:text-[13px]",
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

                <div className="col-start-3 ml-auto flex shrink-0 items-center justify-end gap-1.5">
                    {/* Search */}
                    <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        aria-label="Search communities"
                        className="hidden h-9 w-[132px] items-center gap-1.5 rounded-full border border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface-secondary,#f4f4f5)] px-2.5 text-left min-[1060px]:flex xl:w-[152px]"
                    >
                        <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-text-muted)]">Search…</span>
                        <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] px-1 py-px text-[9px] font-semibold text-[var(--color-text-muted)] 2xl:block">⌘K</kbd>
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
                        href="/dashboard/notifications"
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

                    {isAuthenticated !== false && (
                        <Link
                            href="/dashboard"
                            className={cn(
                                "hidden h-9 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors sm:inline-flex sm:px-3 sm:text-xs",
                                isDashboardActive(pathname)
                                    ? "border-[#fd5000] bg-[#fd5000]/10 text-[#fd5000]"
                                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[#fd5000]/40 hover:bg-[#fd5000]/5 hover:text-[#fd5000]"
                            )}
                        >
                            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                            <span className="whitespace-nowrap">Dashboard</span>
                        </Link>
                    )}

                    {/* Avatar / Sign in */}
                    {isAuthenticated === false ? (
                        <Link
                            href={loginHref}
                            className="ml-0.5 shrink-0 rounded-full border border-[#fd5000]/30 bg-[#fd5000]/10 px-3 py-1.5 text-[12px] font-bold text-[#fd5000] transition-colors hover:bg-[#fd5000]/15"
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
                {!isCommunityWorkspace && (
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

                {isCommunityWorkspace && communitySlug && (
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
                {!isCommunityWorkspace && mobileNavOpen && (
                    <div
                        className="fixed inset-0 z-[98] bg-black/50 lg:hidden"
                        onClick={() => setMobileNavOpen(false)}
                        aria-hidden="true"
                    />
                )}

                {/* Page content */}
                <main className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide", isLiveStudio && "bg-[#f7f7f8]")}>
                    {/* Mobile page title bar */}
                    {!isLiveStudio && (
                    <div className="flex h-11 items-center border-b border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] px-4 lg:hidden">
                        <h1 className="text-[14px] font-bold text-[var(--color-text-primary)]">{pageTitle}</h1>
                    </div>
                    )}
                    <div className={cn("flex min-h-0 flex-1 flex-col", !isCommunityWorkspace && "pb-14 lg:pb-0")}>
                        {children}
                    </div>
                </main>
            </div>

            {/* ── Mobile bottom nav (hub only — community uses workspace bottom nav) ── */}
            {!isCommunityWorkspace && (
            <nav
                className="fixed inset-x-0 bottom-0 z-[60] flex h-14 items-stretch justify-around border-t border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] lg:hidden"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                aria-label="Mobile navigation"
            >
                {[
                    { label: "Feed", href: "/communities", auth: false, icon: Home },
                    { label: "Live", href: "/communities/live", auth: true, icon: Radio },
                    { label: "Groups", href: "/communities/spaces", auth: true, icon: Layers },
                    { label: "Messages", href: "/communities/messages", auth: true, icon: MessageSquare },
                    { label: "Missions", href: "/communities/missions", auth: true, icon: Target },
                ].map(({ label, href, auth, icon: Icon }) => {
                    const navHref = isAuthenticated === false && auth ? buildHubLoginUrl(href) : href;
                    const active = href === "/communities" ? pathname === "/communities" : pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                            href={navHref}
                                aria-label={label}
                            className={cn(
                                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
                                active ? "text-[#fd5000]" : "text-[var(--color-text-muted)]"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                                {label}
                            </Link>
                        );
                    })}
                <button
                    type="button"
                    aria-label="Open full menu"
                    onClick={() => setMobileNavOpen(true)}
                    className={cn(
                        "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
                        mobileNavOpen ? "text-[#fd5000]" : "text-[var(--color-text-muted)]"
                    )}
                >
                    <Menu className="h-5 w-5" />
                    More
                </button>
                </nav>
            )}

            <HubSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
            <CommunityAiPanel
                open={aiOpen}
                onClose={() => setAiOpen(false)}
                communityId={communityId}
            />
        </div>
    );
}

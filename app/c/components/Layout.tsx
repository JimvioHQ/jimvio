"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Home,
    ShoppingBag,
    Users,
    DollarSign,
    Clapperboard,
    ChevronDown,
    Search,
    Bell,
    ShoppingCart,
    Sparkles,
    Plus,
    Menu,
    Globe,
    Radio,
    Layers,
    MessageSquare,
    Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import HubSidebar from "./sidebar";
import JimvioLogo from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrencySelector } from "@/context/CurrencyContext";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/supabase";

type Profile = Pick<Tables<"profiles">, "id" | "username" | "full_name" | "avatar_url">;

// ── Primary navigation (matches public marketing nav) ────────────────────────
const PRIMARY_NAV: { label: string; href: string; icon: typeof Home; dropdown?: boolean }[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, dropdown: true },
    { label: "Communities", href: "/communities", icon: Users },
    { label: "Affiliates", href: "/affiliates", icon: DollarSign },
    { label: "UGC & Clipping", href: "/ugc", icon: Clapperboard },
];

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

// ── Community route helpers ───────────────────────────────────────────────────
const HUB_RESERVED_SEGMENTS = new Set([
    "messages", "bookmarks", "live", "spaces", "wallet", "analytics",
    "missions", "courses", "events", "my-communities", "community", "u", "settings", "profile",
]);

function getCommunitySlugFromPath(pathname: string): string | null {
    const legacyMatch = pathname.match(/^\/c\/community\/([^/]+)/);
    if (legacyMatch) return legacyMatch[1];

    const match = pathname.match(/^\/c\/([^/]+)/);
    if (!match) return null;
    const slug = match[1];
    if (HUB_RESERVED_SEGMENTS.has(slug)) return null;
    return slug;
}

// ── Page title hook (mobile header) ───────────────────────────────────────────
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
    if (h === "/") return false; // never highlight Home inside the hub
    return pathname === h || pathname.startsWith(`${h}/`);
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function HubLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const [collapsed, setCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    const pageTitle = usePageTitle(pathname);
    const { cartCount, refreshCounts } = useCartStore();
    const { openAssistant } = useAIStore();

    // Close mobile nav on route change
    useEffect(() => { setMobileNavOpen(false); }, [pathname]);

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
            if (!user || cancelled) return;

            const { data: prof } = await supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url")
                .eq("id", user.id)
                .maybeSingle();
            if (cancelled) return;
            if (prof) setProfile(prof);

            const { count: notifCount } = await supabase
                .from("notifications")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("is_read", false);
            if (!cancelled) setUnreadNotifications(notifCount ?? 0);

            const { count: msgCount } = await supabase
                .from("notifications")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("type", "message")
                .eq("is_read", false);
            if (!cancelled) setUnreadMessages(msgCount ?? 0);
        }

        load();
        refreshCounts();

        let channel: ReturnType<typeof supabase.channel> | null = null;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;
            channel = supabase
                .channel(`hub-notifications-${user.id}`)
                .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
                .subscribe();
        })();

        return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
    }, [refreshCounts]);

    const profileHref = profile?.username ? `/c/profile/${profile.username}` : "/c/profile";

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
            <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] px-3 sm:px-6">
                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileNavOpen((o) => !o)}
                    aria-label="Open navigation menu"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Logo */}
                <Link href="/c" className="shrink-0" aria-label="Jimvio home">
                    <JimvioLogo href={undefined} size="lg" />
                </Link>

                {/* Primary nav (desktop) */}
                <nav className="ml-2 hidden items-center gap-0.5 min-[1150px]:flex">
                    {PRIMARY_NAV.map(({ label, href, icon: Icon, dropdown }) => {
                        const active = isNavActive(pathname, href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold tracking-tight transition-colors",
                                    active
                                        ? "bg-[#fd5000]/10 text-[#fd5000]"
                                        : "text-[var(--color-text-secondary,#52525b)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5 text-[#fd5000]" />
                                {label}
                                {dropdown && <ChevronDown className="h-3 w-3 opacity-50" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right cluster */}
                <div className="ml-auto flex items-center gap-1.5">
                    {/* Search */}
                    <div className="hidden items-center gap-2 rounded-full border border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface-secondary,#f4f4f5)] px-3 py-1.5 min-[1100px]:flex lg:w-[240px]">
                        <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                        <input
                            placeholder="Search global community…"
                            aria-label="Search"
                            className="w-full bg-transparent text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                        />
                        <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] px-1 text-[10px] font-semibold text-[var(--color-text-muted)] xl:block">⌘K</kbd>
                    </div>

                    {/* Create */}
                    <Link
                        href="/c/live"
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#fd5000] px-4 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#e04800]"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Create</span>
                    </Link>

                    {/* AI */}
                    <button
                        onClick={() => openAssistant()}
                        aria-label="AI assistant"
                        className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-[#fd5000] hover:bg-[#fd5000]/10 sm:grid"
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

                    {/* Avatar */}
                    <Link
                        href={profileHref}
                        aria-label="My profile"
                        className="ml-0.5 shrink-0 rounded-full transition-opacity hover:opacity-80"
                    >
                        <UserAvatar profile={profile} size={32} />
                    </Link>
                </div>
            </header>

            {/* ── Body row: sidebar + content ── */}
            <div className="flex min-h-0 flex-1">
                <Suspense fallback={null}>
                    <HubSidebar
                        collapsed={collapsed}
                        onToggleCollapse={() => setCollapsed((c) => !c)}
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
                <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                    {/* Mobile page title bar */}
                    <div className="flex h-11 items-center border-b border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] px-4 lg:hidden">
                        <h1 className="text-[14px] font-bold text-[var(--color-text-primary)]">{pageTitle}</h1>
                    </div>
                    <div className="flex-1 pb-14 lg:pb-0">{children}</div>
                </main>
            </div>

            {/* ── Mobile bottom nav ── */}
            <nav
                className="fixed inset-x-0 bottom-0 z-[60] flex h-14 items-stretch justify-around border-t border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] lg:hidden"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                aria-label="Mobile navigation"
            >
                {[
                    { label: "Feed", href: "/c", icon: Home },
                    { label: "Live", href: "/c/live", icon: Radio },
                    { label: "Spaces", href: "/c/spaces", icon: Layers },
                    { label: "Messages", href: "/c/messages", icon: MessageSquare },
                    { label: "Missions", href: "/c/missions", icon: Target },
                ].map(({ label, href, icon: Icon }) => {
                    const active = href === "/c" ? pathname === "/c" : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
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
        </div>
    );
}

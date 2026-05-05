"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
    User, ShoppingCart, MessageCircle, Menu, X, Globe, CircleHelp,
    LayoutDashboard, Settings, LogOut, TrendingUp, Video, Factory,
    Home, ShoppingBag, Package, Users, Search, ChevronDown, ChevronRight,
    Sparkles, Zap, Play, Megaphone, Clapperboard, Sun, BatteryCharging,
    Headphones, Laptop, Lamp, Smartphone, Flame, Store, Handshake,
    Bell, Command, ArrowRight, Star, Shield, BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { MarketingSettings, NavLinkConfig } from "@/lib/platform-settings-shared";
import { NavbarSearch } from "@/components/layout/navbar-search";
import { CurrencySelector } from "@/context/CurrencyContext";
import { CurrencyConverterWidget } from "@/components/shared/currency-converter-widget";
import JimvioLogo from "../ui/logo";

/* ─────────────────── TRENDING SEARCHES ─────────────────── */
const TRENDING_SEARCHES = [
    { label: "Wireless chargers", count: "142 products", icon: BatteryCharging, color: "#f97316", bg: "rgba(249,115,22,0.1)" },
    { label: "Wireless earbuds", count: "89 products", icon: Headphones, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    { label: "Laptop accessories", count: "230 products", icon: Laptop, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
    { label: "LED desk lamps", count: "77 products", icon: Lamp, color: "#eab308", bg: "rgba(234,179,8,0.1)" },
    { label: "Phone stands", count: "190 products", icon: Smartphone, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
];

/* ─────────────────── SCROLL DIRECTION ─────────────────── */
function useScrollDirection(threshold = 8) {
    const [hidden, setHidden] = useState(false);
    const lastY = useRef(0);
    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            if (Math.abs(y - lastY.current) < threshold) return;
            setHidden(y > lastY.current && y > 60);
            lastY.current = y;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);
    return hidden;
}

/* ─────────────────── HELPERS ─────────────────── */
function ensureCoreNavLinks(links: NavLinkConfig[]): NavLinkConfig[] {
    const hide = ["/vendors", "/influencers", "/influencers/browse", "/influencers/program", "/shorts"];
    let out = links.filter((l) => {
        const h = l.href.replace(/\/$/, "") || "/";
        return h !== "/clips" && !hide.includes(h);
    });
    const norm = (h: string) => h.replace(/\/$/, "") || "/";
    if (!out.some((l) => norm(l.href) === "/ugc")) out.push({ label: "UGC", href: "/ugc" });
    if (!out.some((l) => norm(l.href) === "/marketplace")) out.push({ label: "Marketplace", href: "/marketplace" });
    if (!out.some((l) => norm(l.href) === "/communities")) out.push({ label: "Communities", href: "/communities" });
    const hi = out.findIndex((l) => norm(l.href) === "/");
    if (hi > 0) { const home = out[hi]; out.splice(hi, 1); out.unshift(home); }
    return out;
}

function iconForHref(href: string): LucideIcon {
    const h = href.replace(/\/$/, "") || "/";
    if (h === "/") return Home;
    if (h.startsWith("/communities")) return Users;
    if (h.startsWith("/ugc")) return Megaphone;
    if (h.startsWith("/marketplace")) return ShoppingBag;
    if (h.startsWith("/affiliates")) return TrendingUp;
    if (h.startsWith("/influencers")) return User;
    if (h.startsWith("/vendors")) return Factory;
    if (h.startsWith("/shorts")) return Clapperboard;
    return Package;
}

function isActive(pathname: string, href: string) {
    const h = href.replace(/\/$/, "") || "/";
    if (h === "/") return pathname === "/";
    return pathname === h || pathname.startsWith(`${h}/`);
}

/* ─────────────────── NAV BTN ─────────────────── */
const NavBtn = React.forwardRef<any, {
    children: React.ReactNode; href?: string; onClick?: () => void;
    className?: string; active?: boolean; accent?: boolean; style?: React.CSSProperties;[k: string]: any;
}>(({ children, href, onClick, className, active = false, accent = false, style, ...props }, ref) => {
    const cls = cn(
        "relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium tracking-tight transition-all duration-150 active:scale-[0.97] select-none whitespace-nowrap",
        active
            ? "bg-stone-100 dark:bg-white/8 text-stone-900 dark:text-white font-semibold"
            : accent
                ? "bg-[#fd5000] text-white hover:bg-[#e04700] shadow-[0_2px_8px_rgba(253,80,0,0.35)]"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/6 hover:text-stone-900 dark:hover:text-white",
        className
    );
    if (href) return <Link href={href} className={cls} style={style} ref={ref} {...props}>{children}</Link>;
    return <button type="button" onClick={onClick} className={cls} style={style} ref={ref} {...props}>{children}</button>;
});
NavBtn.displayName = "NavBtn";

/* ─────────────────── ICON BTN ─────────────────── */
const IconBtn = React.forwardRef<any, {
    children: React.ReactNode; href?: string; onClick?: () => void;
    badge?: number; className?: string; style?: React.CSSProperties;[k: string]: any;
}>(({ children, href, onClick, badge, className, style, ...props }, ref) => {
    const cls = cn(
        "relative flex items-center justify-center h-9 w-9 shrink-0 rounded-xl",
        "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/8",
        "hover:text-stone-800 dark:hover:text-white transition-all duration-150 active:scale-[0.94]",
        className
    );
    const inner = (
        <>
            {children}
            {badge != null && badge > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-[#fd5000] text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white dark:ring-[#0a0a0a]">
                    {badge > 99 ? "99+" : badge}
                </span>
            )}
        </>
    );
    if (href) return <Link href={href} className={cls} style={style} ref={ref} {...props}>{inner}</Link>;
    return <button type="button" onClick={onClick} className={cls} style={style} ref={ref} {...props}>{inner}</button>;
});
IconBtn.displayName = "IconBtn";

/* ─────────────────── SEARCH COMMAND ─────────────────── */
function SearchTrigger({ placeholder, onClick }: { placeholder?: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            type="button"
            className="group flex items-center gap-2.5 h-9 w-full max-w-[280px] px-3.5 rounded-xl text-[13px] transition-all duration-200 active:scale-[0.98]"
            style={{
                background: "var(--color-surface, #f5f5f5)",
                border: "1px solid var(--color-border, #e5e5e5)",
                color: "var(--color-text-muted, #a3a3a3)",
            }}
        >
            <Search className="h-3.5 w-3.5 shrink-0 text-stone-400 dark:text-stone-500 group-hover:text-[#fd5000] transition-colors duration-150" />
            <span className="flex-1 text-left truncate text-stone-400 dark:text-stone-500 text-[12px]">
                {placeholder || "Search products, stores…"}
            </span>
            {/* ⌘K badge */}
            <span className="hidden sm:flex items-center gap-0.5 ml-auto shrink-0">
                <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded-md text-[10px] font-semibold tracking-wide border"
                    style={{ background: "var(--color-surface-secondary, #ebebeb)", borderColor: "var(--color-border, #e5e5e5)", color: "var(--color-text-muted, #a3a3a3)" }}>
                    ⌘K
                </kbd>
            </span>
        </button>
    );
}

/* ─────────────────── SEARCH OVERLAY ─────────────────── */
function SearchOverlay({
    open, onClose, searchQ, setSearchQ, runSearch, navLinks, marketing,
}: {
    open: boolean; onClose: () => void; searchQ: string;
    setSearchQ: (v: string) => void; runSearch: (o?: string) => void;
    navLinks: NavLinkConfig[]; marketing: MarketingSettings;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[9990]"
                        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ type: "spring", damping: 28, stiffness: 380 }}
                        className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[9991] w-full max-w-[620px] px-4"
                    >
                        <div className="rounded-2xl overflow-hidden shadow-2xl"
                            style={{ background: "var(--color-surface, #fff)", border: "1px solid var(--color-border, #e5e5e5)" }}>

                            {/* Input row */}
                            <div className="flex items-center gap-3 px-4 py-3.5"
                                style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: "rgba(253,80,0,0.1)", border: "1px solid rgba(253,80,0,0.15)" }}>
                                    <Search className="h-3.5 w-3.5 text-[#fd5000]" />
                                </div>
                                <input
                                    ref={inputRef}
                                    value={searchQ}
                                    onChange={(e) => setSearchQ(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && searchQ.trim()) runSearch(); if (e.key === "Escape") onClose(); }}
                                    placeholder={marketing.search_placeholder ?? "Search products, stores, creators…"}
                                    className="flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500"
                                    style={{ color: "var(--color-text-primary, #171717)" }}
                                />
                                <div className="flex items-center gap-2 shrink-0">
                                    {searchQ && (
                                        <button onClick={() => setSearchQ("")}
                                            className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                                            style={{ background: "var(--color-surface-secondary, #f5f5f5)" }}>
                                            <X className="h-3 w-3" style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                                        </button>
                                    )}
                                    <kbd className="hidden sm:flex items-center h-6 px-2 rounded-lg text-[10px] font-semibold border"
                                        style={{ background: "var(--color-surface-secondary, #f5f5f5)", borderColor: "var(--color-border, #e5e5e5)", color: "var(--color-text-muted, #a3a3a3)" }}>
                                        ESC
                                    </kbd>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="max-h-[400px] overflow-y-auto">
                                {!searchQ.trim() ? (
                                    <div className="p-4 space-y-5">
                                        {/* Trending */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Flame className="h-3.5 w-3.5 text-orange-500" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest"
                                                    style={{ color: "var(--color-text-muted, #a3a3a3)" }}>Trending now</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                {TRENDING_SEARCHES.map((item) => (
                                                    <button key={item.label} onClick={() => runSearch(item.label)}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-stone-50 dark:hover:bg-white/5 group">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                            style={{ background: item.bg }}>
                                                            <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] font-semibold leading-none"
                                                                style={{ color: "var(--color-text-primary, #171717)" }}>{item.label}</p>
                                                            <p className="text-[11px] mt-0.5"
                                                                style={{ color: "var(--color-text-muted, #a3a3a3)" }}>{item.count}</p>
                                                        </div>
                                                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#fd5000]" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Quick nav */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Globe className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                                                <p className="text-[10px] font-bold uppercase tracking-widest"
                                                    style={{ color: "var(--color-text-muted, #a3a3a3)" }}>Quick navigate</p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {navLinks.slice(0, 6).map((l: NavLinkConfig) => {
                                                    const Icon = iconForHref(l.href);
                                                    return (
                                                        <Link key={l.href} href={l.href} onClick={onClose}
                                                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:bg-stone-50 dark:hover:bg-white/5"
                                                            style={{ border: "1px solid var(--color-border, #e5e5e5)", color: "var(--color-text-primary, #171717)" }}>
                                                            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                                                            <span className="truncate">{l.label}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-2">
                                        {navLinks.filter((l: NavLinkConfig) => l.label.toLowerCase().includes(searchQ.toLowerCase())).map((l: NavLinkConfig) => {
                                            const Icon = iconForHref(l.href);
                                            return (
                                                <Link key={l.href} href={l.href} onClick={onClose}
                                                    className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-stone-50 dark:hover:bg-white/5 group">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                        style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                                                        <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                                                    </div>
                                                    <span className="text-[13px] font-semibold flex-1"
                                                        style={{ color: "var(--color-text-primary, #171717)" }}>{l.label}</span>
                                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#fd5000]" />
                                                </Link>
                                            );
                                        })}

                                        <button onClick={() => runSearch()}
                                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group"
                                            style={{ background: "rgba(253,80,0,0.05)", border: "1px solid rgba(253,80,0,0.15)" }}>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                style={{ background: "rgba(253,80,0,0.1)" }}>
                                                <Search className="h-3.5 w-3.5 text-[#fd5000]" />
                                            </div>
                                            <span className="text-[13px] font-semibold text-[#fd5000] flex-1 text-left">
                                                Search all results for &ldquo;{searchQ}&rdquo;
                                            </span>
                                            <ArrowRight className="h-3.5 w-3.5 text-[#fd5000] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer hint */}
                            <div className="flex items-center gap-4 px-4 py-2.5"
                                style={{ borderTop: "1px solid var(--color-border, #e5e5e5)", background: "var(--color-surface-secondary, #f9f9f9)" }}>
                                <span className="text-[10px] font-medium flex items-center gap-1.5"
                                    style={{ color: "var(--color-text-muted, #a3a3a3)" }}>
                                    <kbd className="px-1.5 py-0.5 rounded border text-[9px] font-bold"
                                        style={{ background: "var(--color-surface, #fff)", borderColor: "var(--color-border, #e5e5e5)" }}>↵</kbd>
                                    to search
                                </span>
                                <span className="text-[10px] font-medium flex items-center gap-1.5"
                                    style={{ color: "var(--color-text-muted, #a3a3a3)" }}>
                                    <kbd className="px-1.5 py-0.5 rounded border text-[9px] font-bold"
                                        style={{ background: "var(--color-surface, #fff)", borderColor: "var(--color-border, #e5e5e5)" }}>↑↓</kbd>
                                    navigate
                                </span>
                                <span className="text-[10px] font-medium flex items-center gap-1.5"
                                    style={{ color: "var(--color-text-muted, #a3a3a3)" }}>
                                    <kbd className="px-1.5 py-0.5 rounded border text-[9px] font-bold"
                                        style={{ background: "var(--color-surface, #fff)", borderColor: "var(--color-border, #e5e5e5)" }}>ESC</kbd>
                                    close
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/* ─────────────────── MARKETPLACE MEGA DROPDOWN ─────────────────── */
function MarketplaceDropdown({ open, onMouseEnter, onMouseLeave, variants }: {
    open: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    variants: { title: string; desc: string; href: string; icon: LucideIcon; color: string; badge?: string }[];
}) {
    return (
        <DropdownMenu open={open} modal={false}>
            <DropdownMenuTrigger asChild>
                <NavBtn className="px-3.5 py-2" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                    <ShoppingBag className="h-3.5 w-3.5 text-[#fd5000] shrink-0" />
                    Marketplace
                    <ChevronDown className={cn("h-3 w-3 text-stone-400 transition-transform duration-300 ml-0.5", open && "rotate-180")} />
                </NavBtn>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                sideOffset={6}
                align="start"
                className="w-80 p-2 rounded-2xl border shadow-xl"
                style={{
                    background: "var(--color-surface, #fff)",
                    borderColor: "var(--color-border, #e5e5e5)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
                }}
            >
                {/* Header */}
                <div className="px-3 pb-3 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--color-text-muted, #a3a3a3)" }}>Browse by type</p>
                </div>
                {variants.map((v) => (
                    <DropdownMenuItem key={v.href} asChild className="p-0 focus:bg-transparent">
                        <Link href={v.href}
                            className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-stone-50 dark:hover:bg-white/5 group cursor-pointer"
                            style={{ outline: "none" }}>
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                                style={{ background: `${v.color}15`, border: `1px solid ${v.color}25` }}>
                                <v.icon className="h-4.5 w-4.5" style={{ color: v.color }} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-bold leading-none"
                                        style={{ color: "var(--color-text-primary, #171717)" }}>{v.title}</p>
                                    {v.badge && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                            style={{ background: "#fd5000" }}>{v.badge}</span>
                                    )}
                                </div>
                                <p className="text-[11px] mt-1 leading-snug" style={{ color: "var(--color-text-muted, #a3a3a3)" }}>{v.desc}</p>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
                                style={{ color: v.color }} />
                        </Link>
                    </DropdownMenuItem>
                ))}

                {/* Footer CTA */}
                <div className="mt-1 pt-2" style={{ borderTop: "1px solid var(--color-border, #e5e5e5)" }}>
                    <Link href="/marketplace"
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:bg-stone-50 dark:hover:bg-white/5 group"
                        style={{ color: "var(--color-text-muted, #a3a3a3)" }}>
                        <span>Browse all categories</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform text-[#fd5000]" />
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/* ─────────────────── USER MENU ─────────────────── */
function UserMenu({ user }: { user: { email: string; full_name?: string | null; avatar_url?: string | null } }) {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <button
                    className="relative flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all hover:bg-stone-100 dark:hover:bg-white/6 active:scale-[0.97] group"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-border, #e5e5e5)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                >
                    <div className="relative">
                        <Avatar className="h-7 w-7 rounded-lg shrink-0 ring-2 ring-white dark:ring-[#0a0a0a]">
                            <AvatarImage src={user.avatar_url ?? undefined} className="object-cover rounded-lg" />
                            <AvatarFallback className="bg-gradient-to-br from-[#fd5000] to-orange-600 rounded-lg text-white text-[10px] font-bold capitalize">
                                {user.full_name?.[0] || user.email?.[0] || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-[#0a0a0a]" />
                    </div>
                    <div className="hidden lg:block text-left min-w-0">
                        <p className="text-[11px] font-bold leading-none truncate max-w-[90px]"
                            style={{ color: "var(--color-text-primary, #171717)" }}>
                            {user.full_name?.split(" ")[0] || "Account"}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted, #a3a3a3)" }}>Creator</p>
                    </div>
                    <ChevronDown className="hidden lg:block h-3 w-3 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180"
                        style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8}
                className="w-64 p-1.5 rounded-2xl border"
                style={{
                    background: "var(--color-surface, #fff)",
                    borderColor: "var(--color-border, #e5e5e5)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
                }}>
                {/* Profile header */}
                <div className="mx-1 mb-1.5 p-3 rounded-xl"
                    style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Avatar className="h-9 w-9 rounded-xl ring-2 ring-white dark:ring-[#0a0a0a] shrink-0">
                                <AvatarImage src={user.avatar_url ?? undefined} className="rounded-xl" />
                                <AvatarFallback className="bg-gradient-to-br from-[#fd5000] to-orange-600 rounded-xl text-white text-[11px] font-bold capitalize">
                                    {user.full_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-stone-100" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold truncate leading-tight"
                                style={{ color: "var(--color-text-primary, #171717)" }}>{user.full_name}</p>
                            <p className="text-[10px] truncate mt-0.5"
                                style={{ color: "var(--color-text-muted, #a3a3a3)" }}>{user.email}</p>
                        </div>
                    </div>
                    {/* Creator badge */}
                    <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                        style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.15)" }}>
                        <Star className="h-3 w-3 text-[#fd5000]" />
                        <span className="text-[10px] font-bold text-[#fd5000]">Creator account · Pro</span>
                    </div>
                </div>

                {/* Menu items */}
                {[
                    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
                    { href: "/dashboard/library", icon: Video, label: "Digital Library" },
                    { href: "/dashboard/settings", icon: Settings, label: "Account Settings" },
                ].map((item) => (
                    <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent">
                        <Link href={item.href}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                            style={{ color: "var(--color-text-primary, #171717)" }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--color-surface-secondary, #f5f5f5)")}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "")}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                                <item.icon className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                            </div>
                            {item.label}
                        </Link>
                    </DropdownMenuItem>
                ))}

                <div className="h-px my-1 mx-1" style={{ background: "var(--color-border, #e5e5e5)" }} />

                <DropdownMenuItem
                    onSelect={async () => { await signOut(); window.location.href = "/"; }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer focus:bg-transparent transition-colors mx-0"
                >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-rose-50 dark:bg-rose-500/10">
                        <LogOut className="h-3.5 w-3.5 text-rose-500" />
                    </div>
                    Sign out
                </DropdownMenuItem>

                {/* Theme row (hidden on wide screens) */}
                <DropdownMenuItem className="min-[1280px]:hidden flex items-center justify-between px-3 py-2.5 rounded-xl focus:bg-transparent mx-0">
                    <div className="flex items-center gap-2.5 text-[13px] font-semibold" style={{ color: "var(--color-text-primary, #171717)" }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                            <Sun className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                        </div>
                        Appearance
                    </div>
                    <ThemeToggle />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/* ─────────────────── NAVBAR PROPS ─────────────────── */
interface NavbarProps {
    user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
    marketing: MarketingSettings;
}

/* ═══════════════════════════════════════════════════════
   MAIN NAVBAR
═══════════════════════════════════════════════════════ */
export function Navbar({ user, marketing }: NavbarProps) {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [marketplaceOpen, setMarketplaceOpen] = useState(false);
    const [portalReady, setPortalReady] = useState(false);
    const [searchQ, setSearchQ] = useState("");
    const marketplaceTimer = useRef<NodeJS.Timeout | null>(null);

    const { cartCount, chatCount, refreshCounts } = useCartStore();
    const { openAssistant } = useAIStore();
    const pathname = usePathname();
    const router = useRouter();
    const navHidden = useScrollDirection();

    const topBarOpacity = useTransform(scrollY, [0, 35], [1, 0]);
    const topBarH = useTransform(scrollY, [0, 35], [32, 0]);

    /* effects */
    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 12);
        window.addEventListener("scroll", fn, { passive: true });
        return () => window.removeEventListener("scroll", fn);
    }, []);
    useEffect(() => setPortalReady(true), []);
    useEffect(() => { document.body.style.overflow = mobileOpen || searchOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [mobileOpen, searchOpen]);
    useEffect(() => { if (user) refreshCounts(); }, [user, refreshCounts]);
    useEffect(() => { setSearchOpen(false); setSearchQ(""); setMobileOpen(false); }, [pathname]);
    useEffect(() => {
        const fn = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
            if (e.key === "Escape") { setSearchOpen(false); setSearchQ(""); }
        };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, []);

    const navLinks = ensureCoreNavLinks(marketing.nav_links ?? []);
    const marketplaceVariants = [
        { title: "Digital Market", desc: "Software, courses & assets", href: "/marketplace?type=digital", icon: Zap, color: "#0ea5e9", badge: "Hot" },
        { title: "Physical Market", desc: "Real-world goods & equipment", href: "/marketplace?type=physical", icon: Package, color: "#f59e0b" },
        { title: "All Products", desc: "Complete global catalog", href: "/marketplace", icon: ShoppingBag, color: "#fd5000" },
    ];

    const runSearch = useCallback((override?: string) => {
        const t = (override ?? searchQ).trim();
        const qs = t ? `?q=${encodeURIComponent(t)}` : "";
        router.push(`/marketplace${qs}`);
        setSearchOpen(false); setSearchQ(""); setMobileOpen(false);
    }, [router, searchQ]);

    return (
        <header className="fixed top-0 inset-x-0 z-[100] pointer-events-none">
            <div className={cn(
                "pointer-events-auto relative transition-all duration-300",
                scrolled
                    ? "bg-white/92 dark:bg-[#0a0a0a]/92 backdrop-blur-2xl shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]"
                    : "bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl"
            )}>
                {/* Top gradient line */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#fd5000]/30 to-transparent pointer-events-none" />

                {/* ── TOP STRIP ── */}
                <motion.div
                    style={{ height: topBarH, opacity: topBarOpacity }}
                    className="hidden md:block overflow-hidden"
                >
                    <div className="h-8 flex items-center justify-between px-8 max-w-[1400px] mx-auto"
                        style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-1.5">
                                <Globe className="h-3 w-3 text-[#fd5000]" />
                                <span className="text-[10px] font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest">
                                    Global Sourcing Network
                                </span>
                            </div>
                            <div className="h-3 w-px bg-stone-200 dark:bg-stone-800" />
                            <CurrencySelector className="h-5 bg-transparent border-0 focus:ring-0 px-0 ring-0 text-[10px] font-bold text-stone-500 hover:text-stone-800 transition-colors" />
                        </div>
                        <div className="flex items-center gap-5">
                            <Link href="/help" className="text-[10px] font-bold text-stone-500 hover:text-[#fd5000] transition-colors uppercase tracking-wide">
                                Support
                            </Link>
                            <div className="h-3 w-px bg-stone-200 dark:bg-stone-800" />
                            <Link href="/vendors" className="text-[10px] font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors uppercase tracking-wide">
                                Sell on Jimvio
                            </Link>
                        </div>
                    </div>
                </motion.div>

                {/* ── MAIN BAR ── */}
                <div className="max-w-[1400px] mx-auto px-3 sm:px-5 md:px-8 h-[58px] flex items-center gap-2 md:gap-3">

                    {/* Logo */}
                    <JimvioLogo href="/" size="xl" className="text-[34px] tracking-[0.03em] shrink-0 mr-2" />

                    {/* Divider */}
                    <div className="hidden lg:block h-5 w-px bg-stone-200 dark:bg-stone-800 shrink-0 mx-0.5" />

                    {/* ── DESKTOP NAV ── */}
                    <nav className="hidden min-[1100px]:flex items-center gap-0.5">
                        {/* Marketplace dropdown */}
                        <div
                            onMouseEnter={() => { if (marketplaceTimer.current) clearTimeout(marketplaceTimer.current); setMarketplaceOpen(true); }}
                            onMouseLeave={() => { marketplaceTimer.current = setTimeout(() => setMarketplaceOpen(false), 150); }}
                        >
                            <MarketplaceDropdown
                                open={marketplaceOpen}
                                onMouseEnter={() => { if (marketplaceTimer.current) clearTimeout(marketplaceTimer.current); setMarketplaceOpen(true); }}
                                onMouseLeave={() => { marketplaceTimer.current = setTimeout(() => setMarketplaceOpen(false), 150); }}
                                variants={marketplaceVariants}
                            />
                        </div>

                        {/* Other nav links */}
                        {navLinks.filter((l) => l.href !== "/marketplace").map((item) => {
                            const active = isActive(pathname, item.href);
                            const Icon = iconForHref(item.href);
                            return (
                                <NavBtn key={item.href} href={item.href} active={active} className="group">
                                    <Icon className={cn(
                                        "h-3.5 w-3.5 shrink-0 transition-colors",
                                        active ? "text-[#fd5000]" : "text-stone-400 group-hover:text-[#fd5000]"
                                    )} />
                                    <span className={active ? "text-stone-900 dark:text-white" : "text-stone-600 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-white"}>
                                        {item.label}
                                    </span>
                                    {/* Active indicator dot */}
                                    {active && (
                                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#fd5000]" />
                                    )}
                                </NavBtn>
                            );
                        })}
                    </nav>

                    {/* ── RIGHT SIDE ── */}
                    <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">

                        {/* Centered search trigger — desktop */}
                        <div className="hidden min-[900px]:flex flex-1 max-w-[280px] justify-center">
                            <SearchTrigger
                                placeholder={marketing.search_placeholder}
                                onClick={() => setSearchOpen(true)}
                            />
                        </div>

                        {/* AI button */}
                        <NavBtn
                            accent
                            className="hidden min-[1180px]:flex text-[11px] font-bold uppercase tracking-wider px-3.5 shrink-0"
                            onClick={() => openAssistant()}
                        >
                            <Sparkles className="h-3.5 w-3.5 fill-white stroke-none" />
                            AI
                        </NavBtn>

                        {/* Divider */}
                        <div className="hidden min-[1000px]:block h-5 w-px shrink-0 mx-0.5 bg-stone-200 dark:bg-stone-800" />

                        {/* Messages */}
                        {user && (
                            <IconBtn href="/dashboard/messages" badge={chatCount}>
                                <MessageCircle className="h-[18px] w-[18px]" />
                            </IconBtn>
                        )}

                        {/* Cart */}
                        <IconBtn href="/cart" badge={cartCount}>
                            <ShoppingCart className="h-[18px] w-[18px]" />
                        </IconBtn>

                        {/* Theme toggle */}
                        <div className="hidden min-[1280px]:flex">
                            <ThemeToggle />
                        </div>

                        {/* User menu OR auth buttons */}
                        <div className="hidden sm:flex items-center shrink-0 ml-0.5">
                            {user ? (
                                <UserMenu user={user} />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Link href="/login"
                                        className="h-9 px-4 flex items-center rounded-xl text-[12px] font-bold border transition-all whitespace-nowrap active:scale-[0.97]"
                                        style={{
                                            color: "var(--color-text-primary, #171717)",
                                            border: "1px solid var(--color-border, #e5e5e5)",
                                            background: "var(--color-surface, #fff)",
                                        }}>
                                        Log in
                                    </Link>
                                    <Link href="/register"
                                        className="h-9 px-4 flex items-center rounded-xl text-[12px] font-black uppercase tracking-wider text-white transition-all active:scale-95 shrink-0 whitespace-nowrap"
                                        style={{ background: "#fd5000", boxShadow: "0 2px 8px rgba(253,80,0,0.3)" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#e04700")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "#fd5000")}>
                                        Join free
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Mobile search icon */}
                        <IconBtn className="min-[900px]:hidden" onClick={() => setSearchOpen(true)}>
                            <Search className="h-[18px] w-[18px]" />
                        </IconBtn>

                        {/* Mobile hamburger */}
                        <IconBtn className="min-[1100px]:hidden" onClick={() => setMobileOpen(true)}>
                            <Menu className="h-[18px] w-[18px]" />
                        </IconBtn>
                    </div>
                </div>
            </div>

            {/* ── SEARCH OVERLAY ── */}
            {portalReady && createPortal(
                <SearchOverlay
                    open={searchOpen}
                    onClose={() => { setSearchOpen(false); setSearchQ(""); }}
                    searchQ={searchQ}
                    setSearchQ={setSearchQ}
                    runSearch={runSearch}
                    navLinks={navLinks}
                    marketing={marketing}
                />,
                document.body
            )}

            {/* ── MOBILE DRAWER ── */}
            {portalReady && createPortal(
                <MobileDrawer
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    user={user}
                    pathname={pathname}
                    marketplaceVariants={marketplaceVariants}
                    navLinks={navLinks}
                    openAssistant={openAssistant}
                />,
                document.body
            )}

            {/* ── MOBILE BOTTOM TAB BAR ── */}
            {portalReady && createPortal(
                <div className="min-[1100px]:hidden fixed bottom-0 inset-x-0 z-[100] pointer-events-none">
                    <motion.nav
                        initial={{ y: 80 }}
                        animate={{ y: navHidden ? 80 : 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="pointer-events-auto"
                        style={{
                            background: "rgba(255,255,255,0.96)",
                            backdropFilter: "blur(20px)",
                            borderTop: "1px solid rgba(0,0,0,0.06)",
                            boxShadow: "0 -8px 32px rgba(0,0,0,0.06)",
                        }}
                    >
                        <div className="flex items-center h-16 px-2 max-w-sm mx-auto">
                            {[
                                { label: "Home", href: "/", icon: Home },
                                { label: "Market", href: "/marketplace", icon: ShoppingBag },
                                { label: "Cart", href: "/cart", icon: ShoppingCart, badge: cartCount },
                                { label: "Menu", href: null, icon: Menu, action: () => setMobileOpen(true) },
                            ].map((link) => {
                                const active = link.href ? isActive(pathname, link.href) : false;
                                return link.href ? (
                                    <Link key={link.href} href={link.href}
                                        className={cn("relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200",
                                            active ? "text-[#fd5000]" : "text-stone-400")}>
                                        <div className="relative">
                                            <link.icon className={cn("h-5 w-5 transition-all", active ? "scale-110" : "scale-100")} strokeWidth={active ? 2.5 : 2} />
                                            {link.badge != null && link.badge > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 bg-[#fd5000] text-white text-[9px] font-black flex items-center justify-center rounded-full">
                                                    {link.badge}
                                                </span>
                                            )}
                                            {active && <motion.div layoutId="tab-glow" className="absolute inset-0 bg-[#fd5000]/20 blur-xl rounded-full" />}
                                        </div>
                                        <span className={cn("text-[9px] font-bold tracking-tight", active ? "opacity-100" : "opacity-50")}>
                                            {link.label}
                                        </span>
                                        {active && <motion.div layoutId="tab-active" className="absolute top-0 h-[2px] w-8 rounded-b-full bg-[#fd5000]" />}
                                    </Link>
                                ) : (
                                    <button key="menu" onClick={link.action}
                                        className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-stone-400 transition-all">
                                        <link.icon className="h-5 w-5" strokeWidth={2} />
                                        <span className="text-[9px] font-bold tracking-tight opacity-50">{link.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.nav>
                </div>,
                document.body
            )}
        </header>
    );
}

/* ═══════════════════════════════════════════════════════
   MOBILE DRAWER
═══════════════════════════════════════════════════════ */
interface MobileDrawerProps {
    open: boolean; onClose: () => void;
    user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
    pathname: string;
    marketplaceVariants: { title: string; desc: string; href: string; icon: LucideIcon; color: string; badge?: string }[];
    navLinks: NavLinkConfig[]; openAssistant: () => void;
}

function MobileDrawer({ open, onClose, user, pathname, marketplaceVariants, navLinks, openAssistant }: MobileDrawerProps) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const toggle = (s: string) => setExpanded((p) => (p === s ? null : s));

    const accountLinks = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/dashboard/library", icon: Video, label: "Digital Library" },
        { href: "/dashboard/settings", icon: Settings, label: "Account Settings" },
    ];

    function NavRow({ href, icon: Icon, label, active }: { href: string; icon: LucideIcon; label: string; active: boolean }) {
        return (
            <Link href={href} onClick={onClose}
                className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-semibold transition-all",
                    active ? "text-[#fd5000]" : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5"
                )}
                style={active ? { background: "rgba(253,80,0,0.06)", border: "1px solid rgba(253,80,0,0.12)" } : { border: "1px solid transparent" }}
            >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={active
                        ? { background: "rgba(253,80,0,0.1)" }
                        : { background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }
                    }>
                    <Icon className={cn("h-4 w-4", active ? "text-[#fd5000]" : "text-stone-400")} />
                </div>
                <span className="flex-1">{label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-[#fd5000]" />}
            </Link>
        );
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[9998]"
                        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                    />
                    <motion.div
                        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 280 }}
                        className="fixed inset-y-0 right-0 w-[88%] max-w-[380px] z-[9999] flex flex-col"
                        style={{ background: "var(--color-surface, #fff)", borderLeft: "1px solid var(--color-border, #e5e5e5)", boxShadow: "-20px 0 60px rgba(0,0,0,0.15)" }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 shrink-0"
                            style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                            <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "#fd5000" }}>
                                    <Zap className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="text-[14px] font-bold" style={{ color: "var(--color-text-primary, #171717)" }}>Jimvio</span>
                            </div>
                            <button onClick={onClose}
                                className="h-8 w-8 flex items-center justify-center rounded-xl transition-all active:scale-95"
                                style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                                <X className="h-4 w-4" style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                            <div className="p-4 space-y-4">

                                {/* User card */}
                                {user ? (
                                    <div className="rounded-2xl overflow-hidden"
                                        style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                                        <button onClick={() => toggle("account")}
                                            className="w-full flex items-center gap-3 p-4 transition-all hover:bg-stone-100 dark:hover:bg-white/5">
                                            <div className="relative shrink-0">
                                                <Avatar className="h-10 w-10 rounded-xl ring-2 ring-white dark:ring-stone-800">
                                                    <AvatarImage src={user.avatar_url ?? undefined} className="rounded-xl" />
                                                    <AvatarFallback className="bg-gradient-to-br from-[#fd5000] to-orange-600 rounded-xl text-white text-[11px] font-bold">
                                                        {user.full_name?.[0] || user.email?.[0] || "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-stone-800" />
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="text-[14px] font-bold truncate leading-tight"
                                                    style={{ color: "var(--color-text-primary, #171717)" }}>{user.full_name || "My Account"}</p>
                                                <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-text-muted, #a3a3a3)" }}>{user.email}</p>
                                            </div>
                                            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-300", expanded === "account" && "rotate-180")}
                                                style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                                        </button>

                                        <AnimatePresence>
                                            {expanded === "account" && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                                                    className="overflow-hidden"
                                                    style={{ borderTop: "1px solid var(--color-border, #e5e5e5)" }}>
                                                    <div className="p-2 space-y-0.5">
                                                        {accountLinks.map((link) => (
                                                            <Link key={link.href} href={link.href} onClick={onClose}
                                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:bg-stone-50 dark:hover:bg-white/5"
                                                                style={{ color: "var(--color-text-primary, #171717)" }}>
                                                                <link.icon className="h-4 w-4 shrink-0" style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                                                                {link.label}
                                                            </Link>
                                                        ))}
                                                        <div className="h-px mx-1 my-1" style={{ background: "var(--color-border, #e5e5e5)" }} />
                                                        <button onClick={async () => { await signOut(); window.location.href = "/"; }}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all">
                                                            <LogOut className="h-4 w-4 shrink-0" />
                                                            Sign out
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl p-3 space-y-2"
                                        style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                                        <p className="text-[11px] font-semibold px-1 pb-1" style={{ color: "var(--color-text-muted, #a3a3a3)" }}>
                                            Join the Jimvio network
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Link href="/login" onClick={onClose}
                                                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
                                                style={{ background: "var(--color-surface, #fff)", border: "1px solid var(--color-border, #e5e5e5)", color: "var(--color-text-primary, #171717)" }}>
                                                <User className="h-4 w-4" style={{ color: "var(--color-text-muted, #a3a3a3)" }} /> Log in
                                            </Link>
                                            <Link href="/register" onClick={onClose}
                                                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black text-white transition-all active:scale-95"
                                                style={{ background: "#fd5000", boxShadow: "0 4px 12px rgba(253,80,0,0.3)" }}>
                                                <Sparkles className="h-4 w-4" /> Join free
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                {/* AI Assistant CTA */}
                                <button onClick={() => { openAssistant(); onClose(); }}
                                    className="w-full relative flex items-center gap-4 p-4 rounded-2xl overflow-hidden active:scale-[0.98] transition-all"
                                    style={{ background: "#fd5000" }}>
                                    <div className="absolute -right-4 -top-4 h-20 w-20 bg-white/15 rounded-full blur-xl pointer-events-none" />
                                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                                        <Sparkles className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-[14px] font-bold text-white leading-tight">Neural Core AI</p>
                                        <p className="text-[11px] font-medium text-white/70 mt-0.5">Shopping Assistant</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-white/60 shrink-0" />
                                </button>

                                {/* Navigation */}
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2"
                                        style={{ color: "var(--color-text-muted, #a3a3a3)" }}>Navigation</p>
                                    <div className="space-y-0.5">
                                        <NavRow href="/" icon={Home} label="Home" active={pathname === "/"} />

                                        {/* Marketplace expand */}
                                        <div>
                                            <button onClick={() => toggle("market")}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-semibold transition-all",
                                                    expanded === "market" ? "bg-stone-100 dark:bg-white/8" : "hover:bg-stone-50 dark:hover:bg-white/5"
                                                )}
                                                style={{ border: "1px solid transparent", color: "var(--color-text-primary, #171717)" }}>
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                                                    <ShoppingBag className="h-4 w-4 text-stone-400" />
                                                </div>
                                                <span className="flex-1 text-left">Marketplace</span>
                                                <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", expanded === "market" && "rotate-180")}
                                                    style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                                            </button>

                                            <AnimatePresence>
                                                {expanded === "market" && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                                                        className="overflow-hidden">
                                                        <div className="pl-3 pt-1 space-y-0.5">
                                                            {marketplaceVariants.map((v) => (
                                                                <Link key={v.href} href={v.href} onClick={onClose}
                                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-stone-50 dark:hover:bg-white/5 group">
                                                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                                        style={{ background: `${v.color}15`, border: `1px solid ${v.color}25` }}>
                                                                        <v.icon className="h-3.5 w-3.5" style={{ color: v.color }} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[12px] font-semibold leading-none"
                                                                            style={{ color: "var(--color-text-primary, #171717)" }}>{v.title}</p>
                                                                        {v.desc && <p className="text-[10px] mt-0.5 truncate"
                                                                            style={{ color: "var(--color-text-muted, #a3a3a3)" }}>{v.desc}</p>}
                                                                    </div>
                                                                    {v.badge && (
                                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                                                            style={{ background: "#fd5000" }}>{v.badge}</span>
                                                                    )}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <NavRow href="/communities" icon={Users} label="Communities" active={pathname.startsWith("/communities")} />
                                        <NavRow href="/help" icon={CircleHelp} label="Help Center" active={pathname.startsWith("/help")} />
                                    </div>
                                </div>

                                {/* Theme + Currency */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                                        <div className="flex items-center gap-2">
                                            <Sun className="h-3.5 w-3.5 text-amber-500" />
                                            <span className="text-[12px] font-semibold" style={{ color: "var(--color-text-primary, #171717)" }}>Theme</span>
                                        </div>
                                        <ThemeToggle />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: "var(--color-surface-secondary, #f5f5f5)", border: "1px solid var(--color-border, #e5e5e5)" }}>
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-3.5 w-3.5 text-emerald-500" />
                                            <span className="text-[12px] font-semibold" style={{ color: "var(--color-text-primary, #171717)" }}>USD</span>
                                        </div>
                                        <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted, #a3a3a3)" }} />
                                    </div>
                                </div>

                                {/* Currency widget */}
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2"
                                        style={{ color: "var(--color-text-muted, #a3a3a3)" }}>Live Rates</p>
                                    <CurrencyConverterWidget variant="compact" className="mx-0" />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 flex items-center justify-between shrink-0"
                            style={{ borderTop: "1px solid var(--color-border, #e5e5e5)", background: "var(--color-surface-secondary, #f5f5f5)" }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: "var(--color-text-muted, #a3a3a3)" }}>Jimvio Protocol</p>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted, #a3a3a3)" }}>Online</span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
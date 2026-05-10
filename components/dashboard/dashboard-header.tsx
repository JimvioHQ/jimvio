// "use client";

// import React, { useState, useRef, useEffect } from "react";
// import Link from "next/link";
// import {
//     Search,
//     Plus,
//     Globe,
//     Bell,
//     ChevronDown,
//     Check,
//     Settings,
//     LogOut,
//     Wallet,
//     UserRound,
//     Package,
//     Megaphone,
//     Users,
//     Radio,
//     X,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { createClient } from "@/lib/supabase/client";
// import { ThemeToggle } from "@/components/ui/theme-toggle";
// import { CurrencySelector } from "@/context/CurrencyContext";
// import { SignOutButton } from "@/components/auth/sign-out-button";
// import { useUserStore } from "@/lib/store/use-user-store";
// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuLabel,
//     DropdownMenuSeparator,
//     DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface UserProfile {
//     email: string;
//     full_name: string | null;
//     avatar_url: string | null;
// }

// interface DashboardHeaderProps {
//     onMobileMenuOpen?: () => void;
//     unreadNotifications?: number;
// }

// // ─── Create menu items ────────────────────────────────────────────────────────

// const CREATE_ITEMS = [
//     {
//         icon: Package,
//         label: "Create product",
//         sub: "Add a new product",
//         href: "/dashboard/products/new",
//     },
//     {
//         icon: Megaphone,
//         label: "Create post",
//         sub: "Share with your audience",
//         href: "/dashboard/posts/new",
//     },
//     {
//         icon: Radio,
//         label: "Start campaign",
//         sub: "Launch UGC or clipping campaign",
//         href: "/dashboard/vendor/campaigns/new",
//     },
//     {
//         icon: Users,
//         label: "Create community",
//         sub: "Build a new community",
//         href: "/communities/create",
//     },
// ];

// const ROLES = [
//     { key: "buyer", label: "Buyer" },
//     { key: "affiliate", label: "Affiliate" },
//     { key: "vendor", label: "Seller" },
//     { key: "influencer", label: "Creator" },
//     { key: "community_owner", label: "Community Owner" },
// ] as const;

// // ─── Search bar ───────────────────────────────────────────────────────────────

// function GlobalSearch() {
//     const [focused, setFocused] = useState(false);
//     const [query, setQuery] = useState("");
//     const inputRef = useRef<HTMLInputElement>(null);

//     useEffect(() => {
//         function onKey(e: KeyboardEvent) {
//             if ((e.metaKey || e.ctrlKey) && e.key === "k") {
//                 e.preventDefault();
//                 inputRef.current?.focus();
//             }
//             if (e.key === "Escape") inputRef.current?.blur();
//         }
//         window.addEventListener("keydown", onKey);
//         return () => window.removeEventListener("keydown", onKey);
//     }, []);

//     return (
//         <div className="flex-1 max-w-lg">
//             <div
//                 className={cn(
//                     "relative flex items-center h-9 rounded-[var(--radius-sm)] border transition-all duration-200",
//                     focused
//                         ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-[var(--shadow-glow)]"
//                         : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
//                 )}
//             >
//                 <Search className="absolute left-3 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
//                 <input
//                     ref={inputRef}
//                     type="text"
//                     value={query}
//                     onChange={(e) => setQuery(e.target.value)}
//                     onFocus={() => setFocused(true)}
//                     onBlur={() => setFocused(false)}
//                     placeholder="Search anything..."
//                     className="w-full h-full pl-9 pr-20 bg-transparent text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
//                 />
//                 {query ? (
//                     <button
//                         type="button"
//                         onClick={() => setQuery("")}
//                         className="absolute right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
//                     >
//                         <X className="h-3.5 w-3.5" />
//                     </button>
//                 ) : (
//                     <div className="absolute right-3 flex items-center gap-1 pointer-events-none">
//                         <kbd className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded font-mono text-[var(--color-text-muted)]">
//                             ⌘
//                         </kbd>
//                         <kbd className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded font-mono text-[var(--color-text-muted)]">
//                             K
//                         </kbd>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

// // ─── Create button + dropdown ─────────────────────────────────────────────────

// function CreateMenu() {
//     return (
//         <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//                 <button
//                     className={cn(
//                         "flex items-center gap-2 h-9 px-4 rounded-[var(--radius-sm)]",
//                         "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]",
//                         "text-white text-[12px] font-semibold transition-all duration-200",
//                         "active:scale-95 shadow-[var(--shadow-sm)]"
//                     )}
//                 >
//                     <Plus className="h-3.5 w-3.5" />
//                     Create
//                     <ChevronDown className="h-3 w-3 opacity-80" />
//                 </button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent
//                 align="end"
//                 sideOffset={8}
//                 className="w-60 rounded-[var(--radius-md)] p-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
//             >
//                 {CREATE_ITEMS.map((item) => (
//                     <DropdownMenuItem key={item.href} asChild className="rounded-[var(--radius-sm)] focus:bg-[var(--color-surface-secondary)] cursor-pointer p-0">
//                         <Link href={item.href} className="flex items-center gap-3 px-3 py-2.5">
//                             <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
//                                 <item.icon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
//                             </div>
//                             <div className="min-w-0">
//                                 <p className="text-[12px] font-semibold text-[var(--color-text-primary)] leading-tight capitalize">
//                                     {item.label}
//                                 </p>
//                                 <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
//                                     {item.sub}
//                                 </p>
//                             </div>
//                         </Link>
//                     </DropdownMenuItem>
//                 ))}
//             </DropdownMenuContent>
//         </DropdownMenu>
//     );
// }

// // ─── User menu + role switcher ────────────────────────────────────────────────

// function UserMenu({ user }: { user: UserProfile }) {
//     const { activeRoles } = useUserStore();
//     const [currentRole, setCurrentRole] = useState("affiliate");

//     const initials = user.full_name
//         ? user.full_name.substring(0, 2).toUpperCase()
//         : user.email
//             ? user.email.substring(0, 2).toUpperCase()
//             : "U";

//     const displayRole =
//         ROLES.find((r) => r.key === currentRole)?.label ?? "Affiliate";

//     return (
//         <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//                 <button
//                     className={cn(
//                         "flex items-center gap-2.5 h-9 pl-2 pr-3 rounded-[var(--radius-sm)]",
//                         "bg-[var(--color-surface)] border border-[var(--color-border)]",
//                         "hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)]",
//                         "transition-all duration-200 active:scale-95"
//                     )}
//                 >
//                     {/* Avatar */}
//                     <div className="w-6 h-6 rounded-full bg-[var(--color-accent-light)] border border-[var(--color-border)] overflow-hidden flex items-center justify-center flex-shrink-0">
//                         {user.avatar_url && user.avatar_url.trim() ? (
//                             <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
//                         ) : (
//                             <span className="text-[10px] font-bold text-[var(--color-accent)]">{initials}</span>
//                         )}
//                     </div>
//                     <span className="text-[12px] font-semibold text-[var(--color-text-primary)] hidden sm:block max-w-[100px] truncate">
//                         {user.full_name?.split(" ")[0] ?? "Account"}
//                     </span>
//                     <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)]" />
//                 </button>
//             </DropdownMenuTrigger>

//             <DropdownMenuContent
//                 align="end"
//                 sideOffset={8}
//                 className="w-60 rounded-[var(--radius-md)] p-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
//             >
//                 {/* Identity */}
//                 <div className="px-3 py-2.5 border-b border-[var(--color-border)] mb-1">
//                     <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate">
//                         {user.full_name ?? "Account"}
//                     </p>
//                     <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">
//                         {user.email}
//                     </p>
//                 </div>

//                 {/* Current role */}
//                 <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
//                     <div className="flex items-center justify-between mb-1.5">
//                         <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
//                             Current role
//                         </span>
//                         <span className="text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2 py-0.5 rounded-full">
//                             {displayRole}
//                         </span>
//                     </div>
//                     <p className="text-[10px] text-[var(--color-text-muted)]">Switch role</p>
//                     <div className="mt-2 space-y-px">
//                         {ROLES.map((role) => (
//                             <button
//                                 key={role.key}
//                                 type="button"
//                                 onClick={() => setCurrentRole(role.key)}
//                                 className={cn(
//                                     "w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors",
//                                     currentRole === role.key
//                                         ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
//                                         : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
//                                 )}
//                             >
//                                 {role.label}
//                                 {currentRole === role.key && (
//                                     <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" />
//                                 )}
//                             </button>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Actions */}
//                 <DropdownMenuItem asChild className="rounded-[var(--radius-sm)] focus:bg-[var(--color-surface-secondary)] cursor-pointer">
//                     <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2">
//                         <Settings className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
//                         <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Account settings</span>
//                     </Link>
//                 </DropdownMenuItem>

//                 <DropdownMenuItem asChild className="rounded-[var(--radius-sm)] focus:bg-[var(--color-surface-secondary)] cursor-pointer">
//                     <Link href="/dashboard/wallet" className="flex items-center gap-2.5 px-3 py-2">
//                         <Wallet className="h-3.5 w-3.5 text-[var(--color-accent)]" />
//                         <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">My wallet</span>
//                     </Link>
//                 </DropdownMenuItem>

//                 <DropdownMenuSeparator className="bg-[var(--color-border)] my-1" />

//                 <div className="px-1">
//                     <SignOutButton variant="menu" />
//                 </div>
//             </DropdownMenuContent>
//         </DropdownMenu>
//     );
// }

// // ─── Main header ──────────────────────────────────────────────────────────────

// export function DashboardHeader({
//     onMobileMenuOpen,
//     unreadNotifications = 2,
// }: DashboardHeaderProps) {
//     const [user, setUser] = useState<UserProfile>({
//         email: "",
//         full_name: null,
//         avatar_url: null,
//     });

//     useEffect(() => {
//         async function load() {
//             const supabase = createClient();
//             const {
//                 data: { user: authUser },
//             } = await supabase.auth.getUser();
//             if (!authUser) return;
//             const { data } = await supabase
//                 .from("profiles")
//                 .select("email, full_name, avatar_url")
//                 .eq("id", authUser.id)
//                 .single();
//             if (data) setUser(data);
//         }
//         load();
//     }, []);

//     return (
//         <header
//             className={cn(
//                 "sticky top-0 z-40 flex-shrink-0",
//                 "flex items-center justify-between gap-4 px-4 sm:px-6 h-14",
//                 "bg-[var(--color-surface)] border-b border-[var(--color-border)]"
//             )}
//         >
//             {/* Left: mobile hamburger + desktop title */}
//             <div className="flex items-center gap-3 min-w-0">
//                 {/* Mobile menu trigger */}
//                 {onMobileMenuOpen && (
//                     <button
//                         type="button"
//                         onClick={onMobileMenuOpen}
//                         aria-label="Open menu"
//                         className={cn(
//                             "lg:hidden flex items-center justify-center h-9 w-9",
//                             "rounded-[var(--radius-sm)] border border-[var(--color-border)]",
//                             "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
//                             "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
//                             "transition-colors"
//                         )}
//                     >
//                         <svg
//                             className="h-4 w-4"
//                             fill="none"
//                             stroke="currentColor"
//                             strokeWidth={2}
//                             viewBox="0 0 24 24"
//                         >
//                             <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
//                         </svg>
//                     </button>
//                 )}

//                 {/* Desktop page label */}
//                 <span className="hidden lg:block text-[13px] font-semibold text-[var(--color-text-primary)] uppercase tracking-widest select-none">
//                     Dashboard
//                 </span>
//             </div>

//             {/* Center: search */}
//             <GlobalSearch />

//             {/* Right: actions */}
//             <div className="flex items-center gap-2 flex-shrink-0">
//                 {/* Create */}
//                 <CreateMenu />

//                 {/* Language */}
//                 <button
//                     className={cn(
//                         "hidden sm:flex items-center gap-1.5 h-9 px-2.5",
//                         "rounded-[var(--radius-sm)] border border-[var(--color-border)]",
//                         "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
//                         "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
//                         "text-[12px] font-semibold transition-colors"
//                     )}
//                 >
//                     <Globe className="h-3.5 w-3.5" />
//                     EN
//                 </button>

//                 {/* Currency */}
//                 <div className="hidden sm:block">
//                     <CurrencySelector
//                         className={cn(
//                             "h-9 rounded-[var(--radius-sm)] text-[11px] font-bold",
//                             "bg-[var(--color-surface)] border border-[var(--color-border)] px-3",
//                             "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]",
//                             "transition-colors"
//                         )}
//                     />
//                 </div>

//                 {/* Theme toggle */}
//                 <ThemeToggle />

//                 {/* Notifications */}
//                 <Link
//                     href="/dashboard/notifications"
//                     className={cn(
//                         "relative flex items-center justify-center h-9 w-9",
//                         "rounded-[var(--radius-sm)] border border-[var(--color-border)]",
//                         "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
//                         "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
//                         "transition-colors"
//                     )}
//                 >
//                     <Bell className="h-4 w-4" />
//                     {unreadNotifications > 0 && (
//                         <span
//                             className={cn(
//                                 "absolute -top-1 -right-1",
//                                 "w-4 h-4 rounded-full",
//                                 "bg-[var(--color-accent)] text-white",
//                                 "text-[9px] font-bold flex items-center justify-center",
//                                 "border-2 border-[var(--color-surface)]"
//                             )}
//                         >
//                             {unreadNotifications > 9 ? "9+" : unreadNotifications}
//                         </span>
//                     )}
//                 </Link>

//                 {/* User */}
//                 <UserMenu user={user} />
//             </div>
//         </header>
//     );
// }
"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
    Search,
    Plus,
    Globe,
    Bell,
    ChevronDown,
    Check,
    Settings,
    LogOut,
    Wallet,
    UserRound,
    Package,
    Megaphone,
    Users,
    Radio,
    X,
    MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrencySelector } from "@/context/CurrencyContext";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { useUserStore } from "@/lib/store/use-user-store";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
}

interface DashboardHeaderProps {
    onMobileMenuOpen?: () => void;
    unreadNotifications?: number;
}

// ─── Create menu items ────────────────────────────────────────────────────────

const CREATE_ITEMS = [
    {
        icon: Package,
        label: "Create product",
        sub: "Add a new product",
        href: "/dashboard/products/new",
    },
    {
        icon: Megaphone,
        label: "Create post",
        sub: "Share with your audience",
        href: "/dashboard/posts/new",
    },
    {
        icon: Radio,
        label: "Start campaign",
        sub: "Launch UGC or clipping campaign",
        href: "/dashboard/vendor/campaigns/new",
    },
    {
        icon: Users,
        label: "Create community",
        sub: "Build a new community",
        href: "/communities/create",
    },
];

const ROLES = [
    { key: "buyer", label: "Buyer" },
    { key: "affiliate", label: "Affiliate" },
    { key: "vendor", label: "Seller" },
    { key: "influencer", label: "Creator" },
    { key: "community_owner", label: "Community Owner" },
] as const;

// ─── Search bar ───────────────────────────────────────────────────────────────

/**
 * On desktop (md+): always-visible inline search bar.
 * On mobile: a search icon button that expands to a full-width
 * overlay bar inside the header row.
 */
function GlobalSearch({
    mobileOpen,
    onMobileToggle,
}: {
    mobileOpen: boolean;
    onMobileToggle: () => void;
}) {
    const [focused, setFocused] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);

    // ⌘K shortcut (desktop)
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === "Escape") {
                inputRef.current?.blur();
                mobileInputRef.current?.blur();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Auto-focus mobile input when overlay opens
    useEffect(() => {
        if (mobileOpen) {
            setTimeout(() => mobileInputRef.current?.focus(), 50);
        }
    }, [mobileOpen]);

    const searchField = (
        ref: React.RefObject<HTMLInputElement>,
        extraClass?: string
    ) => (
        <div
            className={cn(
                "relative flex items-center h-9 rounded-[var(--radius-sm)] border transition-all duration-200",
                focused
                    ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-[var(--shadow-glow)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]",
                extraClass
            )}
        >
            <Search className="absolute left-3 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
            <input
                ref={ref}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search anything..."
                className="w-full h-full pl-9 pr-20 bg-transparent text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
            />
            {query ? (
                <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            ) : (
                <div className="absolute right-3 hidden sm:flex items-center gap-1 pointer-events-none">
                    <kbd className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded font-mono text-[var(--color-text-muted)]">
                        ⌘
                    </kbd>
                    <kbd className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded font-mono text-[var(--color-text-muted)]">
                        K
                    </kbd>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* ── Desktop: always-visible, centred ── */}
            <div className="hidden md:flex flex-1 max-w-lg">
                {searchField(inputRef as React.RefObject<HTMLInputElement>)}
            </div>

            {/* ── Mobile: icon trigger ── */}
            <button
                type="button"
                onClick={onMobileToggle}
                aria-label="Search"
                className={cn(
                    "md:hidden flex items-center justify-center h-9 w-9",
                    "rounded-[var(--radius-sm)] border border-[var(--color-border)]",
                    "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                    "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                    "transition-colors"
                )}
            >
                <Search className="h-4 w-4" />
            </button>

            {/* ── Mobile: full-width overlay bar ── */}
            {mobileOpen && (
                <div className="md:hidden absolute inset-x-0 top-0 h-14 z-50 flex items-center gap-2 px-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                    <div className="flex-1">
                        {searchField(
                            mobileInputRef as React.RefObject<HTMLInputElement>,
                            "w-full"
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onMobileToggle}
                        className={cn(
                            "flex-shrink-0 flex items-center justify-center h-9 w-9",
                            "rounded-[var(--radius-sm)] border border-[var(--color-border)]",
                            "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                            "hover:bg-[var(--color-surface-secondary)] transition-colors"
                        )}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </>
    );
}

// ─── Create button + dropdown ─────────────────────────────────────────────────

function CreateMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex items-center justify-center gap-2 h-9 rounded-[var(--radius-sm)]",
                        // Mobile: icon-only square; sm+: full pill with label
                        "w-9 sm:w-auto sm:px-4",
                        "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]",
                        "text-white text-[12px] font-semibold transition-all duration-200",
                        "active:scale-95 shadow-[var(--shadow-sm)]"
                    )}
                >
                    <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                    {/* Label hidden on mobile */}
                    <span className="hidden sm:inline">Create</span>
                    <ChevronDown className="hidden sm:inline h-3 w-3 opacity-80" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-60 rounded-[var(--radius-md)] p-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
            >
                {CREATE_ITEMS.map((item) => (
                    <DropdownMenuItem
                        key={item.href}
                        asChild
                        className="rounded-[var(--radius-sm)] focus:bg-[var(--color-surface-secondary)] cursor-pointer p-0"
                    >
                        <Link href={item.href} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                                <item.icon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-[var(--color-text-primary)] leading-tight capitalize">
                                    {item.label}
                                </p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
                                    {item.sub}
                                </p>
                            </div>
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ─── Overflow "more" menu (mobile) ────────────────────────────────────────────
/**
 * Bundles Language, Currency, and ThemeToggle into a single ⋯ button
 * that is only shown on screens narrower than `sm` (640 px).
 */
function MobileOverflowMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "sm:hidden flex items-center justify-center h-9 w-9",
                        "rounded-[var(--radius-sm)] border border-[var(--color-border)]",
                        "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                        "hover:bg-[var(--color-surface-secondary)] transition-colors"
                    )}
                    aria-label="More options"
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-48 rounded-[var(--radius-md)] p-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
            >
                <DropdownMenuLabel className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Preferences
                </DropdownMenuLabel>

                {/* Language */}
                <DropdownMenuItem className="rounded-[var(--radius-sm)] focus:bg-[var(--color-surface-secondary)] cursor-pointer">
                    <div className="flex items-center gap-2.5 px-1 py-1">
                        <Globe className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                        <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                            Language: EN
                        </span>
                    </div>
                </DropdownMenuItem>

                {/* Theme */}
                <DropdownMenuItem
                    className="rounded-[var(--radius-sm)] focus:bg-[var(--color-surface-secondary)] cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                >
                    <div className="flex items-center justify-between w-full px-1 py-1">
                        <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                            Theme
                        </span>
                        <ThemeToggle />
                    </div>
                </DropdownMenuItem>

                {/* Currency */}
                <DropdownMenuItem
                    className="rounded-[var(--radius-sm)] focus:bg-[var(--color-surface-secondary)] cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                >
                    <div className="flex items-center justify-between w-full px-1 py-1">
                        <CurrencySelector
                            className={cn(
                                "h-7 rounded-[var(--radius-sm)] text-[11px] font-bold",
                                "bg-[var(--color-surface-secondary)] border border-[var(--color-border)] px-2",
                                "text-[var(--color-text-secondary)]"
                            )}
                        />
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ─── User menu + role switcher ────────────────────────────────────────────────

function UserMenu({ user }: { user: UserProfile }) {
    const { activeRoles } = useUserStore();
    const [currentRole, setCurrentRole] = useState("affiliate");

    const initials = user.full_name
        ? user.full_name.substring(0, 2).toUpperCase()
        : user.email
            ? user.email.substring(0, 2).toUpperCase()
            : "U";

    const displayRole =
        ROLES.find((r) => r.key === currentRole)?.label ?? "Affiliate";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-2.5 h-9 pl-0 sm:pl-2 pr-0 sm:pr-3 rounded-full sm:rounded-[var(--radius-sm)]",
                        "bg-[var(--color-surface)] border border-[var(--color-border)]",
                        "hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)]",
                        "transition-all duration-200 active:scale-95"
                    )}
                >
                    {/* Avatar */}
                    <div className=" w-10 sm:w-6 h-10 sm:h-6 sm:ml-0 rounded-full bg-[var(--color-accent-light)] border border-[var(--color-border)] overflow-hidden flex items-center justify-center flex-shrink-0">
                        {user.avatar_url && user.avatar_url.trim() ? (
                            <img
                                src={user.avatar_url}
                                className="w-full h-full object-cover"
                                alt=""
                            />
                        ) : (
                            <span className="text-[10px] font-bold text-[var(--color-accent)]">
                                {initials}
                            </span>
                        )}
                    </div>
                    {/* Name — hidden below sm */}
                    <span className="hidden sm:block text-[12px] font-semibold text-[var(--color-text-primary)] max-w-[100px] truncate">
                        {user.full_name?.split(" ")[0] ?? "Account"}
                    </span>
                    <ChevronDown className="h-3 hidden sm:block w-3 text-[var(--color-text-muted)]" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                sideOffset={8}
                // Full-width on xs screens so the panel doesn't overflow viewport
                className="w-[calc(100vw-2rem)] max-w-[15rem] rounded-[var(--radius-md)] p-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
            >
                {/* Identity */}
                <div className="px-3 py-2.5 border-b border-[var(--color-border)] mb-1">
                    <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate">
                        {user.full_name ?? "Account"}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">
                        {user.email}
                    </p>
                </div>

                {/* Current role */}
                <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
                            Current role
                        </span>
                        <span className="text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2 py-0.5 rounded-full">
                            {displayRole}
                        </span>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Switch role</p>
                    <div className="mt-2 space-y-px">
                        {ROLES.map((role) => (
                            <button
                                key={role.key}
                                type="button"
                                onClick={() => setCurrentRole(role.key)}
                                className={cn(
                                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors",
                                    currentRole === role.key
                                        ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                                )}
                            >
                                {role.label}
                                {currentRole === role.key && (
                                    <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <DropdownMenuItem
                    asChild
                    className="rounded-[var(--radius-sm)] focus:bg-[var(--color-surface-secondary)] cursor-pointer"
                >
                    <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-2.5 px-3 py-2"
                    >
                        <Settings className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                        <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                            Account settings
                        </span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                    asChild
                    className="rounded-[var(--radius-sm)] focus:bg-[var(--color-surface-secondary)] cursor-pointer"
                >
                    <Link
                        href="/dashboard/wallet"
                        className="flex items-center gap-2.5 px-3 py-2"
                    >
                        <Wallet className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                        <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                            My wallet
                        </span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-[var(--color-border)] my-1" />

                <div className="px-1">
                    <SignOutButton variant="menu" />
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ─── Main header ──────────────────────────────────────────────────────────────

export function DashboardHeader({
    onMobileMenuOpen,
    unreadNotifications = 2,
}: DashboardHeaderProps) {
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const [user, setUser] = useState<UserProfile>({
        email: "",
        full_name: null,
        avatar_url: null,
    });

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const {
                data: { user: authUser },
            } = await supabase.auth.getUser();
            if (!authUser) return;
            const { data } = await supabase
                .from("profiles")
                .select("email, full_name, avatar_url")
                .eq("id", authUser.id)
                .single();
            if (data) setUser(data);
        }
        load();
    }, []);

    return (
        <header
            className={cn(
                "sticky top-0 z-40 flex-shrink-0",
                "relative flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6 h-14",
                "bg-[var(--color-surface)] border-b border-[var(--color-border)]"
            )}
        >
            {/* ── Left: hamburger (mobile) + page label (desktop) ── */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
                {onMobileMenuOpen && (
                    <button
                        type="button"
                        onClick={onMobileMenuOpen}
                        aria-label="Open menu"
                        className={cn(
                            "lg:hidden flex items-center justify-center h-9 w-9",
                            "rounded-[var(--radius-sm)] border border-[var(--color-border)]",
                            "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                            "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                            "transition-colors"
                        )}
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                )}

                <span className="hidden lg:block text-[13px] font-semibold text-[var(--color-text-primary)] uppercase tracking-widest select-none">
                    Dashboard
                </span>
            </div>

            {/* ── Centre: desktop search (grows), mobile search icon ── */}
            <div className="flex-1 flex justify-center">
                <div className="w-full max-w-lg">
                    <GlobalSearch
                        mobileOpen={mobileSearchOpen}
                        onMobileToggle={() => setMobileSearchOpen((v) => !v)}
                    />
                </div>
            </div>

            {/* ── Right: action cluster ── */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Create */}
                <CreateMenu />

                {/* Language — visible sm+ */}
                <button
                    className={cn(
                        "hidden sm:flex items-center gap-1.5 h-9 px-2.5",
                        "rounded-[var(--radius-sm)] border border-[var(--color-border)]",
                        "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
                        "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                        "text-[12px] font-semibold transition-colors"
                    )}
                >
                    <Globe className="h-3.5 w-3.5" />
                    EN
                </button>

                {/* Currency — visible sm+ */}
                <div className="hidden sm:block">
                    <CurrencySelector
                        className={cn(
                            "h-9 rounded-[var(--radius-sm)] text-[11px] font-bold",
                            "bg-[var(--color-surface)] border border-[var(--color-border)] px-3",
                            "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]",
                            "transition-colors"
                        )}
                    />
                </div>

                {/* Theme toggle — visible sm+ */}
                <div className="hidden sm:block">
                    <ThemeToggle />
                </div>

                {/* ⋯ overflow menu — mobile only (language + currency + theme) */}
                <MobileOverflowMenu />

                {/* Notifications */}
                <Link
                    href="/dashboard/notifications"
                    className={cn(
                        "relative flex items-center justify-center h-9 w-9",
                        "rounded-full border border-[var(--color-border)]",
                        "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                        "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                        "transition-colors"
                    )}
                >
                    <Bell className="h-4 w-4" />
                    {unreadNotifications > 0 && (
                        <span
                            className={cn(
                                "absolute -top-1 -right-1",
                                "w-4 h-4 rounded-full",
                                "bg-[var(--color-accent)] text-white",
                                "text-[9px] font-bold flex items-center justify-center",
                                "border-2 border-[var(--color-surface)]"
                            )}
                        >
                            {unreadNotifications > 9 ? "9+" : unreadNotifications}
                        </span>
                    )}
                </Link>

                {/* User */}
                <UserMenu user={user} />
            </div>
        </header>
    );
}
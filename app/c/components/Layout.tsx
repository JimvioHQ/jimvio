// "use client";

// import { useEffect, useState } from "react";
// import { usePathname } from "next/navigation";
// import Link from "next/link";
// import { createClient } from "@/lib/supabase/client";
// import HubSidebar from "./sidebar";
// import type { Tables } from "@/types/supabase";

// type Profile = Pick<Tables<"profiles">, "id" | "username" | "full_name" | "avatar_url">;

// // ── Top bar icons ─────────────────────────────────────────────────────────────
// const SearchIcon = () => (
//     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//         <circle cx="11" cy="11" r="8" />
//         <line x1="21" y1="21" x2="16.65" y2="16.65" />
//     </svg>
// );
// const BellIcon = () => (
//     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//         <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
//         <path d="M13.73 21a2 2 0 0 1-3.46 0" />
//     </svg>
// );

// // ── User avatar ───────────────────────────────────────────────────────────────
// function UserAvatar({ profile, size = 32 }: { profile: Profile | null; size?: number }) {
//     if (profile?.avatar_url) {
//         return (
//             <img
//                 src={profile.avatar_url}
//                 alt={profile.full_name ?? "Profile"}
//                 style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
//             />
//         );
//     }

//     const display = profile?.full_name ?? profile?.username ?? "?";
//     const initials =
//         display
//             .split(" ")
//             .map((w) => w[0])
//             .join("")
//             .slice(0, 2)
//             .toUpperCase() || "?";

//     return (
//         <span
//             style={{
//                 display: "inline-flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 width: size,
//                 height: size,
//                 borderRadius: "50%",
//                 background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
//                 color: "#fff",
//                 fontSize: size * 0.38,
//                 fontWeight: 700,
//                 letterSpacing: "-0.02em",
//             }}
//         >
//             {initials}
//         </span>
//     );
// }

// // ── Page title hook (server-side community lookup when needed) ────────────────
// function usePageTitle(pathname: string): string {
//     const [communityName, setCommunityName] = useState<string | null>(null);

//     // Static titles
//     let staticTitle = "";
//     if (pathname === "/c") staticTitle = "Feed";
//     else if (pathname.startsWith("/c/messages")) staticTitle = "Messages";
//     else if (pathname.startsWith("/c/bookmarks")) staticTitle = "Bookmarks";
//     else if (pathname.startsWith("/c/live")) staticTitle = "Live";
//     else if (pathname.startsWith("/c/events")) staticTitle = "Events";
//     else if (pathname.startsWith("/c/my-communities")) staticTitle = "My Communities";
//     else if (pathname.startsWith("/c/u/")) {
//         const parts = pathname.split("/");
//         const username = parts[3];
//         if (parts[4] === "edit") staticTitle = "Edit Profile";
//         else if (username) staticTitle = `@${username}`;
//         else staticTitle = "Profile";
//     }

//     // Community slug — fetch real name
//     const communitySlugMatch = pathname.match(/^\/c\/community\/([^/]+)/);
//     const slug = communitySlugMatch?.[1] ?? null;

//     useEffect(() => {
//         if (!slug) {
//             setCommunityName(null);
//             return;
//         }
//         let cancelled = false;
//         (async () => {
//             const supabase = createClient();
//             const { data } = await supabase
//                 .from("communities")
//                 .select("name")
//                 .eq("slug", slug)
//                 .maybeSingle();
//             if (!cancelled) setCommunityName(data?.name ?? null);
//         })();
//         return () => {
//             cancelled = true;
//         };
//     }, [slug]);

//     if (slug) return communityName ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
//     return staticTitle;
// }

// // ── Layout ────────────────────────────────────────────────────────────────────
// export default function HubLayout({ children }: { children: React.ReactNode }) {
//     const pathname = usePathname();
//     const isInsideCommunity = pathname.startsWith("/c/community/");

//     const [collapsed, setCollapsed] = useState(isInsideCommunity);
//     const [profile, setProfile] = useState<Profile | null>(null);
//     const [unreadMessages, setUnreadMessages] = useState(0);
//     const [unreadNotifications, setUnreadNotifications] = useState(0);

//     const pageTitle = usePageTitle(pathname);

//     // Collapse sidebar automatically when entering a community
//     useEffect(() => {
//         setCollapsed(isInsideCommunity);
//     }, [isInsideCommunity]);

//     // Load profile + unread counts
//     useEffect(() => {
//         let cancelled = false;
//         const supabase = createClient();

//         async function load() {
//             const { data: { user } } = await supabase.auth.getUser();
//             if (!user || cancelled) return;

//             // Profile
//             const { data: prof } = await supabase
//                 .from("profiles")
//                 .select("id, username, full_name, avatar_url")
//                 .eq("id", user.id)
//                 .maybeSingle();

//             if (cancelled) return;
//             if (prof) setProfile(prof);

//             // Unread notifications
//             const { count: notifCount } = await supabase
//                 .from("notifications")
//                 .select("id", { count: "exact", head: true })
//                 .eq("user_id", user.id)
//                 .eq("is_read", false);

//             if (!cancelled) setUnreadNotifications(notifCount ?? 0);

//             // Unread messages — approximation: count message-type notifications
//             const { count: msgCount } = await supabase
//                 .from("notifications")
//                 .select("id", { count: "exact", head: true })
//                 .eq("user_id", user.id)
//                 .eq("type", "message")
//                 .eq("is_read", false);

//             if (!cancelled) setUnreadMessages(msgCount ?? 0);
//         }

//         load();

//         // Realtime updates for notifications
//         let channel: ReturnType<typeof supabase.channel> | null = null;
//         (async () => {
//             const { data: { user } } = await supabase.auth.getUser();
//             if (!user || cancelled) return;

//             channel = supabase
//                 .channel(`hub-notifications-${user.id}`)
//                 .on(
//                     "postgres_changes",
//                     {
//                         event: "*",
//                         schema: "public",
//                         table: "notifications",
//                         filter: `user_id=eq.${user.id}`,
//                     },
//                     () => load(),
//                 )
//                 .subscribe();
//         })();

//         return () => {
//             cancelled = true;
//             if (channel) supabase.removeChannel(channel);
//         };
//     }, []);

//     return (
//         <div
//             style={{
//                 display: "flex",
//                 height: "100vh",
//                 background: "#09090b",
//                 color: "#e4e4e7",
//                 fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
//                 overflow: "hidden",
//             }}
//         >
//             {/* ── Hub Sidebar ── */}
//             <HubSidebar
//                 collapsed={collapsed}
//                 onToggleCollapse={() => setCollapsed((c) => !c)}
//                 username={profile?.username ?? ""}
//                 unreadMessages={unreadMessages}
//             />

//             <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
//                 {/* Top bar */}
//                 <header
//                     style={{
//                         height: 56,
//                         display: "flex",
//                         alignItems: "center",
//                         padding: "0 20px",
//                         gap: 12,
//                         borderBottom: "1px solid rgba(255,255,255,0.06)",
//                         background: "#09090b",
//                         flexShrink: 0,
//                         zIndex: 30,
//                     }}
//                 >
//                     {/* Page title */}
//                     <h1
//                         style={{
//                             margin: 0,
//                             fontSize: 15,
//                             fontWeight: 600,
//                             color: "#fff",
//                             letterSpacing: "-0.02em",
//                             flex: 1,
//                             whiteSpace: "nowrap",
//                             overflow: "hidden",
//                             textOverflow: "ellipsis",
//                         }}
//                     >
//                         {pageTitle}
//                     </h1>

//                     {/* Search bar */}
//                     <div
//                         style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: 8,
//                             background: "rgba(255,255,255,0.05)",
//                             border: "1px solid rgba(255,255,255,0.08)",
//                             borderRadius: 8,
//                             padding: "6px 12px",
//                             cursor: "text",
//                             maxWidth: 260,
//                             width: "100%",
//                             transition: "border-color 0.15s",
//                         }}
//                     >
//                         <span style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
//                             <SearchIcon />
//                         </span>
//                         <input
//                             placeholder="Search…"
//                             style={{
//                                 background: "none",
//                                 border: "none",
//                                 outline: "none",
//                                 color: "#e4e4e7",
//                                 fontSize: 13,
//                                 width: "100%",
//                             }}
//                         />
//                         <kbd
//                             style={{
//                                 background: "rgba(255,255,255,0.06)",
//                                 border: "1px solid rgba(255,255,255,0.1)",
//                                 borderRadius: 4,
//                                 padding: "1px 5px",
//                                 fontSize: 10,
//                                 color: "rgba(255,255,255,0.3)",
//                                 fontFamily: "inherit",
//                                 whiteSpace: "nowrap",
//                                 flexShrink: 0,
//                             }}
//                         >
//                             ⌘K
//                         </kbd>
//                     </div>

//                     {/* Notifications */}
//                     <Link
//                         href="/notifications"
//                         aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
//                         style={{
//                             position: "relative",
//                             background: "none",
//                             border: "none",
//                             cursor: "pointer",
//                             color: "rgba(255,255,255,0.4)",
//                             padding: 8,
//                             borderRadius: 8,
//                             display: "flex",
//                             alignItems: "center",
//                             justifyContent: "center",
//                             transition: "color 0.15s, background 0.15s",
//                             textDecoration: "none",
//                         }}
//                         onMouseEnter={(e) => {
//                             e.currentTarget.style.color = "#fff";
//                             e.currentTarget.style.background = "rgba(255,255,255,0.05)";
//                         }}
//                         onMouseLeave={(e) => {
//                             e.currentTarget.style.color = "rgba(255,255,255,0.4)";
//                             e.currentTarget.style.background = "transparent";
//                         }}
//                     >
//                         <BellIcon />
//                         {unreadNotifications > 0 && (
//                             <span
//                                 style={{
//                                     position: "absolute",
//                                     top: 4,
//                                     right: 4,
//                                     minWidth: 16,
//                                     height: 16,
//                                     padding: "0 4px",
//                                     borderRadius: 8,
//                                     background: "#6366f1",
//                                     border: "1.5px solid #09090b",
//                                     color: "#fff",
//                                     fontSize: 9,
//                                     fontWeight: 700,
//                                     display: "flex",
//                                     alignItems: "center",
//                                     justifyContent: "center",
//                                     lineHeight: 1,
//                                 }}
//                             >
//                                 {unreadNotifications > 9 ? "9+" : unreadNotifications}
//                             </span>
//                         )}
//                     </Link>

//                     {/* User avatar */}
//                     <Link
//                         href={profile?.username ? `/c/u/${profile.username}` : "/c/u"}
//                         aria-label="My profile"
//                         style={{
//                             background: "none",
//                             border: "none",
//                             cursor: "pointer",
//                             padding: 0,
//                             borderRadius: "50%",
//                             display: "flex",
//                             alignItems: "center",
//                             transition: "opacity 0.15s",
//                         }}
//                         onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
//                         onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
//                     >
//                         <UserAvatar profile={profile} size={32} />
//                     </Link>
//                 </header>

//                 {/* Page content */}
//                 <main
//                     style={{
//                         flex: 1,
//                         overflowY: "auto",
//                         overflowX: "hidden",
//                     }}
//                 >
//                     {children}
//                 </main>
//             </div>
//         </div>
//     );
// }

"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import HubSidebar from "./sidebar";
import type { Tables } from "@/types/supabase";

type Profile = Pick<Tables<"profiles">, "id" | "username" | "full_name" | "avatar_url">;

// ── Top bar icons ─────────────────────────────────────────────────────────────
const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const BellIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);
const MenuIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

// ── User avatar ───────────────────────────────────────────────────────────────
function UserAvatar({ profile, size = 32 }: { profile: Profile | null; size?: number }) {
    if (profile?.avatar_url) {
        return (
            <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "Profile"}
                style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
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
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: size,
                height: size,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fd5000, #ff7a30)",
                color: "#fff",
                fontSize: size * 0.38,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                flexShrink: 0,
            }}
        >
            {initials}
        </span>
    );
}

// ── Page title hook ───────────────────────────────────────────────────────────
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

    const communitySlugMatch = pathname.match(/^\/c\/community\/([^/]+)/);
    const slug = communitySlugMatch?.[1] ?? null;

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

// ── Layout ────────────────────────────────────────────────────────────────────
export default function HubLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isInsideCommunity = pathname.startsWith("/c/community/");

    const [collapsed, setCollapsed] = useState(isInsideCommunity);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    const pageTitle = usePageTitle(pathname);

    useEffect(() => { setCollapsed(isInsideCommunity); }, [isInsideCommunity]);

    // Close mobile nav on route change
    useEffect(() => { setMobileNavOpen(false); }, [pathname]);

    // Close mobile nav when returning to desktop width
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 641px)");
        const closeOnDesktop = () => {
            if (mq.matches) setMobileNavOpen(false);
        };
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
    }, []);

    const styles = {
        shell: {
            display: "flex",
            height: "100vh",
            background: "var(--color-bg, #f4f4f5)",
            color: "var(--color-text-primary, #18181b)",
            fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
            overflow: "hidden",
        } as React.CSSProperties,

        // ── Desktop top bar ──
        topbar: {
            height: 56,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 12,
            borderBottom: "1px solid var(--color-border, rgba(0,0,0,0.08))",
            background: "var(--color-surface, #ffffff)",
            flexShrink: 0,
            zIndex: 30,
        } as React.CSSProperties,

        pageTitle: {
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--color-text-primary, #ededed)",
            letterSpacing: "-0.02em",
            flex: 1,
            whiteSpace: "nowrap" as const,
            overflow: "hidden",
            textOverflow: "ellipsis",
        } as React.CSSProperties,

        searchBar: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--color-surface-secondary, rgba(255,255,255,0.05))",
            border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
            borderRadius: "var(--radius-sm, 8px)",
            padding: "6px 12px",
            maxWidth: 260,
            width: "100%",
        } as React.CSSProperties,

        searchInput: {
            background: "none",
            border: "none",
            outline: "none",
            color: "var(--color-text-primary, #ededed)",
            fontSize: 13,
            width: "100%",
        } as React.CSSProperties,

        kbd: {
            background: "var(--color-surface-secondary, rgba(255,255,255,0.06))",
            border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
            borderRadius: 4,
            padding: "1px 5px",
            fontSize: 10,
            color: "var(--color-text-muted, #6a6a6a)",
            fontFamily: "inherit",
            whiteSpace: "nowrap" as const,
            flexShrink: 0,
        } as React.CSSProperties,

        iconBtn: {
            position: "relative" as const,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted, rgba(255,255,255,0.4))",
            padding: 8,
            borderRadius: "var(--radius-sm, 8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s, background 0.15s",
            textDecoration: "none",
        } as React.CSSProperties,

        notifBadge: {
            position: "absolute" as const,
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: 8,
            background: "var(--color-accent, #fd5000)",
            border: "1.5px solid var(--color-bg, #09090b)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
        } as React.CSSProperties,

        // ── Mobile top bar ──
        mobileTopbar: {
            height: 52,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
            borderBottom: "1px solid var(--color-border, rgba(255,255,255,0.06))",
            background: "var(--color-bg, #09090b)",
            flexShrink: 0,
            zIndex: 30,
        } as React.CSSProperties,

        hamburgerBtn: {
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted, rgba(255,255,255,0.4))",
            padding: 6,
            borderRadius: "var(--radius-sm, 8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
        } as React.CSSProperties,

        // ── Mobile nav overlay ──
        mobileOverlay: {
            position: "fixed" as const,
            inset: 0,
            top: 52,
            background: "rgba(0,0,0,0.5)",
            zIndex: 98,
            display: mobileNavOpen ? "block" : "none",
        } as React.CSSProperties,

        // ── Mobile bottom nav ──
        mobileBottomNav: {
            height: 56,
            borderTop: "1px solid var(--color-border, rgba(255,255,255,0.06))",
            background: "var(--color-surface, #0f0f11)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            flexShrink: 0,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
        } as React.CSSProperties,
    };

    return (
        <div style={styles.shell}>
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

            {/* ── Mobile overlay backdrop ── */}
            <div
                style={styles.mobileOverlay}
                onClick={() => setMobileNavOpen(false)}
                aria-hidden="true"
            />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

                {/* ── Mobile top bar (visible only on mobile) ── */}
                <header style={{ ...styles.mobileTopbar, display: "none" }} className="hub-mobile-topbar">
                    <button
                        style={styles.hamburgerBtn}
                        onClick={() => setMobileNavOpen((o) => !o)}
                        aria-label="Open navigation menu"
                    >
                        <MenuIcon />
                    </button>
                    <h1 style={{ ...styles.pageTitle, flex: 1 }}>{pageTitle}</h1>
                    <Link
                        href="/notifications"
                        aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
                        style={styles.iconBtn}
                    >
                        <BellIcon />
                        {unreadNotifications > 0 && (
                            <span style={styles.notifBadge}>
                                {unreadNotifications > 9 ? "9+" : unreadNotifications}
                            </span>
                        )}
                    </Link>
                    <Link
                        href={profile?.username ? `/c/profile/${profile.username}` : "/c/profile"}
                        aria-label="My profile"
                        style={{ borderRadius: "50%", display: "flex", alignItems: "center" }}
                    >
                        <UserAvatar profile={profile} size={30} />
                    </Link>
                </header>

                {/* ── Desktop top bar (hidden on mobile) ── */}
                <header style={styles.topbar} className="hub-desktop-topbar">
                    <h1 style={styles.pageTitle}>{pageTitle}</h1>

                    <div style={styles.searchBar}>
                        <span style={{ color: "var(--color-text-muted, rgba(0,0,0,0.35))", flexShrink: 0 }}>
                            <SearchIcon />
                        </span>
                        <input
                            placeholder="Search creators, clips, spaces, courses, lives, missions…"
                            style={styles.searchInput}
                            aria-label="Search"
                        />
                        <kbd style={styles.kbd}>⌘K</kbd>
                    </div>

                    <Link
                        href="/c/live"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: "var(--radius-sm, 8px)",
                            background: "var(--color-accent, #fd5000)",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "none",
                            flexShrink: 0,
                        }}
                    >
                        + Create
                    </Link>

                    <Link
                        href="/notifications"
                        aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
                        style={styles.iconBtn}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--color-text-primary, #ededed)";
                            e.currentTarget.style.background = "var(--color-surface-secondary, rgba(255,255,255,0.05))";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--color-text-muted, rgba(255,255,255,0.4))";
                            e.currentTarget.style.background = "transparent";
                        }}
                    >
                        <BellIcon />
                        {unreadNotifications > 0 && (
                            <span style={styles.notifBadge}>
                                {unreadNotifications > 9 ? "9+" : unreadNotifications}
                            </span>
                        )}
                    </Link>

                    <Link
                        href={profile?.username ? `/c/profile/${profile.username}` : "/c/profile"}
                        aria-label="My profile"
                        style={{ borderRadius: "50%", display: "flex", alignItems: "center", transition: "opacity 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                        <UserAvatar profile={profile} size={32} />
                    </Link>
                </header>

                {/* ── Page content ── */}
                <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                    {children}
                </main>

                {/* ── Mobile bottom nav (hidden on desktop) ── */}
                <nav style={{ ...styles.mobileBottomNav, display: "none" }} className="hub-mobile-bottom-nav" aria-label="Mobile navigation">
                    {[
                        { label: "Feed", href: "/c", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" },
                        { label: "Messages", href: "/c/messages", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", badge: unreadMessages },
                        { label: "Saved", href: "/c/bookmarks", icon: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" },
                        { label: "Profile", href: profile?.username ? `/c/profile/${profile.username}` : "/c/profile", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
                    ].map(({ label, href, icon, badge }) => {
                        const isActive = pathname === href || (href !== "/c" && pathname.startsWith(href));
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-label={label}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 2,
                                    color: isActive ? "var(--color-accent, #fd5000)" : "var(--color-text-muted, #6a6a6a)",
                                    textDecoration: "none",
                                    fontSize: 10,
                                    fontWeight: isActive ? 600 : 400,
                                    padding: "6px 12px",
                                    borderRadius: "var(--radius-sm, 8px)",
                                    transition: "color 0.15s",
                                    position: "relative",
                                    flex: 1,
                                    justifyContent: "center",
                                }}
                            >
                                <span style={{ position: "relative" }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        {icon.split(" M").map((d, i) => (
                                            <path key={i} d={i === 0 ? d : `M${d}`} />
                                        ))}
                                    </svg>
                                    {badge != null && badge > 0 && (
                                        <span style={{
                                            position: "absolute", top: -4, right: -4,
                                            background: "var(--color-danger, #f07070)", color: "#fff",
                                            fontSize: 8, fontWeight: 700, borderRadius: 99,
                                            minWidth: 13, height: 13,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            padding: "0 3px",
                                        }}>
                                            {badge > 9 ? "9+" : badge}
                                        </span>
                                    )}
                                </span>
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* ── Responsive CSS ── */}
            <style>{`
                @media (max-width: 640px) {
                    .hub-desktop-topbar { display: none !important; }
                    .hub-mobile-topbar { display: flex !important; }
                    .hub-mobile-bottom-nav { display: flex !important; }
                    .hub-sidebar-root .hub-sidebar { display: none !important; }
                    .hub-sidebar-mobile-open { display: flex !important; }
                }
                @media (min-width: 641px) {
                    .hub-mobile-topbar { display: none !important; }
                    .hub-mobile-bottom-nav { display: none !important; }
                    .hub-sidebar-root .hub-sidebar { display: flex !important; }
                    .hub-sidebar-mobile-open { display: none !important; }
                }
            `}</style>
        </div>
    );
}
// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";

// const Icons = {
//     Feed: () => (
//         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
//             <polyline points="9 22 9 12 15 12 15 22" />
//         </svg>
//     ),
//     Messages: () => (
//         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
//         </svg>
//     ),
//     Bookmarks: () => (
//         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
//         </svg>
//     ),
//     Profile: () => (
//         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
//             <circle cx="12" cy="7" r="4" />
//         </svg>
//     ),
//     Live: () => (
//         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <circle cx="12" cy="12" r="2" />
//             <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
//         </svg>
//     ),
//     Events: () => (
//         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
//             <line x1="16" y1="2" x2="16" y2="6" />
//             <line x1="8" y1="2" x2="8" y2="6" />
//             <line x1="3" y1="10" x2="21" y2="10" />
//         </svg>
//     ),
//     ChevronDown: () => (
//         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//             <polyline points="6 9 12 15 18 9" />
//         </svg>
//     ),
//     Plus: () => (
//         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//             <line x1="12" y1="5" x2="12" y2="19" />
//             <line x1="5" y1="12" x2="19" y2="12" />
//         </svg>
//     ),
//     Settings: () => (
//         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <circle cx="12" cy="12" r="3" />
//             <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
//         </svg>
//     ),
//     SignOut: () => (
//         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
//             <polyline points="16 17 21 12 16 7" />
//             <line x1="21" y1="12" x2="9" y2="12" />
//         </svg>
//     ),
//     Collapse: () => (
//         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <polyline points="15 18 9 12 15 6" />
//         </svg>
//     ),
//     Expand: () => (
//         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <polyline points="9 18 15 12 9 6" />
//         </svg>
//     ),
// };

// // ── Types ─────────────────────────────────────────────────────────────────────
// interface Community {
//     id: string;
//     name: string;
//     slug: string;
//     avatar_url?: string | null;
//     unread_count?: number;
// }

// interface HubSidebarProps {
//     collapsed?: boolean;
//     onToggleCollapse?: () => void;
//     communities?: Community[];
//     username?: string;
//     unreadMessages?: number;
// }

// // ── Nav items ─────────────────────────────────────────────────────────────────
// const NAV_ITEMS = [
//     { label: "Feed", href: "/c", icon: Icons.Feed },
//     { label: "Messages", href: "/c/messages", icon: Icons.Messages, badgeKey: "messages" },
//     { label: "Bookmarks", href: "/c/bookmarks", icon: Icons.Bookmarks },
//     { label: "My Profile", href: "/c/u/__username__", icon: Icons.Profile },
//     { label: "Live", href: "/c/live", icon: Icons.Live },
//     { label: "Events", href: "/c/events", icon: Icons.Events },
// ];

// // ── Fetch joined communities ──────────────────────────────────────────────────
// function useCommunityList(initial: Community[]) {
//     const [dbCommunities, setDbCommunities] = useState<Community[] | null>(null);

//     useEffect(() => {
//         let cancelled = false;
//         async function loadCommunities() {
//             const supabase = createClient();
//             const { data: { user } } = await supabase.auth.getUser();
//             if (!user) {
//                 if (!cancelled) setDbCommunities([]);
//                 return;
//             }

//             const { data, error } = await supabase
//                 .from("community_memberships")
//                 .select("community_id, subscribed_at, communities!inner(id, name, slug, avatar_url, is_active)")
//                 .eq("user_id", user.id)
//                 .eq("status", "active")
//                 .eq("communities.is_active", true)
//                 .order("subscribed_at", { ascending: false })
//                 .limit(50);

//             if (cancelled) return;
//             if (error) {
//                 console.error("[HubSidebar] Failed to load communities:", error);
//                 setDbCommunities([]);
//                 return;
//             }

//             const mapped = (data ?? [])
//                 .map((row: any) => row.communities)
//                 .filter(Boolean) as Community[];

//             setDbCommunities(mapped);
//         }

//         loadCommunities();
//         return () => { cancelled = true; };
//     }, []);

//     return dbCommunities ?? initial;
// }

// // ── Helpers ───────────────────────────────────────────────────────────────────
// function getInitials(name: string) {
//     return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
// }

// function CommunityAvatar({ community, size = 28 }: { community: Community; size?: number }) {
//     if (community.avatar_url) {
//         return (
//             <img
//                 src={community.avatar_url}
//                 alt={community.name}
//                 style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
//             />
//         );
//     }
//     const colors = [
//         ["#e0f2fe", "#0369a1"],
//         ["#fce7f3", "#9d174d"],
//         ["#dcfce7", "#166534"],
//         ["#fef3c7", "#92400e"],
//         ["#ede9fe", "#5b21b6"],
//     ];
//     const [bg, fg] = colors[community.id.charCodeAt(0) % colors.length];
//     return (
//         <span
//             style={{
//                 display: "inline-flex", alignItems: "center", justifyContent: "center",
//                 width: size, height: size, borderRadius: 8, flexShrink: 0,
//                 background: bg, color: fg, fontSize: size * 0.4, fontWeight: 700,
//                 letterSpacing: "-0.02em",
//             }}
//         >
//             {getInitials(community.name)}
//         </span>
//     );
// }

// // ── Main component ────────────────────────────────────────────────────────────
// export default function HubSidebar({
//     collapsed = false,
//     onToggleCollapse,
//     communities = [],
//     username = "me",
//     unreadMessages = 0,
// }: HubSidebarProps) {
//     const pathname = usePathname();
//     const router = useRouter();
//     const [communitiesOpen, setCommunitiesOpen] = useState(true);
//     const communitiesToRender = useCommunityList(communities);

//     const resolvedNav = NAV_ITEMS.map((item) => ({
//         ...item,
//         href: item.href.replace("__username__", username),
//     }));

//     const isActive = (href: string) => {
//         if (href === "/c") return pathname === "/c";
//         return pathname.startsWith(href);
//     };

//     async function handleSignOut() {
//         const supabase = createClient();
//         await supabase.auth.signOut();
//         router.push("/");
//         router.refresh();
//     }

//     return (
//         <aside
//             style={{
//                 width: collapsed ? 64 : 240,
//                 minWidth: collapsed ? 64 : 240,
//                 height: "100vh",
//                 display: "flex",
//                 flexDirection: "column",
//                 background: "#0f0f11",
//                 borderRight: "1px solid rgba(255,255,255,0.06)",
//                 transition: "width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)",
//                 overflow: "hidden",
//                 position: "sticky",
//                 top: 0,
//                 zIndex: 40,
//             }}
//         >
//             {/* Logo + collapse toggle */}
//             <div
//                 style={{
//                     height: 56,
//                     display: "flex",
//                     alignItems: "center",
//                     padding: "0 16px",
//                     justifyContent: collapsed ? "center" : "space-between",
//                     borderBottom: "1px solid rgba(255,255,255,0.06)",
//                     flexShrink: 0,
//                 }}
//             >
//                 {!collapsed && (
//                     <span
//                         style={{
//                             fontFamily: "'Georgia', serif",
//                             fontSize: 18,
//                             fontWeight: 700,
//                             color: "#fff",
//                             letterSpacing: "-0.03em",
//                             whiteSpace: "nowrap",
//                             overflow: "hidden",
//                         }}
//                     >
//                         hub<span style={{ color: "#6366f1" }}>·</span>
//                     </span>
//                 )}
//                 <button
//                     onClick={onToggleCollapse}
//                     title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
//                     style={{
//                         background: "none", border: "none", cursor: "pointer",
//                         color: "rgba(255,255,255,0.35)", padding: 6, borderRadius: 6,
//                         display: "flex", alignItems: "center", justifyContent: "center",
//                         transition: "color 0.15s",
//                     }}
//                     onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
//                     onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
//                 >
//                     {collapsed ? <Icons.Expand /> : <Icons.Collapse />}
//                 </button>
//             </div>

//             {/* Scrollable body */}
//             <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
//                 {/* Global nav */}
//                 <nav style={{ padding: "4px 8px" }}>
//                     {!collapsed && (
//                         <p
//                             style={{
//                                 fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
//                                 color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
//                                 padding: "4px 8px 8px", margin: 0,
//                             }}
//                         >
//                             Navigation
//                         </p>
//                     )}
//                     {resolvedNav.map(({ label, href, icon: Icon, badgeKey }) => {
//                         const active = isActive(href);
//                         const badge = badgeKey === "messages" && unreadMessages > 0 ? unreadMessages : null;
//                         return (
//                             <Link
//                                 key={href}
//                                 href={href}
//                                 title={collapsed ? label : undefined}
//                                 style={{
//                                     display: "flex",
//                                     alignItems: "center",
//                                     gap: 10,
//                                     padding: collapsed ? "9px 0" : "9px 10px",
//                                     justifyContent: collapsed ? "center" : "flex-start",
//                                     borderRadius: 8,
//                                     marginBottom: 2,
//                                     color: active ? "#fff" : "rgba(255,255,255,0.5)",
//                                     background: active ? "rgba(99,102,241,0.15)" : "transparent",
//                                     textDecoration: "none",
//                                     fontSize: 14,
//                                     fontWeight: active ? 600 : 400,
//                                     transition: "background 0.15s, color 0.15s",
//                                     position: "relative",
//                                 }}
//                                 onMouseEnter={(e) => {
//                                     if (!active) {
//                                         e.currentTarget.style.background = "rgba(255,255,255,0.05)";
//                                         e.currentTarget.style.color = "#fff";
//                                     }
//                                 }}
//                                 onMouseLeave={(e) => {
//                                     if (!active) {
//                                         e.currentTarget.style.background = "transparent";
//                                         e.currentTarget.style.color = "rgba(255,255,255,0.5)";
//                                     }
//                                 }}
//                             >
//                                 {active && (
//                                     <span
//                                         style={{
//                                             position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
//                                             width: 3, height: 20, borderRadius: "0 2px 2px 0",
//                                             background: "#6366f1",
//                                         }}
//                                     />
//                                 )}
//                                 <span style={{ flexShrink: 0, position: "relative" }}>
//                                     <Icon />
//                                     {badge && collapsed && (
//                                         <span
//                                             style={{
//                                                 position: "absolute", top: -4, right: -4,
//                                                 background: "#ef4444", color: "#fff",
//                                                 fontSize: 9, fontWeight: 700,
//                                                 borderRadius: 99, minWidth: 14, height: 14,
//                                                 display: "flex", alignItems: "center", justifyContent: "center",
//                                                 padding: "0 3px",
//                                             }}
//                                         >
//                                             {badge > 99 ? "99+" : badge}
//                                         </span>
//                                     )}
//                                 </span>
//                                 {!collapsed && (
//                                     <>
//                                         <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
//                                             {label}
//                                         </span>
//                                         {badge && (
//                                             <span
//                                                 style={{
//                                                     background: "#ef4444", color: "#fff",
//                                                     fontSize: 10, fontWeight: 700,
//                                                     borderRadius: 99, minWidth: 18, height: 18,
//                                                     display: "flex", alignItems: "center", justifyContent: "center",
//                                                     padding: "0 5px", flexShrink: 0,
//                                                 }}
//                                             >
//                                                 {badge > 99 ? "99+" : badge}
//                                             </span>
//                                         )}
//                                     </>
//                                 )}
//                             </Link>
//                         );
//                     })}
//                 </nav>

//                 {/* Divider */}
//                 <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 16px" }} />

//                 {/* My Communities section */}
//                 <div style={{ padding: "4px 8px" }}>
//                     {!collapsed ? (
//                         <button
//                             onClick={() => setCommunitiesOpen((o) => !o)}
//                             style={{
//                                 background: "none", border: "none", cursor: "pointer",
//                                 display: "flex", alignItems: "center", justifyContent: "space-between",
//                                 width: "100%", padding: "4px 8px 8px",
//                                 color: "rgba(255,255,255,0.25)",
//                                 fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
//                             }}
//                         >
//                             <span>My Communities</span>
//                             <span
//                                 style={{
//                                     transform: communitiesOpen ? "rotate(0deg)" : "rotate(-90deg)",
//                                     transition: "transform 0.2s",
//                                 }}
//                             >
//                                 <Icons.ChevronDown />
//                             </span>
//                         </button>
//                     ) : (
//                         <div style={{ height: 8 }} />
//                     )}

//                     {/* Empty state */}
//                     {(communitiesOpen || collapsed) && communitiesToRender.length === 0 && !collapsed && (
//                         <p
//                             style={{
//                                 fontSize: 11,
//                                 color: "rgba(255,255,255,0.35)",
//                                 padding: "4px 10px",
//                                 margin: 0,
//                                 lineHeight: 1.5,
//                             }}
//                         >
//                             You haven't joined any yet.
//                         </p>
//                     )}

//                     {/* Communities */}
//                     {(communitiesOpen || collapsed) &&
//                         communitiesToRender.map((community) => {
//                             const href = `/c/community/${community.slug}`;
//                             const active = pathname.startsWith(href);
//                             return (
//                                 <Link
//                                     key={community.id}
//                                     href={href}
//                                     title={collapsed ? community.name : undefined}
//                                     style={{
//                                         display: "flex",
//                                         alignItems: "center",
//                                         gap: 10,
//                                         padding: collapsed ? "7px 0" : "7px 10px",
//                                         justifyContent: collapsed ? "center" : "flex-start",
//                                         borderRadius: 8,
//                                         marginBottom: 2,
//                                         color: active ? "#fff" : "rgba(255,255,255,0.5)",
//                                         background: active ? "rgba(99,102,241,0.15)" : "transparent",
//                                         textDecoration: "none",
//                                         fontSize: 13,
//                                         fontWeight: active ? 600 : 400,
//                                         transition: "background 0.15s, color 0.15s",
//                                         position: "relative",
//                                     }}
//                                     onMouseEnter={(e) => {
//                                         if (!active) {
//                                             e.currentTarget.style.background = "rgba(255,255,255,0.05)";
//                                             e.currentTarget.style.color = "#fff";
//                                         }
//                                     }}
//                                     onMouseLeave={(e) => {
//                                         if (!active) {
//                                             e.currentTarget.style.background = "transparent";
//                                             e.currentTarget.style.color = "rgba(255,255,255,0.5)";
//                                         }
//                                     }}
//                                 >
//                                     <span style={{ position: "relative", flexShrink: 0 }}>
//                                         <CommunityAvatar community={community} size={26} />
//                                         {community.unread_count && community.unread_count > 0 ? (
//                                             <span
//                                                 style={{
//                                                     position: "absolute", top: -3, right: -3,
//                                                     background: "#6366f1", color: "#fff",
//                                                     fontSize: 8, fontWeight: 700,
//                                                     borderRadius: 99, minWidth: 13, height: 13,
//                                                     display: "flex", alignItems: "center", justifyContent: "center",
//                                                     padding: "0 3px",
//                                                     border: "1.5px solid #0f0f11",
//                                                 }}
//                                             >
//                                                 {community.unread_count > 9 ? "9+" : community.unread_count}
//                                             </span>
//                                         ) : null}
//                                     </span>
//                                     {!collapsed && (
//                                         <span
//                                             style={{
//                                                 flex: 1,
//                                                 whiteSpace: "nowrap",
//                                                 overflow: "hidden",
//                                                 textOverflow: "ellipsis",
//                                                 fontSize: 13,
//                                             }}
//                                         >
//                                             {community.name}
//                                         </span>
//                                     )}
//                                 </Link>
//                             );
//                         })}

//                     {/* Discover link */}
//                     <Link
//                         href="/communities"
//                         title={collapsed ? "Discover communities" : undefined}
//                         style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: 10,
//                             padding: collapsed ? "7px 0" : "7px 10px",
//                             justifyContent: collapsed ? "center" : "flex-start",
//                             borderRadius: 8,
//                             marginTop: 4,
//                             color: "rgba(255,255,255,0.3)",
//                             textDecoration: "none",
//                             fontSize: 12,
//                             transition: "color 0.15s",
//                         }}
//                         onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
//                         onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
//                     >
//                         <span
//                             style={{
//                                 width: 26, height: 26, borderRadius: 8, flexShrink: 0,
//                                 border: "1.5px dashed rgba(255,255,255,0.2)",
//                                 display: "flex", alignItems: "center", justifyContent: "center",
//                             }}
//                         >
//                             <Icons.Plus />
//                         </span>
//                         {!collapsed && <span>Discover communities</span>}
//                     </Link>
//                 </div>
//             </div>

//             {/* Footer */}
//             <div
//                 style={{
//                     borderTop: "1px solid rgba(255,255,255,0.06)",
//                     padding: "8px",
//                     flexShrink: 0,
//                 }}
//             >
//                 <Link
//                     href="/c/settings"
//                     title={collapsed ? "Settings" : undefined}
//                     style={{
//                         display: "flex", alignItems: "center", gap: 10,
//                         padding: collapsed ? "8px 0" : "8px 10px",
//                         justifyContent: collapsed ? "center" : "flex-start",
//                         borderRadius: 8,
//                         color: "rgba(255,255,255,0.35)",
//                         textDecoration: "none", fontSize: 13,
//                         transition: "color 0.15s, background 0.15s",
//                     }}
//                     onMouseEnter={(e) => {
//                         e.currentTarget.style.color = "#fff";
//                         e.currentTarget.style.background = "rgba(255,255,255,0.05)";
//                     }}
//                     onMouseLeave={(e) => {
//                         e.currentTarget.style.color = "rgba(255,255,255,0.35)";
//                         e.currentTarget.style.background = "transparent";
//                     }}
//                 >
//                     <Icons.Settings />
//                     {!collapsed && <span>Settings</span>}
//                 </Link>
//                 <button
//                     onClick={handleSignOut}
//                     title={collapsed ? "Sign out" : undefined}
//                     style={{
//                         display: "flex", alignItems: "center", gap: 10,
//                         padding: collapsed ? "8px 0" : "8px 10px",
//                         justifyContent: collapsed ? "center" : "flex-start",
//                         width: "100%",
//                         borderRadius: 8,
//                         background: "none", border: "none", cursor: "pointer",
//                         color: "rgba(255,255,255,0.35)",
//                         fontSize: 13,
//                         transition: "color 0.15s, background 0.15s",
//                     }}
//                     onMouseEnter={(e) => {
//                         e.currentTarget.style.color = "#ef4444";
//                         e.currentTarget.style.background = "rgba(239,68,68,0.08)";
//                     }}
//                     onMouseLeave={(e) => {
//                         e.currentTarget.style.color = "rgba(255,255,255,0.35)";
//                         e.currentTarget.style.background = "transparent";
//                     }}
//                 >
//                     <Icons.SignOut />
//                     {!collapsed && <span>Sign out</span>}
//                 </button>
//             </div>
//         </aside>
//     );
// }
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import JimvioLogo from "@/components/ui/logo";
import { HubPremiumCard, HubUserCard } from "@/components/community/hub/hub-ui";
import { aggregateMemberPoints } from "@/lib/community/points";

const Icons = {
    Feed: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    ),
    Messages: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    ),
    Bookmarks: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
    ),
    Profile: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    Live: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2" />
            <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
        </svg>
    ),
    Events: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    Explore: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
    ),
    Spaces: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
    ),
    Missions: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
    ),
    Courses: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
    ),
    Wallet: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </svg>
    ),
    Analytics: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    ),
    ChevronDown: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
    Plus: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    Settings: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    SignOut: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
    Collapse: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    Expand: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    ),
    Close: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Community {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string | null;
    unread_count?: number;
}

interface HubSidebarProps {
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    communities?: Community[];
    username?: string;
    unreadMessages?: number;
    /** Mobile drawer state (controlled by parent layout) */
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
    { id: "feed", label: "Feed", href: "/c", icon: Icons.Feed },
    { id: "explore", label: "Explore", href: "/communities", icon: Icons.Explore },
    { id: "live", label: "Live", href: "/c/live", icon: Icons.Live, badgeKey: "live" },
    { id: "spaces", label: "Spaces", href: "/c/spaces", icon: Icons.Spaces },
    { id: "messages", label: "Messages", href: "/c/messages", icon: Icons.Messages, badgeKey: "messages" },
    { id: "missions", label: "Missions", href: "/c/missions", icon: Icons.Missions, badgeKey: "new" },
    { id: "courses", label: "Courses", href: "/c/courses", icon: Icons.Courses },
    { id: "events", label: "Events", href: "/c/events", icon: Icons.Events },
    { id: "wallet", label: "Wallet", href: "/c/wallet", icon: Icons.Wallet },
    { id: "analytics", label: "Analytics", href: "/c/analytics", icon: Icons.Analytics },
    { id: "bookmarks", label: "Bookmarks", href: "/c/bookmarks", icon: Icons.Bookmarks },
    { id: "profile", label: "My Profile", href: "/c/profile/__username__", icon: Icons.Profile },
];

// ── Fetch joined communities ──────────────────────────────────────────────────
function useCommunityList(initial: Community[]) {
    const [dbCommunities, setDbCommunities] = useState<Community[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function loadCommunities() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { if (!cancelled) setDbCommunities([]); return; }

            const { data, error } = await supabase
                .from("community_memberships")
                .select("community_id, subscribed_at, communities!inner(id, name, slug, avatar_url, is_active)")
                .eq("user_id", user.id)
                .eq("status", "active")
                .eq("communities.is_active", true)
                .order("subscribed_at", { ascending: false })
                .limit(50);

            if (cancelled) return;
            if (error) { console.error("[HubSidebar] Failed to load communities:", error); setDbCommunities([]); return; }

            const mapped = (data ?? []).map((row: any) => row.communities).filter(Boolean) as Community[];
            setDbCommunities(mapped);
        }

        loadCommunities();
        return () => { cancelled = true; };
    }, []);

    return dbCommunities ?? initial;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
    { bg: "#e0f2fe", fg: "#0369a1" },
    { bg: "#fce7f3", fg: "#9d174d" },
    { bg: "#dcfce7", fg: "#166534" },
    { bg: "#fef3c7", fg: "#92400e" },
    { bg: "#ede9fe", fg: "#5b21b6" },
];

function CommunityAvatar({ community, size = 26 }: { community: Community; size?: number }) {
    if (community.avatar_url) {
        return (
            <img
                src={community.avatar_url}
                alt={community.name}
                style={{ width: size, height: size, borderRadius: "var(--radius-sm, 8px)", objectFit: "cover", flexShrink: 0 }}
            />
        );
    }
    const { bg, fg } = AVATAR_COLORS[community.id.charCodeAt(0) % AVATAR_COLORS.length];
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: size, height: size, borderRadius: "var(--radius-sm, 8px)", flexShrink: 0,
            background: bg, color: fg, fontSize: size * 0.4, fontWeight: 700, letterSpacing: "-0.02em",
        }}>
            {getInitials(community.name)}
        </span>
    );
}

// ── Shared inner content ──────────────────────────────────────────────────────
function SidebarContent({
    collapsed,
    onToggleCollapse,
    username,
    unreadMessages,
    onLinkClick,
    showCloseButton,
    onClose,
}: {
    collapsed: boolean;
    onToggleCollapse?: () => void;
    username: string;
    unreadMessages: number;
    onLinkClick?: () => void;
    showCloseButton?: boolean;
    onClose?: () => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [communitiesOpen, setCommunitiesOpen] = useState(true);
    const [userCard, setUserCard] = useState<{
        name: string;
        avatarUrl: string | null;
        level: number;
        xp: number;
        xpMax: number;
    } | null>(null);
    const communitiesToRender = useCommunityList([]);

    useEffect(() => {
        let cancelled = false;
        async function loadUserCard() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            const [profileRes, pointsRes] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("full_name, username, avatar_url")
                    .eq("id", user.id)
                    .maybeSingle(),
                supabase
                    .from("member_points")
                    .select("total_points, level, streak_days")
                    .eq("user_id", user.id),
            ]);

            if (cancelled) return;

            const profile = profileRes.data;
            const points = aggregateMemberPoints(pointsRes.data ?? []);
            setUserCard({
                name: profile?.full_name ?? profile?.username ?? username.replace(/_/g, " ") ?? "Member",
                avatarUrl: profile?.avatar_url ?? null,
                level: points.level,
                xp: points.total_points - points.level_start_xp,
                xpMax: Math.max(points.next_level_xp - points.level_start_xp, 1),
            });
        }

        loadUserCard();
        return () => { cancelled = true; };
    }, [username]);

    const resolvedNav = NAV_ITEMS.map((item) => ({
        ...item,
        href: item.href.replace("__username__", username),
    }));

    const isActive = (id: string, href: string) => {
        const path = href.split("?")[0];

        if (path === "/c") return pathname === "/c";

        return pathname === path || pathname.startsWith(`${path}/`);
    };

    async function handleSignOut() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    }

    // ── Shared style helpers ──
    const navLink = (active: boolean): React.CSSProperties => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "9px 0" : "9px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "10px",
        marginBottom: 2,
        color: active ? "var(--color-accent, #fd5000)" : "var(--color-text-secondary, #71717a)",
        background: active ? "rgba(253,80,0,0.12)" : "transparent",
        textDecoration: "none",
        fontSize: 14,
        fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s",
        position: "relative",
    });

    const communityLink = (active: boolean): React.CSSProperties => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "7px 0" : "7px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "var(--radius-sm, 8px)",
        marginBottom: 2,
        color: active ? "var(--color-text-primary, #ededed)" : "var(--color-text-secondary, #a8a8a8)",
        background: active ? "rgba(253,80,0,0.1)" : "transparent",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: "background 0.15s, color 0.15s",
        position: "relative",
    });

    const hoverHandlers = (active: boolean) => ({
        onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (!active) {
                e.currentTarget.style.background = "var(--color-surface-secondary, rgba(255,255,255,0.05))";
                e.currentTarget.style.color = "var(--color-text-primary, #ededed)";
            }
        },
        onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (!active) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--color-text-secondary, #a8a8a8)";
            }
        },
    });

    const footerBtnBase: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "8px 0" : "8px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "var(--radius-sm, 8px)",
        color: "var(--color-text-muted, #6a6a6a)",
        textDecoration: "none",
        fontSize: 13,
        transition: "color 0.15s, background 0.15s",
    };

    return (
        <>
            {/* ── Logo + collapse toggle ── */}
            <div style={{
                height: 56, display: "flex", alignItems: "center",
                padding: "0 16px",
                justifyContent: collapsed ? "center" : "space-between",
                borderBottom: "1px solid var(--color-border, rgba(255,255,255,0.06))",
                flexShrink: 0,
            }}>
                {!collapsed && (
                    <JimvioLogo />
                )}

                {/* Desktop: collapse button / Mobile drawer: close button */}
                {showCloseButton ? (
                    <button
                        onClick={onClose}
                        aria-label="Close navigation"
                        style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--color-text-muted, #6a6a6a)", padding: 6,
                            borderRadius: "var(--radius-sm, 8px)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >
                        <Icons.Close />
                    </button>
                ) : (
                    <button
                        onClick={onToggleCollapse}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--color-text-muted, #6a6a6a)", padding: 6,
                            borderRadius: "var(--radius-sm, 8px)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "color 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary, #ededed)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted, #6a6a6a)")}
                    >
                        {collapsed ? <Icons.Expand /> : <Icons.Collapse />}
                    </button>
                )}
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
                {/* Global nav */}
                <nav style={{ padding: "4px 8px" }}>

                    {resolvedNav.map(({ id, label, href, icon: Icon, badgeKey }) => {
                        const active = isActive(id, href);
                        const badge =
                            badgeKey === "messages" && unreadMessages > 0 ? unreadMessages
                            : badgeKey === "new" ? "New"
                            : badgeKey === "live" ? "LIVE"
                            : null;
                        return (
                            <Link
                                key={id}
                                href={href}
                                title={collapsed ? label : undefined}
                                style={navLink(active)}
                                onClick={onLinkClick}
                                {...hoverHandlers(active)}
                            >
                                {active && (
                                    <span style={{
                                        position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                                        width: 3, height: 20, borderRadius: "0 2px 2px 0",
                                        background: "var(--color-accent, #fd5000)",
                                    }} />
                                )}
                                <span style={{ flexShrink: 0, position: "relative" }}>
                                    <Icon />
                                    {badge && collapsed && typeof badge === "number" && (
                                        <span style={{
                                            position: "absolute", top: -4, right: -4,
                                            background: "var(--color-danger, #f07070)", color: "#fff",
                                            fontSize: 9, fontWeight: 700, borderRadius: 99,
                                            minWidth: 14, height: 14,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            padding: "0 3px",
                                        }}>
                                            {badge > 99 ? "99+" : badge}
                                        </span>
                                    )}
                                </span>
                                {!collapsed && (
                                    <>
                                        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {label}
                                        </span>
                                        {badge && typeof badge === "number" && (
                                            <span style={{
                                                background: "var(--color-danger, #f07070)", color: "#fff",
                                                fontSize: 10, fontWeight: 700, borderRadius: 99,
                                                minWidth: 18, height: 18,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                padding: "0 5px", flexShrink: 0,
                                            }}>
                                                {badge > 99 ? "99+" : badge}
                                            </span>
                                        )}
                                        {badge && typeof badge === "string" && (
                                            <span style={{
                                                background: badge === "LIVE" ? "#ef4444" : "var(--color-accent, #fd5000)",
                                                color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 99,
                                                padding: "0 6px", height: 16, display: "flex", alignItems: "center",
                                            }}>{badge}</span>
                                        )}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--color-border, rgba(255,255,255,0.06))", margin: "8px 16px" }} />

                {/* Communities section */}
                <div style={{ padding: "4px 8px" }}>
                    {!collapsed ? (
                        <button
                            onClick={() => setCommunitiesOpen((o) => !o)}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                width: "100%", padding: "4px 8px 8px",
                                color: "var(--color-text-muted, #6a6a6a)",
                                fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                            }}
                        >
                            <span>My Communities</span>
                            <span style={{
                                transform: communitiesOpen ? "rotate(0deg)" : "rotate(-90deg)",
                                transition: "transform 0.2s",
                            }}>
                                <Icons.ChevronDown />
                            </span>
                        </button>
                    ) : (
                        <div style={{ height: 8 }} />
                    )}

                    {/* Empty state */}
                    {(communitiesOpen || collapsed) && communitiesToRender.length === 0 && !collapsed && (
                        <p style={{
                            fontSize: 11, color: "var(--color-text-muted, #6a6a6a)",
                            padding: "4px 10px", margin: 0, lineHeight: 1.5,
                        }}>
                            You haven't joined any yet.
                        </p>
                    )}

                    {/* Community list */}
                    {(communitiesOpen || collapsed) && communitiesToRender.map((community) => {
                        const href = `/c/community/${community.slug}`;
                        const active = pathname.startsWith(href);
                        return (
                            <Link
                                key={community.id}
                                href={href}
                                title={collapsed ? community.name : undefined}
                                style={communityLink(active)}
                                onClick={onLinkClick}
                                {...hoverHandlers(active)}
                            >
                                <span style={{ position: "relative", flexShrink: 0 }}>
                                    <CommunityAvatar community={community} size={26} />
                                    {community.unread_count && community.unread_count > 0 ? (
                                        <span style={{
                                            position: "absolute", top: -3, right: -3,
                                            background: "var(--color-accent, #fd5000)", color: "#fff",
                                            fontSize: 8, fontWeight: 700, borderRadius: 99,
                                            minWidth: 13, height: 13,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            padding: "0 3px",
                                            border: "1.5px solid var(--color-surface, #0f0f11)",
                                        }}>
                                            {community.unread_count > 9 ? "9+" : community.unread_count}
                                        </span>
                                    ) : null}
                                </span>
                                {!collapsed && (
                                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}>
                                        {community.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                    {/* Discover link */}
                    <Link
                        href="/communities"
                        title={collapsed ? "Discover communities" : undefined}
                        style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: collapsed ? "7px 0" : "7px 10px",
                            justifyContent: collapsed ? "center" : "flex-start",
                            borderRadius: "var(--radius-sm, 8px)", marginTop: 4,
                            color: "var(--color-text-muted, #6a6a6a)",
                            textDecoration: "none", fontSize: 12,
                            transition: "color 0.15s",
                        }}
                        onClick={onLinkClick}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary, #a8a8a8)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted, #6a6a6a)")}
                    >
                        <span style={{
                            width: 26, height: 26, borderRadius: "var(--radius-sm, 8px)", flexShrink: 0,
                            border: "1.5px dashed var(--color-border-strong, rgba(255,255,255,0.15))",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Icons.Plus />
                        </span>
                        {!collapsed && <span>Discover communities</span>}
                    </Link>
                </div>

                {!collapsed && (
                    <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 8 }}>
                        <HubPremiumCard />
                        <HubUserCard
                            name={userCard?.name ?? (username ? username.replace(/_/g, " ") : "Member")}
                            level={`Level ${userCard?.level ?? 1} · Creator`}
                            xp={userCard?.xp ?? 0}
                            xpMax={userCard?.xpMax ?? 1}
                            avatarUrl={userCard?.avatarUrl}
                            username={username || undefined}
                        />
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div style={{ borderTop: "1px solid var(--color-border, rgba(255,255,255,0.06))", padding: "8px", flexShrink: 0 }}>
                <Link
                    href="/c/settings"
                    title={collapsed ? "Settings" : undefined}
                    style={{ ...footerBtnBase, display: "flex" }}
                    onClick={onLinkClick}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--color-text-primary, #ededed)";
                        e.currentTarget.style.background = "var(--color-surface-secondary, rgba(255,255,255,0.05))";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--color-text-muted, #6a6a6a)";
                        e.currentTarget.style.background = "transparent";
                    }}
                >
                    <Icons.Settings />
                    {!collapsed && <span>Settings</span>}
                </Link>
                <button
                    onClick={handleSignOut}
                    title={collapsed ? "Sign out" : undefined}
                    style={{
                        ...footerBtnBase,
                        display: "flex",
                        background: "none", border: "none", cursor: "pointer", width: "100%",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--color-danger, #f07070)";
                        e.currentTarget.style.background = "rgba(240,112,112,0.08)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--color-text-muted, #6a6a6a)";
                        e.currentTarget.style.background = "transparent";
                    }}
                >
                    <Icons.SignOut />
                    {!collapsed && <span>Sign out</span>}
                </button>
            </div>
        </>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HubSidebar({
    collapsed = false,
    onToggleCollapse,
    communities = [],
    username = "me",
    unreadMessages = 0,
    mobileOpen = false,
    onMobileClose,
}: HubSidebarProps) {

    const sidebarBase: React.CSSProperties = {
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-surface, #ffffff)",
        borderRight: "1px solid var(--color-border, rgba(0,0,0,0.08))",
        overflow: "hidden",
        position: "sticky",
        top: 0,
        zIndex: 40,
    };

    return (
        <div
            className="hub-sidebar-root"
            style={{
                flexShrink: 0,
                width: collapsed ? 64 : 240,
                minWidth: collapsed ? 64 : 240,
                transition: "width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)",
            }}
        >
            {/* Desktop sidebar */}
            <aside
                className="hub-sidebar"
                style={{
                    ...sidebarBase,
                    width: "100%",
                    minWidth: 0,
                }}
            >
                <SidebarContent
                    collapsed={collapsed}
                    onToggleCollapse={onToggleCollapse}
                    username={username}
                    unreadMessages={unreadMessages}
                />
            </aside>

            {/* Mobile drawer — only mount when open to avoid duplicate nav in the DOM */}
            {mobileOpen && (
                <aside
                    className="hub-sidebar-mobile-open"
                    style={{
                        ...sidebarBase,
                        position: "fixed",
                        top: 52,
                        left: 0,
                        width: 260,
                        height: "calc(100vh - 52px)",
                        zIndex: 99,
                    }}
                >
                    <SidebarContent
                        collapsed={false}
                        username={username}
                        unreadMessages={unreadMessages}
                        onLinkClick={onMobileClose}
                        showCloseButton
                        onClose={onMobileClose}
                    />
                </aside>
            )}
        </div>
    );
}
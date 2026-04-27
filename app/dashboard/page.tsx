// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import {
//   ShoppingCart, Package, DollarSign, Globe, Plus, Video, ArrowRight,
//   Truck, Wallet, Heart, Zap, Sparkles, Activity,
//   Link2, Users, ChevronRight, MessageSquare, Store,
//   Target, Globe2, Radio, Camera,
//   Users2, LayoutGrid, Settings, Search, Box, TrendingUp, LayoutDashboard,
//   Eye, EyeOff, ArrowUpRight,
// } from "lucide-react";
// import {
//   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
// } from "recharts";
// import { Button } from "@/components/ui/button";
// import { createClient } from "@/lib/supabase/client";
// import { cn } from "@/lib/utils";
// import { useCurrency } from "@/context/CurrencyContext";
// import { useUserStore } from "@/lib/store/use-user-store";

// /* ─── Types ─── */
// interface DashStats {
//   orders: number; wishlist: number; affiliateEarnings: number; affiliateLinks: number;
//   vendorRevenue: number; vendorOrders: number; vendorProducts: number;
//   activeMissions: number; totalSubmissionsReceived: number;
//   missionsJoined: number; mySubmissions: number;
//   communitiesJoined: number; communitiesCreated: number;
// }

// /* ═════════════════════════════════════════════════════════════════════════════
//    REUSABLE COMPONENTS
//    ═════════════════════════════════════════════════════════════════════════════ */

// /** Command Center Stat Card */
// function StatCard({ value, label, icon, colorClass, borderClass }: {
//   value: string | number; label: string; icon: React.ReactNode; colorClass: string; borderClass: string;
// }) {
//   return (
//     <div className="relative group p-4 sm:p-5 flex flex-col justify-between min-h-[110px] sm:min-h-[130px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm transition-all duration-300 rounded-2xl">
//       <div className={cn("w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0 border bg-[var(--color-surface-secondary)] transition-colors duration-300 rounded-xl", borderClass, colorClass, "group-hover:bg-[var(--color-surface-secondary)]/80")}>
//         {icon as React.ReactNode}
//       </div>
//       <div className="mt-3 sm:mt-4">
//         <p className="text-[22px] sm:text-[26px] font-black text-[var(--color-text-primary)] tabular-nums tracking-tighter leading-none">{value}</p>
//         <p className="mt-1.5 text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest break-words truncate">{label}</p>
//       </div>
//     </div>
//   );
// }

// /** Action Row Button */
// function ActionRow({ href, icon, label, highlight = false }: {
//   href: string; icon: React.ReactNode; label: string; highlight?: boolean;
// }) {
//   return (
//     <Link href={href} className="group block">
//       <div className={cn(
//         "flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 border transition-all duration-300 active:scale-[0.98] rounded-2xl",
//         highlight
//           ? "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20"
//           : "bg-white dark:bg-[#0A0A0A] border-stone-200 dark:border-[#222] hover:bg-stone-50 dark:hover:bg-[#111] hover:border-stone-300 dark:hover:border-[#333]"
//       )}>
//         <div className={cn(
//           "h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center shrink-0 border rounded-xl",
//           highlight ? "bg-[var(--color-surface-secondary)] border-orange-500/20 text-orange-500" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:border-[var(--color-border-strong)]"
//         )}>
//           {icon as React.ReactNode}
//         </div>
//         <span className={cn(
//           "text-[11px] font-bold flex-1 truncate uppercase tracking-widest",
//           highlight ? "text-orange-500" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"
//         )}>{label}</span>
//         <ChevronRight className={cn(
//           "h-4 w-4 transition-transform group-hover:translate-x-1",
//           highlight ? "text-orange-400" : "text-[var(--color-text-muted)]"
//         )} />
//       </div>
//     </Link>
//   );
// }

// /** Section Header */
// function SectionHeader({ title, icon, actionHref, actionLabel = "View All" }: {
//   title: string; icon: React.ReactNode; actionHref?: string; actionLabel?: string;
// }) {
//   return (
//     <div className="flex items-center justify-between px-1 mb-4">
//       <div className="flex items-center gap-3">
//         <div className="text-orange-500 bg-[var(--color-surface-secondary)] p-1.5 border border-[var(--color-border)] shadow-sm rounded-lg">
//           {icon as React.ReactNode}
//         </div>
//         <h2 className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-widest font-mono">{title}</h2>
//       </div>
//       {actionHref && (
//         <Link href={actionHref} className="text-[10px] font-bold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-widest font-mono">
//           {actionLabel}
//         </Link>
//       )}
//     </div>
//   );
// }

// /* ═════════════════════════════════════════════════════════════════════════════
//    MAIN DASHBOARD
//    ═════════════════════════════════════════════════════════════════════════════ */

// export default function DashboardPage() {
//   const { formatMoney } = useCurrency();
//   const { activeRoles, fetchRoles } = useUserStore();
//   const [profile, setProfile] = useState<{ full_name?: string | null } | null>(null);
//   const [stats, setStats] = useState<DashStats>({
//     orders: 0, wishlist: 0, affiliateEarnings: 0, affiliateLinks: 0,
//     vendorRevenue: 0, vendorOrders: 0, vendorProducts: 0,
//     activeMissions: 0, totalSubmissionsReceived: 0,
//     missionsJoined: 0, mySubmissions: 0,
//     communitiesJoined: 0, communitiesCreated: 0,
//   });
//   const [walletBalance, setWalletBalance] = useState({ available: 0, pending: 0 });
//   const [loading, setLoading] = useState(true);
//   const [greeting, setGreeting] = useState("Hello");
//   const [balanceHidden, setBalanceHidden] = useState(true);

//   const chartData = useMemo(() => {
//     const total = stats.vendorRevenue + stats.affiliateEarnings;
//     const base = total || 450;
//     return [
//       { name: "Mon", v: base * 0.12 }, { name: "Tue", v: base * 0.18 },
//       { name: "Wed", v: base * 0.14 }, { name: "Thu", v: base * 0.28 },
//       { name: "Fri", v: base * 0.22 }, { name: "Sat", v: base * 0.38 },
//       { name: "Sun", v: base * 0.45 },
//     ];
//   }, [stats.vendorRevenue, stats.affiliateEarnings]);

//   useEffect(() => {
//     const h = new Date().getHours();
//     if (h < 12) setGreeting("Good Morning");
//     else if (h < 18) setGreeting("Good Afternoon");
//     else setGreeting("Good Evening");
//   }, []);

//   useEffect(() => {
//     async function load() {
//       const supabase = createClient();
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;
//       const profileRes = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
//       if (profileRes.data) setProfile(profileRes.data);
//       await fetchRoles();

//       const [ordersRes, wishlistRes, affiliateRes, walletRes] = await Promise.all([
//         supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
//         supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", user.id),
//         supabase.from("affiliates").select("total_earnings").eq("user_id", user.id).maybeSingle(),
//         supabase.from("wallets").select("available_balance, pending_balance").eq("user_id", user.id).maybeSingle(),
//       ]);
//       if (walletRes.data) setWalletBalance({ available: Number(walletRes.data.available_balance || 0), pending: Number(walletRes.data.pending_balance || 0) });

//       let vendorRevenue = 0, vendorOrders = 0, vendorProducts = 0;
//       let activeMissions = 0, totalSubmissionsReceived = 0, missionsJoined = 0, mySubmissions = 0;

//       if (activeRoles.includes("vendor")) {
//         const { data: userVendors } = await supabase.from("vendors").select("id").eq("user_id", user.id);
//         if (userVendors?.length) {
//           const vendorIds = userVendors.map(v => v.id);
//           const [pCount, oItems, missions, subs] = await Promise.all([
//             supabase.from("products").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds).eq("is_active", true),
//             supabase.from("order_items").select("total_price").in("vendor_id", vendorIds),
//             supabase.from("ugc_campaigns").select("id", { count: "exact", head: true }).in("brand_id", vendorIds).eq("status", "active"),
//             supabase.from("ugc_submissions").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
//           ]);
//           vendorProducts = pCount.count ?? 0;
//           vendorOrders = oItems.data?.length ?? 0;
//           vendorRevenue = oItems.data?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;
//           activeMissions = missions.count ?? 0;
//           totalSubmissionsReceived = subs.count ?? 0;
//         }
//       }
//       if (activeRoles.includes("influencer")) {
//         const [joined, sent] = await Promise.all([
//           supabase.from("ugc_campaign_participants").select("id", { count: "exact", head: true }).eq("influencer_id", user.id),
//           supabase.from("ugc_submissions").select("id", { count: "exact", head: true }).eq("influencer_id", user.id),
//         ]);
//         missionsJoined = joined.count ?? 0;
//         mySubmissions = sent.count ?? 0;
//       }

//       const [commJoined, commCreated, affLinks] = await Promise.all([
//         supabase.from("community_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
//         supabase.from("communities").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
//         supabase.from("affiliate_links").select("id", { count: "exact", head: true }).eq("user_id", user.id),
//       ]);

//       setStats({
//         orders: ordersRes.count ?? 0, wishlist: wishlistRes.count ?? 0,
//         affiliateEarnings: Number(affiliateRes.data?.total_earnings ?? 0),
//         affiliateLinks: affLinks.count ?? 0,
//         vendorRevenue, vendorOrders, vendorProducts,
//         activeMissions, totalSubmissionsReceived,
//         missionsJoined, mySubmissions,
//         communitiesJoined: commJoined.count ?? 0,
//         communitiesCreated: commCreated.count ?? 0,
//       });
//       setLoading(false);
//     }
//     load();
//   }, [fetchRoles, activeRoles.length]); // eslint-disable-line

//   const firstName = (profile?.full_name as string)?.split(" ")[0] ?? "User";

//   /* ─── Loading State ─── */
//   if (loading) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-700 bg-[var(--color-bg)]">
//         <div className="relative">
//           <div className="absolute inset-0 bg-orange-500/20 blur-3xl scale-150 animate-pulse rounded-full" />
//           <div className="relative w-20 h-20 bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden shadow-sm rounded-2xl">
//              <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin m-2 rounded-full" />
//             <LayoutDashboard className="h-8 w-8 text-[var(--color-text-primary)]" />
//           </div>
//         </div>
//         <div className="text-center space-y-2">
//           <h2 className="text-[13px] font-black text-[var(--color-text-primary)] uppercase tracking-[0.3em]">Loading Console</h2>
//           <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Establishing parameters...</p>
//         </div>
//       </div>
//     );
//   }

//   /* ─── Main Render ─── */
//   return (
//     <div className="min-h-screen pb-24 relative bg-[var(--color-bg)] text-[var(--color-text-primary)]">

//       <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 pt-5 relative animate-in fade-in slide-in-from-bottom-4 duration-500">

//         {/* ═════════════════════════════════════════════════════════════════════
//             GREETING
//         ═════════════════════════════════════════════════════════════════════ */}
//         <div className="space-y-1.5 py-4 border-b border-[var(--color-border)]">
//           <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tighter">
//             {greeting}, <span className="text-orange-500">{firstName}</span>
//           </h1>
//           <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.25em] font-mono">
//             Command Center Overview
//           </p>
//         </div>

//         {/* ═════════════════════════════════════════════════════════════════════
//             MY WALLET — Large Featured Card
//         ═════════════════════════════════════════════════════════════════════ */}
//         <Link href="/dashboard/wallet" className="block outline-none group">
//           <div className="relative overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] p-6 sm:p-10 transition-all duration-300 active:scale-[0.98] hover:border-orange-500/30 shadow-sm hover:shadow-orange-500/10">
//             {/* Ambient Accent Glows */}
//             <div className="absolute -top-32 -right-32 w-64 h-64 sm:w-96 sm:h-96 bg-orange-600/10 blur-[80px] group-hover:bg-orange-600/20 transition-all duration-700 rounded-full" />

//             <div className="relative z-10">
//               {/* Header row */}
//               <div className="flex items-center justify-between mb-6 sm:mb-8">
//                 <div className="flex items-center gap-4">
//                   <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(249,115,22,0.2)]">
//                     <Wallet className="h-5.5 w-5.5" />
//                   </div>
//                   <div>
//                     <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] block">My Portfolio</span>
//                     <span className="text-sm font-bold text-[var(--color-text-primary)]">Jimvio Wallet</span>
//                   </div>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBalanceHidden(v => !v); }}
//                   className="h-10 w-10 rounded-xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)]/80 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all border border-[var(--color-border)]"
//                   aria-label={balanceHidden ? "Show balance" : "Hide balance"}
//                 >
//                   {balanceHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                 </button>
//               </div>

//               {/* Balance Grid */}
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 items-end">
//                 <div>
//                   <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 sm:mb-2 font-mono">Available to spend</p>
//                   <p className="text-4xl sm:text-6xl font-bold text-[var(--color-text-primary)] tabular-nums tracking-tighter leading-none font-mono">
//                     {balanceHidden ? "••••••" : formatMoney(walletBalance.available, "USD")}
//                   </p>
//                 </div>
//                 <div className="sm:text-right space-y-3">
//                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl">
//                       <div className="h-1.5 w-1.5 bg-orange-500 animate-pulse rounded-full" />
//                       <span className="text-xs font-bold text-[var(--color-text-muted)] font-mono">
//                         {balanceHidden ? "••••" : formatMoney(walletBalance.pending, "USD")} pending
//                       </span>
//                    </div>
//                    <div className="flex items-center sm:justify-end gap-2 text-[var(--color-text-muted)] hover:text-orange-500 transition-colors text-[10px] uppercase font-bold tracking-widest">
//                      Manage Wallet <ArrowUpRight className="h-3 w-3" />
//                    </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </Link>

//         {/* QUICK ACTIONS */}
//         <div className="grid grid-cols-4 gap-2 sm:gap-3">
//           {[
//             { href: "/dashboard/wallet", icon: <Wallet />, label: "Add Funds", color: "text-orange-500" },
//             { href: "/dashboard/messages", icon: <MessageSquare />, label: "Messages", color: "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" },
//             { href: "/dashboard/settings", icon: <Settings />, label: "Settings", color: "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" },
//             { href: "/support", icon: <Heart />, label: "Help", color: "text-rose-500" },
//           ].map(item => (
//             <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 p-3 sm:p-4 rounded-[1.5rem] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] transition-all active:scale-95 group shadow-sm text-center">
//               {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: cn("h-5 w-5 sm:h-6 sm:w-6 transition-transform", item.color) })}
//               <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] truncate w-full">{item.label}</span>
//             </Link>
//           ))}
//         </div>

//         {/* MAIN GRID */}
//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">

//           {/* ─── LEFT COLUMN ─── */}
//           <div className="lg:col-span-8 space-y-8">

//             {/* Earnings Chart */}
//             <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-7 overflow-hidden shadow-sm transition-all">
//               <div className="flex items-center justify-between mb-6 sm:mb-8">
//                 <div className="space-y-1.5">
//                   <h3 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Earnings Overview</h3>
//                   <p className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
//                     {chartData[6].v > chartData[0].v ? "Growing this week" : "Steady activity"}
//                   </p>
//                 </div>
//                 <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 rounded-xl">
//                   <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
//                   <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest font-mono">This Week</span>
//                 </div>
//               </div>
//               <div className="h-[200px] -ml-5 -mr-1">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <AreaChart data={chartData}>
//                     <defs>
//                       <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
//                         <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
//                       </linearGradient>
//                     </defs>
//                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
//                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 10, fontWeight: 800, fontFamily: "monospace" }} />
//                     <YAxis hide />
//                     <Tooltip contentStyle={{ background: "var(--color-surface)", borderRadius: "0", border: "1px solid var(--color-border)", fontSize: "12px", fontWeight: 700, padding: "10px 16px", color: "var(--color-text-primary)" }} />
//                     <Area type="monotone" dataKey="v" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)"
//                       dot={{ r: 3, fill: "#111", stroke: "#f97316", strokeWidth: 2 }}
//                       activeDot={{ r: 5, fill: "#f97316", stroke: "#111", strokeWidth: 2 }}
//                     />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>

//             {/* ─── ROLE-BASED SECTIONS ─── */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

//               {/* 1. BUYER — Always visible */}
//               <div className="space-y-4">
//                 <SectionHeader title="My Shopping" icon={<ShoppingCart className="h-4 w-4" />} actionHref="/dashboard/orders" />
//                 <div className="grid grid-cols-2 gap-3">
//                   <StatCard value={stats.orders} label="My Orders" icon={<Package className="text-orange-500" />} colorClass="text-orange-500" borderClass="border-orange-500/20" />
//                   <StatCard value={stats.wishlist} label="Wishlist" icon={<Heart className="text-rose-500" />} colorClass="text-rose-500" borderClass="border-rose-500/20" />
//                 </div>
//                 <div className="space-y-2.5">
//                   <ActionRow href="/dashboard/orders" icon={<Truck />} label="Track My Orders" />
//                   <ActionRow href="/" icon={<Globe />} label="Browse Products" highlight />
//                 </div>
//               </div>

//               {/* 2. VENDOR — Conditional */}
//               {activeRoles.includes("vendor") && (
//                 <div className="space-y-4">
//                   <SectionHeader title="My Store" icon={<Store className="h-4 w-4" />} actionHref="/dashboard/vendor/store" />
//                   <div className="grid grid-cols-2 gap-3">
//                     <StatCard value={stats.vendorProducts} label="Products" icon={<Box className="text-violet-500" />} colorClass="text-violet-500" borderClass="border-violet-500/20" />
//                     <StatCard value={formatMoney(stats.vendorRevenue, "USD")} label="Revenue" icon={<DollarSign className="text-emerald-500" />} colorClass="text-emerald-500" borderClass="border-emerald-500/20" />
//                   </div>
//                   <div className="space-y-2.5">
//                     <ActionRow href="/dashboard/vendor/orders" icon={<Package />} label="Manage Orders" />
//                     <ActionRow href="/dashboard/products/new" icon={<Plus />} label="Add New Product" highlight />
//                   </div>
//                 </div>
//               )}

//               {/* 3. INFLUENCER / CREATOR — Conditional */}
//               {activeRoles.includes("influencer") && (
//                 <div className="space-y-4">
//                   <SectionHeader title="Creator Hub" icon={<Video className="h-4 w-4" />} actionHref="/dashboard/influencer" />
//                   <div className="grid grid-cols-2 gap-3">
//                     <StatCard value={stats.missionsJoined} label="Missions Joined" icon={<Target className="text-indigo-500" />} colorClass="text-indigo-500" borderClass="border-indigo-500/20" />
//                     <StatCard value={stats.mySubmissions} label="My Uploads" icon={<Camera className="text-pink-500" />} colorClass="text-pink-500" borderClass="border-pink-500/20" />
//                   </div>
//                   <div className="space-y-2.5">
//                     <ActionRow href="/ugc" icon={<Search />} label="Find Missions" highlight />
//                     <ActionRow href="/dashboard/influencer/analytics" icon={<Activity />} label="My Analytics" />
//                   </div>
//                 </div>
//               )}

//               {/* 4. MISSION OWNER — Conditional (vendor with campaigns) */}
//               {activeRoles.includes("vendor") && stats.activeMissions > 0 && (
//                 <div className="space-y-4">
//                   <SectionHeader title="My Missions" icon={<Zap className="h-4 w-4" />} actionHref="/dashboard/vendor/campaigns" />
//                   <div className="grid grid-cols-2 gap-3">
//                     <StatCard value={stats.activeMissions} label="Active Missions" icon={<Radio className="text-amber-500" />} colorClass="text-amber-500" borderClass="border-amber-500/20" />
//                     <StatCard value={stats.totalSubmissionsReceived} label="Submissions" icon={<Camera className="text-sky-500" />} colorClass="text-sky-500" borderClass="border-sky-500/20" />
//                   </div>
//                   <div className="space-y-2.5">
//                     <ActionRow href="/dashboard/vendor/campaigns/new" icon={<Plus />} label="Create Mission" highlight />
//                     <ActionRow href="/dashboard/vendor/campaigns" icon={<LayoutGrid />} label="View All Missions" />
//                   </div>
//                 </div>
//               )}

//               {/* 5. AFFILIATE — Conditional */}
//               {activeRoles.includes("affiliate") && (
//                 <div className="space-y-4">
//                   <SectionHeader title="Affiliate Hub" icon={<Link2 className="h-4 w-4" />} actionHref="/dashboard/links" />
//                   <div className="grid grid-cols-2 gap-3">
//                     <StatCard value={formatMoney(stats.affiliateEarnings, "USD")} label="Earnings" icon={<DollarSign className="text-emerald-500" />} colorClass="text-emerald-500" borderClass="border-emerald-500/20" />
//                     <StatCard value={stats.affiliateLinks} label="Active Links" icon={<Link2 className="text-sky-500" />} colorClass="text-sky-500" borderClass="border-sky-500/20" />
//                   </div>
//                   <div className="space-y-2.5">
//                     <ActionRow href="/dashboard/links" icon={<Plus />} label="Create Link" highlight />
//                     <ActionRow href="/dashboard/affiliate/analytics" icon={<TrendingUp />} label="View Performance" />
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ─── RIGHT COLUMN ─── */}
//           <div className="lg:col-span-4 space-y-8">

//             {/* 6. COMMUNITIES — Always visible */}
//             <div className="space-y-4">
//               <SectionHeader title="Communities" icon={<Users2 className="h-4 w-4" />} actionHref="/communities" />
//               <div className="space-y-3">
//                 <div className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors group shadow-sm rounded-2xl">
//                   <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-sky-500 flex items-center justify-center shrink-0">
//                     <Globe2 className="h-4 w-4 sm:h-5 sm:w-5" />
//                   </div>
//                   <div>
//                     <p className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] tracking-tighter leading-none tabular-nums">{stats.communitiesJoined}</p>
//                     <p className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1 sm:mt-1.5 font-mono">Joined</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors group shadow-sm rounded-2xl">
//                   <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-orange-500 flex items-center justify-center shrink-0">
//                     <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
//                   </div>
//                   <div>
//                     <p className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] tracking-tighter leading-none tabular-nums">{stats.communitiesCreated}</p>
//                     <p className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1 sm:mt-1.5 font-mono">Created</p>
//                   </div>
//                 </div>
//               </div>
//               <div className="space-y-2.5">
//                 <ActionRow href="/communities" icon={<Users />} label="Explore Communities" />
//                 <ActionRow href="/communities/create" icon={<Plus />} label="Start a Community" highlight />
//               </div>
//             </div>

//             {/* Learn & Grow */}
//             <div className="p-6 sm:p-7 rounded-2xl bg-orange-600 overflow-hidden relative group">
//               <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 blur-[50px] translate-x-1/3 -translate-y-1/3 group-hover:bg-white/20 transition-all duration-700" />
//               <div className="relative z-10 space-y-4">
//                 <div className="flex items-center gap-2.5">
//                   <div className="bg-black/20 p-1.5 rounded-lg text-white shadow-inner">
//                     <Sparkles className="h-4 w-4" />
//                   </div>
//                   <span className="text-[10px] font-black text-white uppercase tracking-widest">Learn &amp; Grow</span>
//                 </div>
//                 <h3 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tighter">Grow your business with Jimvio</h3>
//                 <p className="text-white/80 text-[11px] sm:text-[12px] leading-relaxed font-semibold">
//                   Guides, tips, and strategies to sell more and reach new customers.
//                 </p>
//                 <Button asChild className="w-full bg-black text-white hover:bg-zinc-900 active:scale-95 h-11 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all border-none shadow-sm mt-2">
//                   <Link href="/help">Explore Guides <ArrowRight className="h-4 w-4 ml-2" /></Link>
//                 </Button>
//               </div>
//             </div>

//             {/* Your Roles */}
//             <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4 sm:space-y-5 shadow-sm transition-all">
//               <div className="flex items-center justify-between">
//                 <span className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest font-mono">Your Roles</span>
//                 <Link href="/dashboard/roles" className="text-[9px] sm:text-[10px] font-bold text-orange-500 uppercase tracking-widest font-mono hover:text-orange-400 transition-colors">
//                   Manage
//                 </Link>
//               </div>
//               <div className="flex flex-wrap gap-2">
//                 {activeRoles.map(role => (
//                   <div key={role} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-sm capitalize">
//                     {role}
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Help Link */}
//             <div className="flex items-center justify-center pt-1">
//               <Link href="/support" className="flex items-center gap-2.5 text-[var(--color-text-muted)] hover:text-orange-600 transition-colors group">
//                 <MessageSquare className="h-4 w-4 group-hover:scale-110 transition-transform" />
//                 <span className="text-[11px] font-black uppercase tracking-widest">Need Help?</span>
//               </Link>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart, Package, DollarSign, Globe, Plus, Video, ArrowRight,
  Truck, Wallet, Heart, Zap, Sparkles, Activity,
  Link2, Users, ChevronRight, MessageSquare, Store,
  Target, Globe2, Radio, Camera,
  Users2, LayoutGrid, Settings, Search, Box, TrendingUp, LayoutDashboard,
  Eye, EyeOff, ArrowUpRight,
  MessageCircleQuestion,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { useUserStore } from "@/lib/store/use-user-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashStats {
  orders: number; wishlist: number; affiliateEarnings: number; affiliateLinks: number;
  vendorRevenue: number; vendorOrders: number; vendorProducts: number;
  activeMissions: number; totalSubmissionsReceived: number;
  missionsJoined: number; mySubmissions: number;
  communitiesJoined: number; communitiesCreated: number;
}

// ─── Reusable primitives ──────────────────────────────────────────────────────

/** Compact stat card — icon row + value + label */
function StatCard({ value, label, icon, iconColor }: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  iconColor: string; // tailwind color class e.g. "text-orange-500"
}) {
  return (
    <div className="bg-[var(--color-surface-secondary)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
          iconColor
        )}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-3.5 w-3.5" })}
        </div>
      </div>
      <p className="text-[22px] font-semibold text-[var(--color-text-primary)] tabular-nums leading-none tracking-tight">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}

/** Action row — icon + label + chevron, optional highlight */
function ActionRow({ href, icon, label, highlight = false }: {
  href: string; icon: React.ReactNode; label: string; highlight?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <div className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 border rounded-xl transition-all duration-200 active:scale-[0.98]",
        highlight
          ? "bg-orange-500/[0.06] border-orange-500/20 hover:bg-orange-500/10"
          : "bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
      )}>
        <div className={cn(
          "h-7 w-7 flex items-center justify-center shrink-0 rounded-lg border",
          highlight
            ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
            : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]"
        )}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-3.5 w-3.5" })}
        </div>
        <span className={cn(
          "text-[11px] font-semibold flex-1 truncate uppercase tracking-widest",
          highlight ? "text-orange-500" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"
        )}>
          {label}
        </span>
        <ChevronRight className={cn(
          "h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5",
          highlight ? "text-orange-400" : "text-[var(--color-text-muted)]"
        )} />
      </div>
    </Link>
  );
}

/** Section header — icon + title + optional "View All" link */
function SectionHeader({ title, icon, actionHref, actionLabel = "View all" }: {
  title: string; icon: React.ReactNode; actionHref?: string; actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg text-orange-500">
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-3.5 w-3.5" })}
        </div>
        <h2 className="text-[11px] font-semibold text-[var(--color-text-primary)] uppercase tracking-widest">
          {title}
        </h2>
      </div>
      {actionHref && (
        <Link href={actionHref} className="text-[10px] font-semibold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-widest">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, formatMoney }: {
  active?: boolean; payload?: { value: number }[]; label?: string; formatMoney: (v: number, c: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-[var(--shadow-md)] text-[12px] font-semibold text-[var(--color-text-primary)]">
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">{label}</p>
      {formatMoney(payload[0].value, "USD")}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { formatMoney } = useCurrency();
  const { activeRoles, fetchRoles } = useUserStore();
  const [profile, setProfile] = useState<{ full_name?: string | null } | null>(null);
  const [stats, setStats] = useState<DashStats>({
    orders: 0, wishlist: 0, affiliateEarnings: 0, affiliateLinks: 0,
    vendorRevenue: 0, vendorOrders: 0, vendorProducts: 0,
    activeMissions: 0, totalSubmissionsReceived: 0,
    missionsJoined: 0, mySubmissions: 0,
    communitiesJoined: 0, communitiesCreated: 0,
  });
  const [walletBalance, setWalletBalance] = useState({ available: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Hello");
  const [balanceHidden, setBalanceHidden] = useState(false);

  // Chart: 7-day earnings shape derived from stats
  const chartData = useMemo(() => {
    const total = stats.vendorRevenue + stats.affiliateEarnings;
    const base = total || 450;
    return [
      { name: "Mon", v: base * 0.12 },
      { name: "Tue", v: base * 0.18 },
      { name: "Wed", v: base * 0.14 },
      { name: "Thu", v: base * 0.28 },
      { name: "Fri", v: base * 0.22 },
      { name: "Sat", v: base * 0.38 },
      { name: "Sun", v: base * 0.45 },
    ];
  }, [stats.vendorRevenue, stats.affiliateEarnings]);

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profileRes = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
      if (profileRes.data) setProfile(profileRes.data);
      await fetchRoles();

      const [ordersRes, wishlistRes, affiliateRes, walletRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
        supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("affiliates").select("total_earnings").eq("user_id", user.id).maybeSingle(),
        supabase.from("wallets").select("available_balance, pending_balance").eq("user_id", user.id).maybeSingle(),
      ]);
      if (walletRes.data) setWalletBalance({
        available: Number(walletRes.data.available_balance || 0),
        pending: Number(walletRes.data.pending_balance || 0),
      });

      let vendorRevenue = 0, vendorOrders = 0, vendorProducts = 0;
      let activeMissions = 0, totalSubmissionsReceived = 0, missionsJoined = 0, mySubmissions = 0;

      if (activeRoles.includes("vendor")) {
        const { data: userVendors } = await supabase.from("vendors").select("id").eq("user_id", user.id);
        if (userVendors?.length) {
          const vendorIds = userVendors.map(v => v.id);
          const [pCount, oItems, missions, subs] = await Promise.all([
            supabase.from("products").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds).eq("is_active", true),
            supabase.from("order_items").select("total_price").in("vendor_id", vendorIds),
            supabase.from("ugc_campaigns").select("id", { count: "exact", head: true }).in("brand_id", vendorIds).eq("status", "active"),
            supabase.from("ugc_submissions").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
          ]);
          vendorProducts = pCount.count ?? 0;
          vendorOrders = oItems.data?.length ?? 0;
          vendorRevenue = oItems.data?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;
          activeMissions = missions.count ?? 0;
          totalSubmissionsReceived = subs.count ?? 0;
        }
      }

      if (activeRoles.includes("influencer")) {
        const [joined, sent] = await Promise.all([
          supabase.from("ugc_campaign_participants").select("id", { count: "exact", head: true }).eq("influencer_id", user.id),
          supabase.from("ugc_submissions").select("id", { count: "exact", head: true }).eq("influencer_id", user.id),
        ]);
        missionsJoined = joined.count ?? 0;
        mySubmissions = sent.count ?? 0;
      }

      const [commJoined, commCreated, affLinks] = await Promise.all([
        supabase.from("community_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("communities").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("affiliate_links").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setStats({
        orders: ordersRes.count ?? 0,
        wishlist: wishlistRes.count ?? 0,
        affiliateEarnings: Number(affiliateRes.data?.total_earnings ?? 0),
        affiliateLinks: affLinks.count ?? 0,
        vendorRevenue, vendorOrders, vendorProducts,
        activeMissions, totalSubmissionsReceived,
        missionsJoined, mySubmissions,
        communitiesJoined: commJoined.count ?? 0,
        communitiesCreated: commCreated.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, [fetchRoles, activeRoles.length]); // eslint-disable-line

  const firstName = (profile?.full_name as string)?.split(" ")[0] ?? "User";

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500 bg-[var(--color-bg)]">
        <div className="relative w-16 h-16 bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center rounded-2xl shadow-sm">
          <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin m-2 rounded-full" />
          <LayoutDashboard className="h-6 w-6 text-[var(--color-text-primary)]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[12px] font-semibold text-[var(--color-text-primary)] uppercase tracking-widest">Loading console</p>
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">Establishing parameters…</p>
        </div>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Greeting */}
        <div className="pb-5 border-b border-[var(--color-border)]">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {greeting}, <span className="text-orange-500">{firstName}</span>
          </h1>
          <p className="mt-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
            Command center overview
          </p>
        </div>

        {/* ── Wallet card ── */}
        <Link href="/dashboard/wallet" className="block group outline-none">
          <div className={cn(
            "relative overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]",
            "rounded-2xl p-6 sm:p-8 transition-all duration-300 active:scale-[0.99]",
            "hover:border-orange-500/30 shadow-sm",
          )}>
            {/* Subtle ambient — purely decorative, adapts fine in both modes */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-orange-500/[0.07] rounded-full blur-[60px] group-hover:bg-orange-500/[0.12] transition-all duration-700" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                    <Wallet className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">My portfolio</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Jimvio Wallet</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBalanceHidden(v => !v); }}
                  aria-label={balanceHidden ? "Show balance" : "Hide balance"}
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center border transition-all",
                    "bg-[var(--color-surface-secondary)] border-[var(--color-border)]",
                    "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                  )}
                >
                  {balanceHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Balances */}
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-widest mb-2">Available to spend</p>
                  <p className="text-4xl sm:text-5xl font-semibold text-[var(--color-text-primary)] tabular-nums tracking-tight leading-none">
                    {balanceHidden ? "••••••" : formatMoney(walletBalance.available, "USD")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 pb-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-full">
                    <span className="h-1.5 w-1.5 bg-orange-500 animate-pulse rounded-full" />
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                      {balanceHidden ? "••••" : formatMoney(walletBalance.pending, "USD")} pending
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-orange-500 transition-colors">
                    Manage wallet <ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { href: "/dashboard/wallet", icon: <Wallet />, label: "Add Funds", accent: true },
            { href: "/dashboard/messages", icon: <MessageSquare />, label: "Messages", accent: false },
            { href: "/dashboard/settings", icon: <Settings />, label: "Settings", accent: false },
            { href: "/support", icon: <MessageCircleQuestion />, label: "Help", danger: true },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl border",
                "bg-[var(--color-surface)] border-[var(--color-border)]",
                "hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)]",
                "transition-all active:scale-95 group text-center shadow-sm",
              )}
            >
              {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, {
                className: cn(
                  "h-5 w-5 sm:h-[18px] sm:w-[18px]",
                  item.accent ? "text-orange-500" : item.danger ? "text-rose-500" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]"
                ),
              })}
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Main grid: left (8) + right sidebar (4) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">

          {/* Left column */}
          <div className="lg:col-span-8 space-y-8">

            {/* Earnings chart */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)] tracking-tight">Earnings overview</h3>
                  <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mt-1">
                    {chartData[6].v > chartData[0].v ? "Growing this week" : "Steady activity"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[var(--color-success-light)] border border-[var(--color-success)]/20 px-2.5 py-1.5 rounded-full">
                  <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />
                  <span className="text-[10px] font-semibold text-[var(--color-success)] uppercase tracking-widest">This week</span>
                </div>
              </div>
              <div className="h-[180px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "var(--color-surface-secondary)", radius: 6 }}
                      content={<ChartTooltip formatMoney={formatMoney} />}
                    />
                    <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === todayIndex ? "#f97316" : "var(--color-surface-secondary)"}
                          stroke={i === todayIndex ? "#f97316" : "var(--color-border)"}
                          strokeWidth={0.5}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Role-based sections — 2-col grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Buyer — always visible */}
              <div className="space-y-3.5">
                <SectionHeader title="My shopping" icon={<ShoppingCart />} actionHref="/dashboard/orders" />
                <div className="grid grid-cols-2 gap-2.5">
                  <StatCard value={stats.orders} label="My orders" icon={<Package />} iconColor="text-orange-500" />
                  <StatCard value={stats.wishlist} label="Wishlist" icon={<Heart />} iconColor="text-rose-500" />
                </div>
                <div className="space-y-2">
                  <ActionRow href="/dashboard/orders" icon={<Truck />} label="Track my orders" />
                  <ActionRow href="/" icon={<Globe />} label="Browse products" highlight />
                </div>
              </div>

              {/* Vendor */}
              {activeRoles.includes("vendor") && (
                <div className="space-y-3.5">
                  <SectionHeader title="My store" icon={<Store />} actionHref="/dashboard/vendor/store" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <StatCard value={stats.vendorProducts} label="Products" icon={<Box />} iconColor="text-violet-500" />
                    <StatCard value={formatMoney(stats.vendorRevenue, "USD")} label="Revenue" icon={<DollarSign />} iconColor="text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <ActionRow href="/dashboard/vendor/orders" icon={<Package />} label="Manage orders" />
                    <ActionRow href="/dashboard/products/new" icon={<Plus />} label="Add product" highlight />
                  </div>
                </div>
              )}

              {/* Influencer */}
              {activeRoles.includes("influencer") && (
                <div className="space-y-3.5">
                  <SectionHeader title="Creator hub" icon={<Video />} actionHref="/dashboard/influencer" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <StatCard value={stats.missionsJoined} label="Missions" icon={<Target />} iconColor="text-indigo-500" />
                    <StatCard value={stats.mySubmissions} label="Uploads" icon={<Camera />} iconColor="text-pink-500" />
                  </div>
                  <div className="space-y-2">
                    <ActionRow href="/ugc" icon={<Search />} label="Find missions" highlight />
                    <ActionRow href="/dashboard/influencer/analytics" icon={<Activity />} label="My analytics" />
                  </div>
                </div>
              )}

              {/* Vendor with missions */}
              {activeRoles.includes("vendor") && stats.activeMissions > 0 && (
                <div className="space-y-3.5">
                  <SectionHeader title="My missions" icon={<Zap />} actionHref="/dashboard/vendor/campaigns" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <StatCard value={stats.activeMissions} label="Active" icon={<Radio />} iconColor="text-amber-500" />
                    <StatCard value={stats.totalSubmissionsReceived} label="Submissions" icon={<Camera />} iconColor="text-sky-500" />
                  </div>
                  <div className="space-y-2">
                    <ActionRow href="/dashboard/vendor/campaigns/new" icon={<Plus />} label="New mission" highlight />
                    <ActionRow href="/dashboard/vendor/campaigns" icon={<LayoutGrid />} label="All missions" />
                  </div>
                </div>
              )}

              {/* Affiliate */}
              {activeRoles.includes("affiliate") && (
                <div className="space-y-3.5">
                  <SectionHeader title="Affiliate hub" icon={<Link2 />} actionHref="/dashboard/links" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <StatCard value={formatMoney(stats.affiliateEarnings, "USD")} label="Earnings" icon={<DollarSign />} iconColor="text-emerald-500" />
                    <StatCard value={stats.affiliateLinks} label="Active links" icon={<Link2 />} iconColor="text-sky-500" />
                  </div>
                  <div className="space-y-2">
                    <ActionRow href="/dashboard/links" icon={<Plus />} label="Create link" highlight />
                    <ActionRow href="/dashboard/affiliate/analytics" icon={<TrendingUp />} label="View performance" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-8">

            {/* Communities */}
            <div className="space-y-3.5">
              <SectionHeader title="Communities" icon={<Users2 />} actionHref="/communities" />
              <div className="flex flex-col gap-2.5">
                {[
                  { value: stats.communitiesJoined, label: "Joined", icon: <Globe2 className="h-4 w-4 text-sky-500" /> },
                  { value: stats.communitiesCreated, label: "Created", icon: <Plus className="h-4 w-4 text-orange-500" /> },
                ].map(item => (
                  <div key={item.label} className={cn(
                    "flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)]",
                    "hover:border-[var(--color-border-strong)] transition-colors shadow-sm rounded-2xl"
                  )}>
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-[var(--color-text-primary)] tabular-nums leading-none">{item.value}</p>
                      <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mt-1">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <ActionRow href="/communities" icon={<Users />} label="Explore communities" />
                <ActionRow href="/communities/create" icon={<Plus />} label="Start a community" highlight />
              </div>
            </div>

            {/* Learn & grow CTA */}
            <div className="p-6 rounded-2xl bg-orange-500 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none group-hover:bg-white/15 transition-all duration-500" />
              <div className="relative z-10 space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="bg-black/20 p-1.5 rounded-lg">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-white/90 uppercase tracking-widest">Learn &amp; grow</span>
                </div>
                <h3 className="text-base font-semibold text-white leading-snug tracking-tight">
                  Grow your business with Jimvio
                </h3>
                <p className="text-white/80 text-[12px] leading-relaxed">
                  Guides, tips, and strategies to sell more and reach new customers.
                </p>
                <Button
                  asChild
                  className="w-full bg-black/25 hover:bg-black/35 text-white h-10 rounded-xl font-semibold text-[11px] uppercase tracking-widest transition-all border-none shadow-none"
                >
                  <Link href="/help">Explore guides <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
                </Button>
              </div>
            </div>

            {/* Your roles */}
            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Your roles</span>
                <Link href="/dashboard/roles" className="text-[10px] font-semibold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-widest">
                  Manage
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeRoles.map(role => (
                  <div
                    key={role}
                    className="px-3 py-1.5 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-semibold text-[10px] uppercase tracking-widest capitalize"
                  >
                    {role}
                  </div>
                ))}
              </div>
            </div>

            {/* Help link */}
            <div className="flex items-center justify-center">
              <Link href="/support" className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-orange-500 transition-colors group">
                <MessageSquare className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold uppercase tracking-widest">Need help?</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// "use client";

// import React from "react";
// import Link from "next/link";
// import Image from "next/image";
// import { usePathname } from "next/navigation";
// import {
//   LayoutDashboard, Globe, ShoppingCart, FileText, Heart, Store, Package,
//   Truck, Layers, Link2, Megaphone, DollarSign, Wallet, Video, BarChart3,
//   MessageSquare, Bell, User, Settings, ChevronLeft, ChevronRight, X, Zap,
//   Users, CirclePlus, LayoutGrid, ArrowUpRight, LogOut, Eye, EyeOff,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { motion, AnimatePresence } from "framer-motion";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { SignOutButton } from "@/components/auth/sign-out-button";
// import { CurrencySelector, useCurrency } from "@/context/CurrencyContext";
// import { getUserBalance } from "@/lib/actions/wallet";

// export type DashboardRole = "buyer" | "vendor" | "affiliate" | "influencer" | "admin";

// type NavItem = {
//   label: string;
//   href: string;
//   icon: React.ReactNode;
//   requiredRole?: DashboardRole;
// };
// type NavSection = {
//   title: string;
//   accentRgb?: string; // rgb for the section dot color
//   items: NavItem[];
// };

// const sidebarSections: NavSection[] = [
//   {
//     title: "",
//     items: [
//       { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-[14px] w-[14px]" /> },
//     ],
//   },
//   {
//     title: "Buyer",
//     accentRgb: "56,189,248",
//     items: [
//       { label: "All Items", href: "/marketplace", icon: <LayoutGrid className="h-[14px] w-[14px]" /> },
//       { label: "Digital Assets", href: "/marketplace/digital", icon: <Zap className="h-[14px] w-[14px]" /> },
//       { label: "Physical Goods", href: "/marketplace/physical", icon: <Package className="h-[14px] w-[14px]" /> },
//       { label: "My Orders", href: "/dashboard/orders", icon: <ShoppingCart className="h-[14px] w-[14px]" /> },
//       { label: "Digital Library", href: "/dashboard/library", icon: <Video className="h-[14px] w-[14px]" /> },
//     ],
//   },
//   {
//     title: "Community",
//     accentRgb: "52,211,153",
//     items: [
//       { label: "Browse", href: "/communities", icon: <Users className="h-[14px] w-[14px]" /> },
//       { label: "Create", href: "/communities/create", icon: <CirclePlus className="h-[14px] w-[14px]" /> },
//       { label: "My Spaces", href: "/creator", icon: <LayoutGrid className="h-[14px] w-[14px]" /> },
//       { label: "Analytics", href: "/dashboard/community/analytics", icon: <BarChart3 className="h-[14px] w-[14px]" /> },
//     ],
//   },
//   {
//     title: "Mission Owner",
//     accentRgb: "251,146,60",
//     items: [
//       { label: "Mission Hub", href: "/dashboard/vendor/campaigns", icon: <LayoutDashboard className="h-[14px] w-[14px]" /> },
//       { label: "Submissions", href: "/dashboard/vendor/submissions", icon: <Video className="h-[14px] w-[14px]" /> },
//       { label: "Launch", href: "/dashboard/vendor/campaigns/new", icon: <CirclePlus className="h-[14px] w-[14px]" /> },
//       { label: "Analytics", href: "/dashboard/vendor/campaigns/analytics", icon: <BarChart3 className="h-[14px] w-[14px]" /> },
//     ],
//   },
//   {
//     title: "Vendor Hub",
//     accentRgb: "251,191,36",
//     items: [
//       { label: "My Store", href: "/dashboard/vendor/store", icon: <Store className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
//       { label: "Products", href: "/dashboard/products", icon: <Package className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
//       { label: "Orders", href: "/dashboard/vendor/orders", icon: <Truck className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
//       { label: "Inventory", href: "/dashboard/inventory", icon: <Layers className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
//       { label: "Payouts", href: "/dashboard/payments", icon: <Wallet className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
//     ],
//   },
//   {
//     title: "Creator Hub",
//     accentRgb: "129,140,248",
//     items: [
//       { label: "Explore Missions", href: "/ugc", icon: <Zap className="h-[14px] w-[14px]" /> },
//       { label: "Submissions", href: "/dashboard/submissions", icon: <FileText className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
//       { label: "Studio", href: "/dashboard/influencer", icon: <LayoutDashboard className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
//       { label: "My Clips", href: "/dashboard/influencer/videos", icon: <Video className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
//       { label: "Analytics", href: "/dashboard/influencer/analytics", icon: <BarChart3 className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
//       { label: "Earnings", href: "/dashboard/earnings", icon: <DollarSign className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
//     ],
//   },
//   {
//     title: "Affiliate",
//     accentRgb: "251,113,133",
//     items: [
//       { label: "My Links", href: "/dashboard/links", icon: <Link2 className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
//       { label: "Products", href: "/dashboard/affiliate/products", icon: <Megaphone className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
//       { label: "Earnings", href: "/dashboard/earnings", icon: <DollarSign className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
//       { label: "Analytics", href: "/dashboard/affiliate/analytics", icon: <BarChart3 className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
//       { label: "Payouts", href: "/dashboard/withdrawals", icon: <Wallet className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
//     ],
//   },
//   {
//     title: "General",
//     accentRgb: "148,163,184",
//     items: [
//       { label: "Messages", href: "/dashboard/messages", icon: <MessageSquare className="h-[14px] w-[14px]" /> },
//       { label: "Notifications", href: "/dashboard/notifications", icon: <Bell className="h-[14px] w-[14px]" /> },
//       // { label: "Profile", href: "/dashboard/settings", icon: <User className="h-[14px] w-[14px]" /> },
//       { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-[14px] w-[14px]" /> },
//     ],
//   },
// ];

// function getActivateHref(role: DashboardRole) {
//   return role === "influencer" ? "/dashboard/activate/creator" : `/dashboard/activate/${role}`;
// }

// interface SidebarProps {
//   user: { email: string; full_name?: string | null; avatar_url?: string | null };
//   activeRoles: DashboardRole[];
//   collapsed: boolean;
//   onCollapsedChange: (v: boolean) => void;
//   mobileOpen?: boolean;
//   onMobileClose?: () => void;
// }

// export function Sidebar({ user, activeRoles, collapsed, onCollapsedChange, mobileOpen, onMobileClose }: SidebarProps) {
//   const pathname = usePathname();
//   const { formatMoney } = useCurrency();
//   const [balance, setBalance] = React.useState({ available: 0, pending: 0 });
//   const [balanceHidden, setBalanceHidden] = React.useState(true);

//   React.useEffect(() => {
//     async function fetch() {
//       const res = await getUserBalance();
//       if (res.success) setBalance({ available: res.available, pending: res.pending });
//     }
//     fetch();
//     const t = setInterval(fetch, 120_000);
//     return () => clearInterval(t);
//   }, []);

//   const hasRole = (r: DashboardRole) => activeRoles.includes("admin") || activeRoles.includes(r);
//   const resolveHref = (item: NavItem) => {
//     if (!item.requiredRole || item.requiredRole === "buyer") return item.href;
//     return hasRole(item.requiredRole) ? item.href : getActivateHref(item.requiredRole);
//   };
//   const needsActivation = (item: NavItem) =>
//     !!item.requiredRole && item.requiredRole !== "buyer" && !hasRole(item.requiredRole);

//   const initials = (user.full_name?.[0] || user.email?.[0] || "U").toUpperCase();

//   const content = (
//     <div className="relative flex flex-col h-full z-10">

//       {/* Logo bar — Shopify Admin Style */}
//       <div className="flex items-center justify-between shrink-0 px-4 py-5 bg-[var(--color-surface)] border-b border-border">
//         <Link href="/" onClick={onMobileClose} className="flex items-center gap-0 min-w-0 group">
//           {!collapsed ? (
//             <>
//               <Image
//                 src="/jimvio-logo.png"
//                 alt="Jimvio"
//                 width={32}
//                 height={32}
//                 className="h-7 w-auto mix-blend-multiply dark:mix-blend-normal"
//                 priority
//               />
//               <span className="text-[22px] font-black tracking-[0.05em] select-none truncate">
//                 <span className="text-stone-950 dark:text-white">Jimvio</span>
//               </span>
//             </>
//           ) : (
//             <div className="w-8 h-8 rounded-sm bg-orange-500 flex items-center justify-center text-white font-black text-xs">J</div>
//           )}
//         </Link>

//         <div className="flex items-center gap-1.5">
//           <button
//             type="button"
//             onClick={() => onCollapsedChange(!collapsed)}
//             className="hidden lg:flex items-center justify-center transition-all hover:scale-105 active:scale-95 rounded-sm bg-surface-secondary dark:bg-surface-secondary border border-border text-stone-400 dark:text-text-muted"
//             style={{
//               width: 28, height: 28,
//             }}
//             aria-label={collapsed ? "Expand" : "Collapse"}
//           >
//             {collapsed ? <ChevronRight style={{ width: 12, height: 12 }} /> : <ChevronLeft style={{ width: 12, height: 12 }} />}
//           </button>
//           {onMobileClose && (
//             <button
//               type="button"
//               onClick={onMobileClose}
//               className="lg:hidden flex items-center justify-center transition-all active:scale-95 rounded-sm bg-surface-secondary dark:bg-surface-secondary border border-border text-stone-400  hover:text-stone-800 dark:text-text-secondary dark:hover:text-stone-200"
//               style={{ width: 30, height: 30 }}
//               aria-label="Close"
//             >
//               <X style={{ width: 13, height: 13 }} />
//             </button>
//           )}
//         </div>
//       </div>

//       {/* ── Wallet Card ── */}
//       {!collapsed && (
//         <motion.div
//           initial={{ y: 20, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           transition={{ delay: 0.15 }}
//           className="px-4 pt-4 pb-2"
//         >
//           <div className="relative overflow-hidden rounded-sm bg-[var(--color-bg-dark)] border border-stone-800 p-4 group">
//             <div className="relative z-10">
//               <div className="flex items-center justify-between mb-3">
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-sm bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
//                     <Wallet className="w-3 h-3" />
//                   </div>
//                   <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Available Balance</span>
//                 </div>
//                 <button
//                   onClick={() => setBalanceHidden(!balanceHidden)}
//                   className="text-stone-500 hover:text-white transition-colors"
//                 >
//                   {balanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
//                 </button>
//               </div>

//               <Link href="/dashboard/wallet" onClick={onMobileClose}>
//                 <div className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums tracking-tight">
//                   {balanceHidden ? "••••••" : formatMoney(balance.available, "USD")}
//                 </div>
//                 <div className="flex items-center justify-between mt-2">
//                   <span className="text-[10px] font-medium text-stone-500">
//                     {balanceHidden ? "•••" : formatMoney(balance.pending, "USD")} pending
//                   </span>
//                   <ArrowUpRight className="w-3 h-3 text-stone-500 group-hover:text-orange-400 transition-colors" />
//                 </div>
//               </Link>
//             </div>
//           </div>
//         </motion.div>
//       )}

//       {/* Collapsed wallet icon */}
//       {collapsed && (
//         <div className="px-2 pt-3 pb-1 shrink-0 flex justify-center">
//           <Link
//             href="/dashboard/wallet"
//             title="My Wallet"
//             className="flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 text-orange-600 dark:text-orange-500 rounded-sm h-9 w-9"
//           >
//             <Wallet style={{ width: 14, height: 14 }} />
//           </Link>
//         </div>
//       )}

//       {/* ── Nav ── */}
//       <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2" style={{ scrollbarWidth: "none" }}>
//         <div className={collapsed ? "px-2" : "px-2.5"}>
//           {sidebarSections.map((section) => (
//             <div key={section.title || "main"} className="mb-1">
//               {section.title && !collapsed && (
//                 <div className="flex items-center gap-2 px-2 pt-3 pb-1">
//                   {section.accentRgb && (<span className="block shrink-0 rounded-sm" style={{ width: 5, height: 5, background: `rgb(${section.accentRgb})` }} />)}
//                   <span
//                     style={{
//                       fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
//                       textTransform: "uppercase",
//                     }}
//                     className="text-stone-400 dark:text-text-muted"
//                   >
//                     {section.title}
//                   </span>
//                 </div>
//               )}

//               <ul className="space-y-0.5">
//                 {section.items.map((item, idx) => {
//                   const href = resolveHref(item);
//                   const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
//                   const locked = needsActivation(item);

//                   return (
//                     <motion.li
//                       key={`${section.title}-${item.label}`}
//                       initial={{ x: -5, opacity: 0 }}
//                       animate={{ x: 0, opacity: 1 }}
//                       transition={{ delay: 0.1 + idx * 0.03 }}
//                     >
//                       <Link
//                         href={href}
//                         onClick={onMobileClose}
//                         title={collapsed ? item.label : undefined}
//                         className={cn(
//                           "flex items-center group relative transition-all duration-150",
//                           isActive
//                             ? "bg-[var(--color-surface-secondary)] border border-border shadow-sm"
//                             : "hover:bg-[var(--color-surface-secondary)]/50 border border-transparent"
//                         )}
//                         style={{
//                           gap: collapsed ? 0 : 10,
//                           padding: collapsed ? "8px" : "8px 12px",
//                           borderRadius: 0,
//                           justifyContent: collapsed ? "center" : "flex-start",
//                           opacity: locked ? 0.4 : 1,
//                         }}
//                       >
//                         {/* Hover layer */}
//                         <motion.div
//                           className="absolute inset-0 bg-stone-900/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
//                           initial={false}
//                           whileHover={{ scale: 1.05 }}
//                         />

//                         {/* Active left bar */}
//                         {isActive && (
//                           <span
//                             className="pointer-events-none absolute left-0 inset-y-0 w-0.5 bg-orange-500"
//                           />
//                         )}

//                         {/* Icon */}
//                         <motion.span
//                           whileHover={{ scale: 1.1 }}
//                           className={cn(
//                             "flex items-center justify-center flex-shrink-0 transition-all z-10",
//                             isActive
//                               ? "text-orange-600"
//                               : "text-neutral-400 group-hover:text-neutral-600 dark:text-text-muted dark:group-hover:text-zinc-300"
//                           )}
//                           style={{
//                             width: 24,
//                             height: 24,
//                           }}
//                         >
//                           {item.icon}
//                         </motion.span>

//                         {!collapsed && (
//                           <>
//                             <span
//                               className={cn(
//                                 "flex-1 truncate group-hover:translate-x-0.5 transition-transform z-10 text-[13px] tracking-tight",
//                                 isActive ? "font-bold text-[var(--color-text-primary)]" : "font-semibold text-[var(--color-text-secondary)]"
//                               )}
//                             >
//                               {item.label}
//                             </span>
//                             {locked && (
//                               <span className="text-[9px] font-bold tracking-widest uppercase text-stone-400/40 dark:text-text-muted/40 flex-shrink-0">
//                                 Unlock
//                               </span>
//                             )}
//                           </>
//                         )}
//                       </Link>
//                     </motion.li>
//                   );
//                 })}
//               </ul>
//             </div>
//           ))}
//         </div>
//       </nav>

//       {/* Removed Redundant Sections */}
//     </div>
//   );

//   /* ── Solid shell styles (border-only) ── */
//   const solidShell = (
//     <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-border" />
//   );

//   return (
//     <>
//       {/* Desktop */}
//       <motion.aside
//         initial={false}
//         animate={{ width: collapsed ? "4.5rem" : "15.5rem" }}
//         transition={{ type: "spring", stiffness: 300, damping: 30 }}
//         className="hidden lg:block sticky top-0 h-screen relative z-40 overflow-hidden bg-surface"
//       >
//         {solidShell}
//         {content}
//       </motion.aside>

//       {/* Mobile */}
//       {mobileOpen && (
//         <>
//           <div
//             className="fixed inset-0 z-40 lg:hidden animate-in fade-in duration-200 bg-black/50"
//             onClick={onMobileClose}
//             aria-hidden
//           />
//           <aside
//             className="fixed inset-y-0 left-0 z-50 lg:hidden w-[min(15.5rem,88vw)] animate-in slide-in-from-left duration-250 bg-surface border-r border-border shadow-none"
//           >
//             {content}
//           </aside>
//         </>
//       )}
//     </>
//   );
// }

"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Loader2, ShoppingCart, FileText, Heart, Store, Package,
  Truck, Layers, Link2, Megaphone, DollarSign, Wallet, Video, BarChart3,
  MessageSquare, Bell, Settings, ChevronLeft, ChevronRight, X, Zap,
  Users, CirclePlus, LayoutGrid, ArrowUpRight, Eye, EyeOff, LogOut,
  FolderSymlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrency } from "@/context/CurrencyContext";
import { getUserBalance } from "@/lib/actions/wallet";

import { signOut } from "@/lib/auth/actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";

export type DashboardRole = "buyer" | "vendor" | "affiliate" | "influencer" | "admin";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRole?: DashboardRole;
}

interface NavSection {
  title: string;
  /** hex color for the section accent dot */
  accentColor?: string;
  items: NavItem[];
}

interface SidebarProps {
  user: { email: string; full_name?: string | null; avatar_url?: string | null };
  activeRoles: DashboardRole[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function icon(Icon: React.ElementType) {
  return <Icon className="h-[14px] w-[14px]" />;
}

const SECTIONS: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: icon(LayoutDashboard) },
    ],
  },
  {
    title: "Buyer",
    accentColor: "#38bdf8",
    items: [
      { label: "All items", href: "/marketplace", icon: icon(LayoutGrid) },
      { label: "Digital assets", href: "/marketplace/digital", icon: icon(Zap) },
      { label: "Physical goods", href: "/marketplace/physical", icon: icon(Package) },
      { label: "My orders", href: "/dashboard/orders", icon: icon(ShoppingCart) },
      { label: "Digital library", href: "/dashboard/library", icon: icon(Video) },
    ],
  },
  {
    title: "Community",
    accentColor: "#34d399",
    items: [
      { label: "Browse", href: "/communities", icon: icon(Users) },
      { label: "Create", href: "/communities/create", icon: icon(CirclePlus) },
      { label: "My spaces", href: "/creator", icon: icon(LayoutGrid) },
      { label: "Analytics", href: "/dashboard/community/analytics", icon: icon(BarChart3) },
    ],
  },
  {
    title: "Mission owner",
    accentColor: "#fb923c",
    items: [
      { label: "Mission hub", href: "/dashboard/vendor/campaigns", icon: icon(LayoutDashboard) },
      { label: "Submissions", href: "/dashboard/vendor/submissions", icon: icon(Video) },
      { label: "Launch", href: "/dashboard/vendor/campaigns/new", icon: icon(CirclePlus) },
      { label: "Analytics", href: "/dashboard/vendor/campaigns/analytics", icon: icon(BarChart3) },
    ],
  },
  {
    title: "Vendor hub",
    accentColor: "#fbbf24",
    items: [
      { label: "My store", href: "/dashboard/vendor/store", icon: icon(Store), requiredRole: "vendor" },
      { label: "Products", href: "/dashboard/products", icon: icon(Package), requiredRole: "vendor" },
      { label: "Orders", href: "/dashboard/vendor/orders", icon: icon(Truck), requiredRole: "vendor" },
      { label: "Inventory", href: "/dashboard/inventory", icon: icon(Layers), requiredRole: "vendor" },
      { label: "Payouts", href: "/dashboard/payments", icon: icon(Wallet), requiredRole: "vendor" },
    ],
  },
  {
    title: "Creator hub",
    accentColor: "#818cf8",
    items: [
      { label: "Explore missions", href: "/ugc", icon: icon(Zap) },
      { label: "Submissions", href: "/dashboard/submissions", icon: icon(FileText), requiredRole: "influencer" },
      { label: "Studio", href: "/dashboard/influencer", icon: icon(LayoutDashboard), requiredRole: "influencer" },
      { label: "My clips", href: "/dashboard/influencer/videos", icon: icon(Video), requiredRole: "influencer" },
      { label: "Analytics", href: "/dashboard/influencer/analytics", icon: icon(BarChart3), requiredRole: "influencer" },
      { label: "Earnings", href: "/dashboard/earnings", icon: icon(DollarSign), requiredRole: "influencer" },
    ],
  },
  {
    title: "Affiliate",
    accentColor: "#fb7185",
    items: [
      { label: "My links", href: "/dashboard/links", icon: icon(FolderSymlink), requiredRole: "affiliate" },
      { label: "Products", href: "/dashboard/affiliate/products", icon: icon(Megaphone), requiredRole: "affiliate" },
      { label: "Earnings", href: "/dashboard/earnings", icon: icon(DollarSign), requiredRole: "affiliate" },
      { label: "Analytics", href: "/dashboard/affiliate/analytics", icon: icon(BarChart3), requiredRole: "affiliate" },
      { label: "Payouts", href: "/dashboard/withdrawals", icon: icon(Wallet), requiredRole: "affiliate" },
    ],
  },
  {
    title: "General",
    accentColor: "#94a3b8",
    items: [
      { label: "Messages", href: "/dashboard/messages", icon: icon(MessageSquare) },
      { label: "Notifications", href: "/dashboard/notifications", icon: icon(Bell) },
      { label: "Settings", href: "/dashboard/settings", icon: icon(Settings) },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activateHref(role: DashboardRole): string {
  return role === "influencer"
    ? "/dashboard/activate/creator"
    : `/dashboard/activate/${role}`;
}

export function Sidebar({
  user,
  activeRoles,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { formatMoney } = useCurrency();
  const [balance, setBalance] = React.useState({ available: 0, pending: 0 });
  const [balanceHidden, setBalanceHidden] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const res = await getUserBalance();
      if (res.success) setBalance({ available: res.available, pending: res.pending });
    }
    load();
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, []);

  const hasRole = (r: DashboardRole) =>
    activeRoles.includes("admin") || activeRoles.includes(r);

  function resolveHref(item: NavItem): string {
    if (!item.requiredRole || item.requiredRole === "buyer") return item.href;
    return hasRole(item.requiredRole) ? item.href : activateHref(item.requiredRole);
  }

  function isLocked(item: NavItem): boolean {
    return !!item.requiredRole && item.requiredRole !== "buyer" && !hasRole(item.requiredRole);
  }

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const initials = (user.full_name?.[0] || user.email?.[0] || "U").toUpperCase();

  // ── Sidebar content ──────────────────────────────────────────────────────────

  const SidebarContent = (
    <div className="flex flex-col h-full">

      {/* Logo bar */}
      <div className={cn(
        "flex items-center shrink-0 border-b border-[var(--color-border)]",
        collapsed ? "justify-center px-3 py-4" : "justify-between px-4 py-3.5"
      )}>
        {collapsed ? (
          <button
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-semibold text-sm"
          >
            J
          </button>
        ) : (
          <Link href="/" onClick={onMobileClose} className="flex items-center gap-1 min-w-0">
            <Image
              src="/jimvio-logo.png"
              alt="Jimvio"
              width={28}
              height={28}
              className="h-7 w-auto mix-blend-multiply dark:mix-blend-normal flex-shrink-0"
              priority
            />
            <span className="text-[19px] font-semibold tracking-tight text-[var(--color-text-primary)] select-none truncate">
              Jim<span className="text-orange-500">vio</span>
            </span>
          </Link>
        )}

        {!collapsed && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onCollapsedChange(true)}
              aria-label="Collapse sidebar"
              className={cn(
                "hidden lg:flex items-center justify-center w-6 h-6 rounded-md",
                "border border-[var(--color-border)] text-[var(--color-text-muted)]",
                "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                "transition-colors"
              )}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            {onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close sidebar"
                className={cn(
                  "lg:hidden flex items-center justify-center w-6 h-6 rounded-md",
                  "border border-[var(--color-border)] text-[var(--color-text-muted)]",
                  "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                  "transition-colors"
                )}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Wallet */}
      {collapsed ? (
        <div className="px-2 pt-3 pb-1 flex justify-center flex-shrink-0">
          <Link
            href="/dashboard/wallet"
            title="My wallet"
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl",
              "bg-orange-500/10 border border-orange-500/20 text-orange-500",
              "hover:bg-orange-500/20 transition-colors"
            )}
          >
            <Wallet className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <Link
            href="/dashboard/wallet"
            onClick={onMobileClose}
            className={cn(
              "block p-3 rounded-lg group",
              "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]",
              "hover:border-[var(--color-border-strong)] transition-colors"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
                <Wallet className="h-3 w-3 text-orange-500" />
                Balance
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBalanceHidden((v) => !v); }}
                  aria-label={balanceHidden ? "Show balance" : "Hide balance"}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {balanceHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            </div>
            <p className="text-[17px] font-semibold text-[var(--color-text-primary)] tabular-nums leading-none mb-1">
              {balanceHidden ? "••••••" : formatMoney(balance.available, "USD")}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {balanceHidden ? "•••" : formatMoney(balance.pending, "USD")} pending
              </span>
              <ArrowUpRight className="h-3 w-3 text-[var(--color-text-muted)] group-hover:text-orange-500 transition-colors" />
            </div>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto py-2"
        style={{ scrollbarWidth: "none" }}
        aria-label="Dashboard navigation"
      >
        <div className={collapsed ? "px-2" : "px-2.5"}>
          {SECTIONS.map((section) => (
            <div key={section.title || "__main"} className="mb-1">

              {/* Section heading */}
              {section.title && !collapsed && (
                <div className="flex items-center gap-2 px-2 pt-3 pb-1.5">
                  {section.accentColor && (
                    <span
                      className="block w-[5px] h-[5px] rounded-full flex-shrink-0"
                      style={{ background: section.accentColor }}
                    />
                  )}
                  <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
                    {section.title}
                  </span>
                </div>
              )}

              <ul className="space-y-px">
                {section.items.map((item) => {
                  const href = resolveHref(item);
                  const active = isActive(item.href);
                  const locked = isLocked(item);

                  return (
                    <li key={`${section.title}-${item.label}`}>
                      <Link
                        href={href}
                        onClick={onMobileClose}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex items-center rounded-sm border transition-all duration-150",
                          collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2",
                          active
                            ? "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                            : "border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                          locked && "opacity-40"
                        )}
                      >
                        {/* Active left accent */}
                        {active && (
                          <span className="absolute left-0 inset-y-[10%] w-[3px] rounded-r-full bg-orange-500" />
                        )}

                        {/* Icon */}
                        <span className={cn(
                          "flex-shrink-0 transition-colors",
                          active ? "text-orange-500 font-black" : "text-[var(--color-text-muted)]"
                        )}>
                          {item.icon}
                        </span>

                        {/* Label */}
                        {!collapsed && (
                          <>
                            <span className={cn(
                              "flex-1 truncate text-[13px] leading-none",
                              active ? "font-semibold" : "font-medium"
                            )}>
                              {item.label}
                            </span>
                            {locked && (
                              <span className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest flex-shrink-0">
                                Unlock
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? "4rem" : "15rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col sticky top-0 h-screen z-40 overflow-hidden bg-[var(--color-surface)] border-r border-[var(--color-border)]"
      >
        {SidebarContent}
      </motion.aside>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden bg-black/50"
              onClick={onMobileClose}
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden flex flex-col w-[min(15rem,88vw)] bg-[var(--color-surface)] border-r border-[var(--color-border)]"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}


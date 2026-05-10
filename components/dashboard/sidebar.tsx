// "use client";

// import React, { useTransition } from "react";
// import Link from "next/link";
// import Image from "next/image";
// import { usePathname } from "next/navigation";
// import {
//   LayoutDashboard, Loader2, ShoppingCart, FileText, Heart, Store, Package,
//   Truck, Layers, Link2, Megaphone, DollarSign, Wallet, Video, BarChart3,
//   MessageSquare, Bell, Settings, ChevronLeft, ChevronRight, X, Zap,
//   Users, CirclePlus, LayoutGrid, ArrowUpRight, Eye, EyeOff, LogOut,
//   FolderSymlink,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { motion, AnimatePresence } from "framer-motion";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { useCurrency } from "@/context/CurrencyContext";
// import { getUserBalance } from "@/lib/actions/wallet";

// import { signOut } from "@/lib/auth/actions";
// import { isNextRedirectError } from "@/lib/auth/redirect-error";

// export type DashboardRole = "buyer" | "vendor" | "affiliate" | "influencer" | "admin";

// interface NavItem {
//   label: string;
//   href: string;
//   icon: React.ReactNode;
//   requiredRole?: DashboardRole;
// }

// interface NavSection {
//   title: string;
//   /** hex color for the section accent dot */
//   accentColor?: string;
//   items: NavItem[];
// }

// interface SidebarProps {
//   user: { email: string; full_name?: string | null; avatar_url?: string | null };
//   activeRoles: DashboardRole[];
//   collapsed: boolean;
//   onCollapsedChange: (v: boolean) => void;
//   mobileOpen?: boolean;
//   onMobileClose?: () => void;
// }

// function icon(Icon: React.ElementType) {
//   return <Icon className="h-[14px] w-[14px]" />;
// }

// const SECTIONS: NavSection[] = [
//   {
//     title: "",
//     items: [
//       { label: "Dashboard", href: "/dashboard", icon: icon(LayoutDashboard) },
//     ],
//   },
//   {
//     title: "Buyer",
//     accentColor: "#38bdf8",
//     items: [
//       { label: "All items", href: "/marketplace", icon: icon(LayoutGrid) },
//       { label: "Digital assets", href: "/marketplace/digital", icon: icon(Zap) },
//       { label: "Physical goods", href: "/marketplace/physical", icon: icon(Package) },
//       { label: "My orders", href: "/dashboard/orders", icon: icon(ShoppingCart) },
//       { label: "Digital library", href: "/dashboard/library", icon: icon(Video) },
//     ],
//   },
//   {
//     title: "Community",
//     accentColor: "#34d399",
//     items: [
//       { label: "Browse", href: "/communities", icon: icon(Users) },
//       { label: "Create", href: "/communities/create", icon: icon(CirclePlus) },
//       { label: "My spaces", href: "/creator", icon: icon(LayoutGrid) },
//       { label: "Analytics", href: "/dashboard/community/analytics", icon: icon(BarChart3) },
//     ],
//   },
//   {
//     title: "Mission owner",
//     accentColor: "#fb923c",
//     items: [
//       { label: "Mission hub", href: "/dashboard/vendor/campaigns", icon: icon(LayoutDashboard) },
//       { label: "Submissions", href: "/dashboard/vendor/submissions", icon: icon(Video) },
//       { label: "Launch", href: "/dashboard/vendor/campaigns/new", icon: icon(CirclePlus) },
//       { label: "Analytics", href: "/dashboard/vendor/campaigns/analytics", icon: icon(BarChart3) },
//     ],
//   },
//   {
//     title: "Vendor hub",
//     accentColor: "#fbbf24",
//     items: [
//       { label: "My store", href: "/dashboard/vendor/store", icon: icon(Store), requiredRole: "vendor" },
//       { label: "Products", href: "/dashboard/products", icon: icon(Package), requiredRole: "vendor" },
//       { label: "Orders", href: "/dashboard/vendor/orders", icon: icon(Truck), requiredRole: "vendor" },
//       { label: "Inventory", href: "/dashboard/inventory", icon: icon(Layers), requiredRole: "vendor" },
//       { label: "Payouts", href: "/dashboard/payments", icon: icon(Wallet), requiredRole: "vendor" },
//     ],
//   },
//   {
//     title: "Creator hub",
//     accentColor: "#818cf8",
//     items: [
//       { label: "Explore missions", href: "/ugc", icon: icon(Zap) },
//       { label: "Submissions", href: "/dashboard/submissions", icon: icon(FileText), requiredRole: "influencer" },
//       { label: "Studio", href: "/dashboard/influencer", icon: icon(LayoutDashboard), requiredRole: "influencer" },
//       { label: "My clips", href: "/dashboard/influencer/videos", icon: icon(Video), requiredRole: "influencer" },
//       { label: "Analytics", href: "/dashboard/influencer/analytics", icon: icon(BarChart3), requiredRole: "influencer" },
//       { label: "Earnings", href: "/dashboard/earnings", icon: icon(DollarSign), requiredRole: "influencer" },
//     ],
//   },
//   {
//     title: "Affiliate",
//     accentColor: "#fb7185",
//     items: [
//       { label: "My links", href: "/dashboard/links", icon: icon(FolderSymlink), requiredRole: "affiliate" },
//       { label: "Products", href: "/dashboard/affiliate/products", icon: icon(Megaphone), requiredRole: "affiliate" },
//       { label: "Earnings", href: "/dashboard/earnings", icon: icon(DollarSign), requiredRole: "affiliate" },
//       { label: "Analytics", href: "/dashboard/affiliate/analytics", icon: icon(BarChart3), requiredRole: "affiliate" },
//       { label: "Payouts", href: "/dashboard/withdrawals", icon: icon(Wallet), requiredRole: "affiliate" },
//     ],
//   },
//   {
//     title: "General",
//     accentColor: "#94a3b8",
//     items: [
//       { label: "Messages", href: "/dashboard/messages", icon: icon(MessageSquare) },
//       { label: "Notifications", href: "/dashboard/notifications", icon: icon(Bell) },
//       { label: "Settings", href: "/dashboard/settings", icon: icon(Settings) },
//     ],
//   },
// ];

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function activateHref(role: DashboardRole): string {
//   return role === "influencer"
//     ? "/dashboard/activate/creator"
//     : `/dashboard/activate/${role}`;
// }

// export function Sidebar({
//   user,
//   activeRoles,
//   collapsed,
//   onCollapsedChange,
//   mobileOpen,
//   onMobileClose,
// }: SidebarProps) {
//   const pathname = usePathname();
//   const { formatMoney } = useCurrency();
//   const [balance, setBalance] = React.useState({ available: 0, pending: 0 });
//   const [balanceHidden, setBalanceHidden] = React.useState(true);

//   React.useEffect(() => {
//     async function load() {
//       const res = await getUserBalance();
//       if (res.success) setBalance({ available: res.available, pending: res.pending });
//     }
//     load();
//     const t = setInterval(load, 120_000);
//     return () => clearInterval(t);
//   }, []);

//   const hasRole = (r: DashboardRole) =>
//     activeRoles.includes("admin") || activeRoles.includes(r);

//   function resolveHref(item: NavItem): string {
//     if (!item.requiredRole || item.requiredRole === "buyer") return item.href;
//     return hasRole(item.requiredRole) ? item.href : activateHref(item.requiredRole);
//   }

//   function isLocked(item: NavItem): boolean {
//     return !!item.requiredRole && item.requiredRole !== "buyer" && !hasRole(item.requiredRole);
//   }

//   function isActive(href: string): boolean {
//     if (href === "/dashboard") return pathname === "/dashboard";
//     return pathname === href || pathname.startsWith(`${href}/`);
//   }

//   const initials = (user.full_name?.[0] || user.email?.[0] || "U").toUpperCase();

//   // ── Sidebar content ──────────────────────────────────────────────────────────

//   const SidebarContent = (
//     <div className="flex flex-col h-full">

//       {/* Logo bar */}
//       <div className={cn(
//         "flex items-center shrink-0 border-b border-[var(--color-border)]",
//         collapsed ? "justify-center px-3 py-4" : "justify-between px-4 py-3.5"
//       )}>
//         {collapsed ? (
//           <button
//             onClick={() => onCollapsedChange(false)}
//             aria-label="Expand sidebar"
//             className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-semibold text-sm"
//           >
//             J
//           </button>
//         ) : (
//           <Link href="/" onClick={onMobileClose} className="flex items-center gap-1 min-w-0">
//             <Image
//               src="/jimvio-logo.png"
//               alt="Jimvio"
//               width={28}
//               height={28}
//               className="h-7 w-auto mix-blend-multiply dark:mix-blend-normal flex-shrink-0"
//               priority
//             />
//             <span className="text-[19px] font-semibold tracking-tight text-[var(--color-text-primary)] select-none truncate">
//               Jim<span className="text-orange-600">vio</span>
//             </span>
//           </Link>
//         )}

//         {!collapsed && (
//           <div className="flex items-center gap-1.5 flex-shrink-0">
//             <button
//               type="button"
//               onClick={() => onCollapsedChange(true)}
//               aria-label="Collapse sidebar"
//               className={cn(
//                 "hidden lg:flex items-center justify-center w-6 h-6 rounded-md",
//                 "border border-[var(--color-border)] text-[var(--color-text-muted)]",
//                 "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
//                 "transition-colors"
//               )}
//             >
//               <ChevronLeft className="h-3 w-3" />
//             </button>
//             {onMobileClose && (
//               <button
//                 type="button"
//                 onClick={onMobileClose}
//                 aria-label="Close sidebar"
//                 className={cn(
//                   "lg:hidden flex items-center justify-center w-6 h-6 rounded-md",
//                   "border border-[var(--color-border)] text-[var(--color-text-muted)]",
//                   "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
//                   "transition-colors"
//                 )}
//               >
//                 <X className="h-3 w-3" />
//               </button>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Wallet */}
//       {collapsed ? (
//         <div className="px-2 pt-3 pb-1 flex justify-center flex-shrink-0">
//           <Link
//             href="/dashboard/wallet"
//             title="My wallet"
//             className={cn(
//               "flex items-center justify-center w-9 h-9 rounded-xl",
//               "bg-orange-500/10 border border-orange-500/20 text-orange-500",
//               "hover:bg-orange-500/20 transition-colors"
//             )}
//           >
//             <Wallet className="h-4 w-4" />
//           </Link>
//         </div>
//       ) : (
//         <div className="px-3 pt-3 pb-1 flex-shrink-0">
//           <Link
//             href="/dashboard/wallet"
//             onClick={onMobileClose}
//             className={cn(
//               "block p-3 rounded-lg group",
//               "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]",
//               "hover:border-[var(--color-border-strong)] transition-colors"
//             )}
//           >
//             <div className="flex items-center justify-between mb-2">
//               <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
//                 <Wallet className="h-3 w-3 text-orange-500" />
//                 Balance
//               </div>
//               <div className="flex items-center gap-1">
//                 <button
//                   type="button"
//                   onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBalanceHidden((v) => !v); }}
//                   aria-label={balanceHidden ? "Show balance" : "Hide balance"}
//                   className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
//                 >
//                   {balanceHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
//                 </button>
//               </div>
//             </div>
//             <p className="text-[17px] font-semibold text-[var(--color-text-primary)] tabular-nums leading-none mb-1">
//               {balanceHidden ? "••••••" : formatMoney(balance.available, "USD")}
//             </p>
//             <div className="flex items-center justify-between">
//               <span className="text-[11px] text-[var(--color-text-muted)]">
//                 {balanceHidden ? "•••" : formatMoney(balance.pending, "USD")} pending
//               </span>
//               <ArrowUpRight className="h-3 w-3 text-[var(--color-text-muted)] group-hover:text-orange-500 transition-colors" />
//             </div>
//           </Link>
//         </div>
//       )}

//       {/* Nav */}
//       <nav
//         className="flex-1 overflow-y-auto py-2"
//         style={{ scrollbarWidth: "none" }}
//         aria-label="Dashboard navigation"
//       >
//         <div className={collapsed ? "px-2" : "px-2.5"}>
//           {SECTIONS.map((section) => (
//             <div key={section.title || "__main"} className="mb-1">

//               {/* Section heading */}
//               {section.title && !collapsed && (
//                 <div className="flex items-center gap-2 px-2 pt-3 pb-1.5">
//                   {section.accentColor && (
//                     <span
//                       className="block w-[5px] h-[5px] rounded-full flex-shrink-0"
//                       style={{ background: section.accentColor }}
//                     />
//                   )}
//                   <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
//                     {section.title}
//                   </span>
//                 </div>
//               )}

//               <ul className="space-y-px">
//                 {section.items.map((item) => {
//                   const href = resolveHref(item);
//                   const active = isActive(item.href);
//                   const locked = isLocked(item);

//                   return (
//                     <li key={`${section.title}-${item.label}`}>
//                       <Link
//                         href={href}
//                         onClick={onMobileClose}
//                         title={collapsed ? item.label : undefined}
//                         aria-current={active ? "page" : undefined}
//                         className={cn(
//                           "relative flex items-center rounded-sm border transition-all duration-150",
//                           collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2",
//                           active
//                             ? "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
//                             : "border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
//                           locked && "opacity-40"
//                         )}
//                       >
//                         {/* Active left accent */}
//                         {active && (
//                           <span className="absolute left-0 inset-y-[10%] w-[3px] rounded-r-full bg-orange-500" />
//                         )}

//                         {/* Icon */}
//                         <span className={cn(
//                           "flex-shrink-0 transition-colors",
//                           active ? "text-orange-500 font-black" : "text-[var(--color-text-muted)]"
//                         )}>
//                           {item.icon}
//                         </span>

//                         {/* Label */}
//                         {!collapsed && (
//                           <>
//                             <span className={cn(
//                               "flex-1 truncate text-[13px] leading-none",
//                               active ? "font-semibold" : "font-medium"
//                             )}>
//                               {item.label}
//                             </span>
//                             {locked && (
//                               <span className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest flex-shrink-0">
//                                 Unlock
//                               </span>
//                             )}
//                           </>
//                         )}
//                       </Link>
//                     </li>
//                   );
//                 })}
//               </ul>
//             </div>
//           ))}
//         </div>
//       </nav>
//     </div>
//   );

//   return (
//     <>
//       {/* Desktop */}
//       <motion.aside
//         initial={false}
//         animate={{ width: collapsed ? "4rem" : "15rem" }}
//         transition={{ type: "spring", stiffness: 300, damping: 30 }}
//         className="hidden lg:flex flex-col sticky top-0 h-screen z-40 overflow-hidden bg-[var(--color-surface)] border-r border-[var(--color-border)]"
//       >
//         {SidebarContent}
//       </motion.aside>

//       {/* Mobile */}
//       <AnimatePresence>
//         {mobileOpen && (
//           <>
//             <motion.div
//               key="backdrop"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 0.2 }}
//               className="fixed inset-0 z-40 lg:hidden bg-black/50"
//               onClick={onMobileClose}
//               aria-hidden="true"
//             />
//             <motion.aside
//               key="drawer"
//               initial={{ x: "-100%" }}
//               animate={{ x: 0 }}
//               exit={{ x: "-100%" }}
//               transition={{ type: "spring", stiffness: 300, damping: 30 }}
//               className="fixed inset-y-0 left-0 z-50 lg:hidden flex flex-col w-[min(15rem,88vw)] bg-[var(--color-surface)] border-r border-[var(--color-border)]"
//             >
//               {SidebarContent}
//             </motion.aside>
//           </>
//         )}
//       </AnimatePresence>
//     </>
//   );
// }

// "use client";

// import React from "react";
// import Link from "next/link";
// import Image from "next/image";
// import { usePathname } from "next/navigation";
// import {
//   LayoutDashboard,
//   TrendingUp,
//   Link2,
//   Megaphone,
//   Target,
//   Wallet,
//   Package,
//   Truck,
//   Heart,
//   BookOpen,
//   Globe,
//   Users,
//   MessageSquare,
//   Bell,
//   FileText,
//   Video,
//   BarChart3,
//   Zap,
//   Store,
//   DollarSign,
//   UserCircle,
//   Settings,
//   Shield,
//   HelpCircle,
//   ChevronLeft,
//   ChevronRight,
//   ChevronDown,
//   Eye,
//   EyeOff,
//   ArrowUpRight,
//   X,
//   CirclePlus,
//   LayoutGrid,
//   FolderSymlink,
//   LogOut,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { motion, AnimatePresence } from "framer-motion";
// import { useCurrency } from "@/context/CurrencyContext";
// import { getUserBalance } from "@/lib/actions/wallet";
// import { signOut } from "@/lib/auth/actions";

// // ─── Types ────────────────────────────────────────────────────────────────────

// export type DashboardRole =
//   | "buyer"
//   | "vendor"
//   | "affiliate"
//   | "influencer"
//   | "admin";

// interface NavItem {
//   label: string;
//   href: string;
//   icon: React.ElementType;
//   badge?: string;
//   requiredRole?: DashboardRole;
// }

// interface NavSection {
//   key: string;
//   title: string;
//   items: NavItem[];
// }

// interface SidebarProps {
//   user: {
//     email: string;
//     full_name?: string | null;
//     avatar_url?: string | null;
//   };
//   activeRoles: DashboardRole[];
//   collapsed: boolean;
//   onCollapsedChange: (v: boolean) => void;
//   mobileOpen?: boolean;
//   onMobileClose?: () => void;
// }

// // ─── Nav config ───────────────────────────────────────────────────────────────

// const SECTIONS: NavSection[] = [
//   {
//     key: "earn",
//     title: "Earn",
//     items: [
//       { label: "Earnings", href: "/dashboard/earnings", icon: TrendingUp },
//       { label: "Affiliate links", href: "/dashboard/links", icon: Link2, requiredRole: "affiliate" },
//       { label: "Campaigns", href: "/dashboard/vendor/campaigns", icon: Megaphone, badge: "New" },
//       { label: "Creator missions", href: "/ugc", icon: Target },
//       { label: "Withdrawals", href: "/dashboard/withdrawals", icon: Wallet },
//     ],
//   },
//   {
//     key: "marketplace",
//     title: "Marketplace",
//     items: [
//       { label: "Browse products", href: "/marketplace", icon: Package },
//       { label: "Orders", href: "/dashboard/orders", icon: Truck },
//       { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
//       { label: "Digital library", href: "/dashboard/library", icon: BookOpen },
//     ],
//   },
//   {
//     key: "communities",
//     title: "Communities",
//     items: [
//       { label: "Explore", href: "/communities", icon: Globe },
//       { label: "My communities", href: "/dashboard/communities", icon: Users },
//       { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "3" },
//       { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: "8" },
//     ],
//   },
//   {
//     key: "creator",
//     title: "Creator hub",
//     items: [
//       { label: "Studio", href: "/dashboard/influencer", icon: LayoutDashboard, requiredRole: "influencer" },
//       { label: "My clips", href: "/dashboard/influencer/videos", icon: Video, requiredRole: "influencer" },
//       { label: "Submissions", href: "/dashboard/submissions", icon: FileText, requiredRole: "influencer" },
//       { label: "Analytics", href: "/dashboard/influencer/analytics", icon: BarChart3, requiredRole: "influencer" },
//       { label: "Explore missions", href: "/ugc", icon: Zap },
//     ],
//   },
//   {
//     key: "seller",
//     title: "Seller hub",
//     items: [
//       { label: "My store", href: "/dashboard/vendor/store", icon: Store, requiredRole: "vendor" },
//       { label: "Products", href: "/dashboard/products", icon: Package, requiredRole: "vendor" },
//       { label: "Orders", href: "/dashboard/vendor/orders", icon: Truck, requiredRole: "vendor" },
//       { label: "Revenue", href: "/dashboard/payments", icon: DollarSign, requiredRole: "vendor" },
//       { label: "Customers", href: "/dashboard/customers", icon: Users, requiredRole: "vendor" },
//     ],
//   },
//   {
//     key: "affiliate",
//     title: "Affiliate",
//     items: [
//       { label: "My links", href: "/dashboard/links", icon: FolderSymlink, requiredRole: "affiliate" },
//       { label: "Products", href: "/dashboard/affiliate/products", icon: Megaphone, requiredRole: "affiliate" },
//       { label: "Earnings", href: "/dashboard/earnings", icon: DollarSign, requiredRole: "affiliate" },
//       { label: "Analytics", href: "/dashboard/affiliate/analytics", icon: BarChart3, requiredRole: "affiliate" },
//     ],
//   },
//   {
//     key: "account",
//     title: "Account",
//     items: [
//       { label: "Settings", href: "/dashboard/settings", icon: Settings },
//       { label: "Security", href: "/dashboard/security", icon: Shield },
//       { label: "Help center", href: "/support", icon: HelpCircle },
//     ],
//   },
// ];

// // ─── Small helpers ────────────────────────────────────────────────────────────

// function activateHref(role: DashboardRole): string {
//   return role === "influencer"
//     ? "/dashboard/activate/creator"
//     : `/dashboard/activate/${role}`;
// }

// function BadgePill({ label }: { label: string }) {
//   const isNumeric = /^\d+$/.test(label);
//   return (
//     <span
//       className={cn(
//         "ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none",
//         isNumeric
//           ? "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
//           : "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
//       )}
//     >
//       {label}
//     </span>
//   );
// }

// // ─── Sidebar inner content ────────────────────────────────────────────────────

// function SidebarContent({
//   user,
//   activeRoles,
//   collapsed,
//   onCollapsedChange,
//   onMobileClose,
// }: Omit<SidebarProps, "mobileOpen">) {
//   const pathname = usePathname();
//   const { formatMoney } = useCurrency();
//   const [balance, setBalance] = React.useState({ available: 0, pending: 0 });
//   const [balanceHidden, setBalanceHidden] = React.useState(true);
//   const [openSections, setOpenSections] = React.useState<Set<string>>(
//     new Set(["earn", "marketplace", "communities"])
//   );

//   // Load wallet balance
//   React.useEffect(() => {
//     async function load() {
//       const res = await getUserBalance();
//       if (res.success)
//         setBalance({ available: res.available, pending: res.pending });
//     }
//     load();
//     const t = setInterval(load, 120_000);
//     return () => clearInterval(t);
//   }, []);

//   function toggleSection(key: string) {
//     setOpenSections((prev) => {
//       const next = new Set(prev);
//       next.has(key) ? next.delete(key) : next.add(key);
//       return next;
//     });
//   }

//   function hasRole(r: DashboardRole) {
//     return activeRoles.includes("admin") || activeRoles.includes(r);
//   }

//   function resolveHref(item: NavItem): string {
//     if (!item.requiredRole || item.requiredRole === "buyer") return item.href;
//     return hasRole(item.requiredRole) ? item.href : activateHref(item.requiredRole);
//   }

//   function isLocked(item: NavItem): boolean {
//     return (
//       !!item.requiredRole &&
//       item.requiredRole !== "buyer" &&
//       !hasRole(item.requiredRole)
//     );
//   }

//   function isActive(href: string): boolean {
//     if (href === "/dashboard") return pathname === "/dashboard";
//     return pathname === href || pathname.startsWith(`${href}/`);
//   }

//   const initials = (
//     user.full_name?.[0] ||
//     user.email?.[0] ||
//     "U"
//   ).toUpperCase();

//   // ── Collapsed icon-only rail ───────────────────────────────────────────────
//   if (collapsed) {
//     const flatItems: NavItem[] = [
//       { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
//       ...SECTIONS.flatMap((s) => s.items),
//     ];

//     // Dedupe by href and show a curated collapsed set
//     const collapsedItems: NavItem[] = [
//       { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
//       { label: "Earnings", href: "/dashboard/earnings", icon: TrendingUp },
//       { label: "Affiliate links", href: "/dashboard/links", icon: Link2 },
//       { label: "Campaigns", href: "/dashboard/vendor/campaigns", icon: Megaphone, badge: "New" },
//       { label: "Browse products", href: "/marketplace", icon: Package },
//       { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "3" },
//       { label: "Settings", href: "/dashboard/settings", icon: Settings },
//     ];

//     return (
//       <div className="flex flex-col h-full">
//         {/* Logo */}
//         <div className="flex justify-center items-center h-14 border-b border-stone-100 dark:border-stone-800">
//           <button
//             onClick={() => onCollapsedChange(false)}
//             aria-label="Expand sidebar"
//             className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-semibold text-sm hover:bg-orange-600 transition-colors"
//           >
//             J
//           </button>
//         </div>

//         {/* Wallet icon */}
//         <div className="flex justify-center py-3 border-b border-stone-100 dark:border-stone-800">
//           <Link
//             href="/dashboard/wallet"
//             title="My wallet"
//             className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 flex items-center justify-center text-orange-500 hover:bg-orange-100 transition-colors"
//           >
//             <Wallet className="h-4 w-4" />
//           </Link>
//         </div>

//         {/* Nav icons */}
//         <nav className="flex-1 flex flex-col items-center gap-1 py-3 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
//           {collapsedItems.map((item) => {
//             const active = isActive(item.href);
//             const Icon = item.icon;
//             return (
//               <Link
//                 key={item.href}
//                 href={resolveHref(item)}
//                 title={item.label}
//                 className={cn(
//                   "relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
//                   active
//                     ? "bg-orange-50 dark:bg-orange-900/20 text-orange-500"
//                     : "text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300"
//                 )}
//               >
//                 <Icon className="h-4 w-4" />
//                 {item.badge && (
//                   <span className={cn(
//                     "absolute top-0.5 right-0.5 flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-stone-900",
//                     /^\d+$/.test(item.badge)
//                       ? "w-4 h-4 text-[8px] bg-orange-500 text-white"
//                       : "w-2 h-2 bg-orange-500"
//                   )}>
//                     {/^\d+$/.test(item.badge) ? item.badge : ""}
//                   </span>
//                 )}
//               </Link>
//             );
//           })}
//         </nav>

//         {/* Expand button */}
//         <div className="flex justify-center py-3 border-t border-stone-100 dark:border-stone-800">
//           <button
//             onClick={() => onCollapsedChange(false)}
//             aria-label="Expand sidebar"
//             className="w-7 h-7 rounded-md border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
//           >
//             <ChevronRight className="h-3 w-3" />
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ── Expanded sidebar ───────────────────────────────────────────────────────
//   return (
//     <div className="flex flex-col bg-bg h-full">

//       {/* Logo bar */}
//       <div className="flex items-center justify-between px-4 h-14 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
//         <Link href="/" onClick={onMobileClose} className="flex items-center gap-2 min-w-0">
//           <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
//             J
//           </div>
//           <span className="text-[17px] font-semibold tracking-tight text-stone-900 dark:text-white truncate">
//             Jim<span className="text-orange-500">vio</span>
//           </span>
//         </Link>
//         <div className="flex items-center gap-1 flex-shrink-0">
//           <button
//             type="button"
//             onClick={() => onCollapsedChange(true)}
//             aria-label="Collapse sidebar"
//             className="hidden lg:flex w-6 h-6 rounded-md border border-stone-200 dark:border-stone-700 items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
//           >
//             <ChevronLeft className="h-3 w-3" />
//           </button>
//           {onMobileClose && (
//             <button
//               type="button"
//               onClick={onMobileClose}
//               aria-label="Close sidebar"
//               className="lg:hidden w-6 h-6 rounded-md border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
//             >
//               <X className="h-3 w-3" />
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Wallet widget */}
//       <div className="px-3 pt-3 pb-2 flex-shrink-0">
//         <Link
//           href="/dashboard/wallet"
//           onClick={onMobileClose}
//           className="block p-3 rounded-md bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition-colors group"
//         >
//           <div className="flex items-center justify-between mb-2">
//             <div className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
//               <Wallet className="h-3 w-3 text-orange-500" />
//               Balance
//             </div>
//             <button
//               type="button"
//               onClick={(e) => {
//                 e.preventDefault();
//                 e.stopPropagation();
//                 setBalanceHidden((v) => !v);
//               }}
//               aria-label={balanceHidden ? "Show balance" : "Hide balance"}
//               className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
//             >
//               {balanceHidden
//                 ? <EyeOff className="h-3 w-3" />
//                 : <Eye className="h-3 w-3" />}
//             </button>
//           </div>
//           <p className="text-[17px] font-semibold text-stone-900 dark:text-white tabular-nums leading-none mb-1.5">
//             {balanceHidden ? "••••••" : formatMoney(balance.available, "USD")}
//           </p>
//           <div className="flex items-center justify-between">
//             <span className="text-[11px] text-stone-400 dark:text-stone-500">
//               {balanceHidden ? "•••" : formatMoney(balance.pending, "USD")} pending
//             </span>
//             <ArrowUpRight className="h-3 w-3 text-stone-400 group-hover:text-orange-500 transition-colors" />
//           </div>
//         </Link>
//       </div>

//       {/* Navigation */}
//       <nav
//         className="flex-1 overflow-y-auto px-2.5 py-1"
//         style={{ scrollbarWidth: "none" }}
//         aria-label="Dashboard navigation"
//       >
//         {/* Dashboard (standalone) */}

//         <Link
//           href="/dashboard"
//           onClick={onMobileClose}
//           className={cn(
//             "relative flex items-center gap-2.5 px-2.5 py-2 rounded-sm mb-1 transition-colors text-[13px] font-medium",
//             isActive("/dashboard")
//               ? "bg-orange-50 font-semibold dark:bg-stone-800 text-orange-500"
//               : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white"
//           )}
//         >
//           {isActive("/dashboard") && (
//             <span className="absolute left-0 inset-y-[20%] w-[3px] rounded-r-full bg-orange-500" />
//           )}
//           <LayoutDashboard className={cn("h-3.5 w-3.5 flex-shrink-0", isActive("/dashboard") ? "text-orange-500" : "text-stone-400")} />
//           Dashboard
//         </Link>
//         <div className="border-stone-100 dark:border-stone-800 border-b mb-1" />

//         {SECTIONS.map((section) => {
//           const isOpen = openSections.has(section.key);
//           return (
//             <>
//               <div key={section.key} className="mb-0.5">
//                 {/* Section header */}
//                 <button
//                   type="button"
//                   onClick={() => toggleSection(section.key)}
//                   className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-semibold uppercase  text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
//                 >
//                   <span
//                     className="w-[5px] h-[5px] rounded-full flex-shrink-0" />
//                   <span className="flex-1 text-left -ml-2">{section.title}</span>
//                   {isOpen
//                     ? <ChevronDown className="h-3 w-3" />
//                     : <ChevronRight className="h-3 w-3" />}
//                 </button>

//                 {/* Section items */}
//                 <AnimatePresence initial={false}>
//                   {isOpen && (
//                     <motion.div
//                       key="items"
//                       initial={{ height: 0, opacity: 0 }}
//                       animate={{ height: "auto", opacity: 1 }}
//                       exit={{ height: 0, opacity: 0 }}
//                       transition={{ duration: 0.18, ease: "easeInOut" }}
//                       className="overflow-hidden"
//                     >
//                       <ul className="space-y-px mt-0.5">
//                         {section.items.map((item) => {
//                           const href = resolveHref(item);
//                           const active = isActive(item.href);
//                           const locked = isLocked(item);
//                           const Icon = item.icon;
//                           return (
//                             <li key={`${section.key}-${item.label}`}>
//                               <Link
//                                 href={href}
//                                 onClick={onMobileClose}
//                                 aria-current={active ? "page" : undefined}
//                                 className={cn(
//                                   "relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-[13px]",
//                                   active
//                                     ? "bg-stone-100 dark:bg-stone-800 text-orange-500 font-semibold"
//                                     : "text-stone-600 dark:text-stone-400 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white",
//                                   locked && "opacity-40"
//                                 )}
//                               >
//                                 {active && (
//                                   <span className="absolute left-0 inset-y-[20%] w-[3px] rounded-r-full bg-orange-500" />
//                                 )}
//                                 <Icon
//                                   className={cn(
//                                     "h-3.5 w-3.5 flex-shrink-0",
//                                     active ? "text-orange-500" : "text-stone-400 dark:text-stone-500"
//                                   )} />
//                                 <span className="flex-1 truncate">{item.label}</span>
//                                 {item.badge && !locked && (
//                                   <BadgePill label={item.badge} />
//                                 )}
//                                 {locked && (
//                                   <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">
//                                     Unlock
//                                   </span>
//                                 )}
//                               </Link>
//                             </li>
//                           );
//                         })}
//                       </ul>
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </div>
//               {
//                 isOpen && (
//                   <div className="border-stone-100 dark:border-stone-800 border-b mb-1" />
//                 )
//               }
//             </>
//           );
//         })}
//       </nav>

//       {/* Streak footer */}
//       <div className="px-3 pb-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex-shrink-0">
//         <div className="flex items-center gap-2.5 bg-orange-50 dark:bg-orange-900/20
//          border border-orange-200 dark:border-orange-800/40 rounded-xl px-3 py-2.5">
//           <span className="text-lg leading-none">🔥</span>
//           <div className="min-w-0">
//             <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 leading-tight">
//               4 day streak 🔥
//             </p>
//             <p className="text-[10px] text-orange-400 dark:text-orange-500 leading-tight mt-0.5 truncate">
//               Keep it up! You're doing great.
//             </p>
//           </div>
//           <ChevronRight className="h-3.5 w-3.5 text-orange-400 ml-auto flex-shrink-0" />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Main export ──────────────────────────────────────────────────────────────

// export function Sidebar({
//   user,
//   activeRoles,
//   collapsed,
//   onCollapsedChange,
//   mobileOpen,
//   onMobileClose,
// }: SidebarProps) {
//   const sharedProps = { user, activeRoles, collapsed, onCollapsedChange, onMobileClose };

//   return (
//     <>
//       {/* Desktop sidebar */}
//       <motion.aside
//         initial={false}
//         animate={{ width: collapsed ? "3.5rem" : "14rem" }}
//         transition={{ type: "spring", stiffness: 300, damping: 30 }}
//         className="hidden lg:flex flex-col sticky top-0 h-screen z-40 overflow-hidden bg-white dark:bg-stone-950 border-r border-stone-100 dark:border-stone-800"
//       >
//         <SidebarContent {...sharedProps} />
//       </motion.aside>

//       {/* Mobile drawer */}
//       <AnimatePresence>
//         {mobileOpen && (
//           <>
//             <motion.div
//               key="backdrop"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 0.2 }}
//               className="fixed inset-0 z-40 lg:hidden bg-black/50 backdrop-blur-sm"
//               onClick={onMobileClose}
//               aria-hidden="true"
//             />
//             <motion.aside
//               key="drawer"
//               initial={{ x: "-100%" }}
//               animate={{ x: 0 }}
//               exit={{ x: "-100%" }}
//               transition={{ type: "spring", stiffness: 300, damping: 30 }}
//               className="fixed inset-y-0 left-0 z-50 lg:hidden flex flex-col w-[min(14rem,88vw)] bg-white dark:bg-stone-950 border-r border-stone-100 dark:border-stone-800"
//             >
//               <SidebarContent {...sharedProps} collapsed={false} />
//             </motion.aside>
//           </>
//         )}
//       </AnimatePresence>
//     </>
//   );
// }



"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Link2,
  Megaphone,
  Target,
  Wallet,
  Package,
  Truck,
  Heart,
  BookOpen,
  Globe,
  Users,
  MessageSquare,
  Bell,
  FileText,
  Video,
  BarChart3,
  Zap,
  Store,
  DollarSign,
  Settings,
  Shield,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  ArrowUpRight,
  X,
  FolderSymlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "@/context/CurrencyContext";
import { getUserBalance } from "@/lib/actions/wallet";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardRole =
  | "buyer"
  | "vendor"
  | "affiliate"
  | "influencer"
  | "admin";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  requiredRole?: DashboardRole;
}

interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  user: {
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  activeRoles: DashboardRole[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const SECTIONS: NavSection[] = [
  {
    key: "earn",
    title: "Earn",
    items: [
      { label: "Earnings", href: "/dashboard/earnings", icon: TrendingUp },
      { label: "Affiliate links", href: "/dashboard/links", icon: Link2, requiredRole: "affiliate" },
      { label: "Campaigns", href: "/dashboard/vendor/campaigns", icon: Megaphone, badge: "New" },
      { label: "Creator missions", href: "/ugc", icon: Target },
      { label: "Withdrawals", href: "/dashboard/withdrawals", icon: Wallet },
    ],
  },
  {
    key: "marketplace",
    title: "Marketplace",
    items: [
      { label: "Browse products", href: "/marketplace", icon: Package },
      { label: "Orders", href: "/dashboard/orders", icon: Truck },
      { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
      { label: "Digital library", href: "/dashboard/library", icon: BookOpen },
    ],
  },
  {
    key: "communities",
    title: "Communities",
    items: [
      { label: "Explore", href: "/communities", icon: Globe },
      { label: "My communities", href: "/dashboard/communities", icon: Users },
      { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "3" },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: "8" },
    ],
  },
  {
    key: "creator",
    title: "Creator hub",
    items: [
      { label: "Studio", href: "/dashboard/influencer", icon: LayoutDashboard, requiredRole: "influencer" },
      { label: "My clips", href: "/dashboard/influencer/videos", icon: Video, requiredRole: "influencer" },
      { label: "Submissions", href: "/dashboard/submissions", icon: FileText, requiredRole: "influencer" },
      { label: "Analytics", href: "/dashboard/influencer/analytics", icon: BarChart3, requiredRole: "influencer" },
      { label: "Explore missions", href: "/ugc", icon: Zap },
    ],
  },
  {
    key: "seller",
    title: "Seller hub",
    items: [
      { label: "My store", href: "/dashboard/vendor/store", icon: Store, requiredRole: "vendor" },
      { label: "Products", href: "/dashboard/products", icon: Package, requiredRole: "vendor" },
      { label: "Orders", href: "/dashboard/vendor/orders", icon: Truck, requiredRole: "vendor" },
      { label: "Revenue", href: "/dashboard/payments", icon: DollarSign, requiredRole: "vendor" },
      { label: "Customers", href: "/dashboard/customers", icon: Users, requiredRole: "vendor" },
    ],
  },
  {
    key: "affiliate",
    title: "Affiliate",
    items: [
      { label: "My links", href: "/dashboard/links", icon: FolderSymlink, requiredRole: "affiliate" },
      { label: "Products", href: "/dashboard/affiliate/products", icon: Megaphone, requiredRole: "affiliate" },
      { label: "Earnings", href: "/dashboard/earnings", icon: DollarSign, requiredRole: "affiliate" },
      { label: "Analytics", href: "/dashboard/affiliate/analytics", icon: BarChart3, requiredRole: "affiliate" },
    ],
  },
  {
    key: "account",
    title: "Account",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
      { label: "Security", href: "/dashboard/security", icon: Shield },
      { label: "Help center", href: "/support", icon: HelpCircle },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activateHref(role: DashboardRole): string {
  return role === "influencer"
    ? "/dashboard/activate/creator"
    : `/dashboard/activate/${role}`;
}

function BadgePill({ label }: { label: string }) {
  const isNumeric = /^\d+$/.test(label);
  return (
    <span
      className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
      style={
        isNumeric
          ? {
            backgroundColor: "var(--color-surface-secondary)",
            color: "var(--color-text-muted)",
          }
          : {
            backgroundColor: "var(--color-accent-subtle)",
            color: "var(--color-accent)",
          }
      }
    >
      {label}
    </span>
  );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

function SidebarContent({
  user,
  activeRoles,
  collapsed,
  onCollapsedChange,
  onMobileClose,
}: Omit<SidebarProps, "mobileOpen">) {
  const pathname = usePathname();
  const { formatMoney } = useCurrency();
  const [balance, setBalance] = React.useState({ available: 0, pending: 0 });
  const [balanceHidden, setBalanceHidden] = React.useState(true);
  const [openSections, setOpenSections] = React.useState<Set<string>>(
    new Set(["earn", "marketplace", "communities"])
  );

  React.useEffect(() => {
    async function load() {
      const res = await getUserBalance();
      if (res.success)
        setBalance({ available: res.available, pending: res.pending });
    }
    load();
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, []);

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function hasRole(r: DashboardRole) {
    return activeRoles.includes("admin") || activeRoles.includes(r);
  }

  function resolveHref(item: NavItem): string {
    if (!item.requiredRole || item.requiredRole === "buyer") return item.href;
    return hasRole(item.requiredRole) ? item.href : activateHref(item.requiredRole);
  }

  function isLocked(item: NavItem): boolean {
    return (
      !!item.requiredRole &&
      item.requiredRole !== "buyer" &&
      !hasRole(item.requiredRole)
    );
  }

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // ── Collapsed icon-only rail ───────────────────────────────────────────────
  if (collapsed) {
    const collapsedItems: NavItem[] = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Earnings", href: "/dashboard/earnings", icon: TrendingUp },
      { label: "Affiliate links", href: "/dashboard/links", icon: Link2 },
      { label: "Campaigns", href: "/dashboard/vendor/campaigns", icon: Megaphone, badge: "New" },
      { label: "Browse products", href: "/marketplace", icon: Package },
      { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "3" },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div
          className="flex justify-center items-center h-14 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <button
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className="w-8 h-8 flex items-center justify-center text-white font-semibold text-sm"
            style={{
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-accent)",
            }}
          >
            J
          </button>
        </div>

        {/* Wallet icon */}
        <div
          className="flex justify-center py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <Link
            href="/dashboard/wallet"
            title="My wallet"
            className="w-9 h-9 flex items-center justify-center"
            style={{
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-accent-light)",
              border: "1px solid var(--color-accent-subtle)",
              color: "var(--color-accent)",
            }}
          >
            <Wallet className="h-4 w-4" />
          </Link>
        </div>

        {/* Nav icons */}
        <nav
          className="flex-1 flex flex-col items-center gap-1 py-3 overflow-y-auto no-scrollbar"
        >
          {collapsedItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={resolveHref(item)}
                title={item.label}
                className="relative w-9 h-9 flex items-center justify-center"
                style={{
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: active ? "var(--color-accent-light)" : "transparent",
                  color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                }}
              >
                <Icon className="h-4 w-4" />
                {item.badge && (
                  <span
                    className="absolute top-0.5 right-0.5 flex items-center justify-center rounded-full font-bold"
                    style={{
                      width: /^\d+$/.test(item.badge) ? "1rem" : "0.5rem",
                      height: /^\d+$/.test(item.badge) ? "1rem" : "0.5rem",
                      fontSize: "8px",
                      backgroundColor: "var(--color-accent)",
                      color: "white",
                      border: "2px solid var(--color-bg)",
                    }}
                  >
                    {/^\d+$/.test(item.badge) ? item.badge : ""}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Expand button */}
        <div
          className="flex justify-center py-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className="w-7 h-7 flex items-center justify-center"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-muted)",
            }}
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded sidebar ───────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Logo bar */}
      <div
        className="flex items-center justify-between px-4 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Link
          href="/"
          onClick={onMobileClose}
          className="flex items-center gap-2 min-w-0"
        >
          <div
            className="w-7 h-7 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-accent)",
            }}
          >
            J
          </div>
          <span
            className="text-[17px] font-semibold tracking-tight truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            Jim
            <span style={{ color: "var(--color-accent)" }}>vio</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onCollapsedChange(true)}
            aria-label="Collapse sidebar"
            className="hidden lg:flex w-6 h-6 items-center justify-center"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-muted)",
            }}
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close sidebar"
              className="lg:hidden w-6 h-6 flex items-center justify-center"
              style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-strong)",
                color: "var(--color-text-muted)",
              }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Wallet widget */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <Link
          href="/dashboard/wallet"
          onClick={onMobileClose}
          className="block group"
          style={{
            padding: "0.75rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Widget header */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Wallet
                className="h-3 w-3"
                style={{ color: "var(--color-accent)" }}
              />
              Balance
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBalanceHidden((v) => !v);
              }}
              aria-label={balanceHidden ? "Show balance" : "Hide balance"}
              style={{ color: "var(--color-text-muted)" }}
            >
              {balanceHidden
                ? <EyeOff className="h-3 w-3" />
                : <Eye className="h-3 w-3" />}
            </button>
          </div>

          {/* Amount */}
          <p
            className="text-[17px] font-semibold tabular-nums leading-none mb-1.5"
            style={{ color: "var(--color-text-primary)" }}
          >
            {balanceHidden ? "••••••" : formatMoney(balance.available, "USD")}
          </p>

          {/* Pending row */}
          <div className="flex items-center justify-between">
            <span
              className="text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {balanceHidden ? "•••" : formatMoney(balance.pending, "USD")} pending
            </span>
            <ArrowUpRight
              className="h-3 w-3"
              style={{ color: "var(--color-text-muted)" }}
            />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-2.5 py-1 no-scrollbar"
        aria-label="Dashboard navigation"
      >
        {/* Dashboard standalone link */}
        <Link
          href="/dashboard"
          onClick={onMobileClose}
          className="relative flex items-center gap-2.5 px-2.5 py-2 mb-1 text-[13px] font-medium"
          style={{
            borderRadius: "var(--radius-sm)",
            backgroundColor: isActive("/dashboard")
              ? "var(--color-accent-light)"
              : "transparent",
            color: isActive("/dashboard")
              ? "var(--color-accent)"
              : "var(--color-text-secondary)",
            fontWeight: isActive("/dashboard") ? 600 : 500,
          }}
        >
          {isActive("/dashboard") && (
            <span
              className="absolute left-0 inset-y-[20%] w-[3px] rounded-r-full"
              style={{ backgroundColor: "var(--color-accent)" }}
            />
          )}
          <LayoutDashboard
            className="h-3.5 w-3.5 flex-shrink-0"
            style={{
              color: isActive("/dashboard")
                ? "var(--color-accent)"
                : "var(--color-text-muted)",
            }}
          />
          Dashboard
        </Link>

        <div
          className="mb-1"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        />

        {/* Sections */}
        {SECTIONS.map((section) => {
          const isOpen = openSections.has(section.key);
          return (
            <React.Fragment key={section.key}>
              <div className="mb-0.5">
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span className="flex-1 text-left">{section.title}</span>
                  {isOpen
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />}
                </button>

                {/* Section items */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="items"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <ul className="space-y-px mt-0.5">
                        {section.items.map((item) => {
                          const href = resolveHref(item);
                          const active = isActive(item.href);
                          const locked = isLocked(item);
                          const Icon = item.icon;
                          return (
                            <li key={`${section.key}-${item.label}`}>
                              <Link
                                href={href}
                                onClick={onMobileClose}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "relative flex items-center gap-2.5 px-2.5 py-2 text-[13px]",
                                  locked && "opacity-40"
                                )}
                                style={{
                                  borderRadius: "var(--radius-sm)",
                                  backgroundColor: active
                                    ? "var(--color-surface-secondary)"
                                    : "transparent",
                                  color: active
                                    ? "var(--color-accent)"
                                    : "var(--color-text-secondary)",
                                  fontWeight: active ? 600 : 500,
                                }}
                              >
                                {active && (
                                  <span
                                    className="absolute left-0 inset-y-[20%] w-[3px] rounded-r-full"
                                    style={{ backgroundColor: "var(--color-accent)" }}
                                  />
                                )}
                                <Icon
                                  className="h-3.5 w-3.5 flex-shrink-0"
                                  style={{
                                    color: active
                                      ? "var(--color-accent)"
                                      : "var(--color-text-muted)",
                                  }}
                                />
                                <span className="flex-1 truncate">{item.label}</span>
                                {item.badge && !locked && (
                                  <BadgePill label={item.badge} />
                                )}
                                {locked && (
                                  <span
                                    className="text-[9px] font-semibold uppercase tracking-wider"
                                    style={{ color: "var(--color-text-muted)" }}
                                  >
                                    Unlock
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isOpen && (
                <div
                  className="mb-1"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Streak footer */}
      <div
        className="px-3 pb-3 pt-2 flex-shrink-0"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <div
          className="flex items-center gap-2.5 px-3 py-2.5"
          style={{
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--color-accent-light)",
            border: "1px solid var(--color-accent-subtle)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="text-lg leading-none">🔥</span>
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold leading-tight"
              style={{ color: "var(--color-accent)" }}
            >
              4 day streak 🔥
            </p>
            <p
              className="text-[10px] leading-tight mt-0.5 truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              Keep it up! You&apos;re doing great.
            </p>
          </div>
          <ChevronRight
            className="h-3.5 w-3.5 ml-auto flex-shrink-0"
            style={{ color: "var(--color-accent)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Sidebar({
  user,
  activeRoles,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const sharedProps = { user, activeRoles, collapsed, onCollapsedChange, onMobileClose };

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? "3.5rem" : "14rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col sticky top-0 h-screen z-40 overflow-hidden"
        style={{
          backgroundColor: "var(--color-bg)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <SidebarContent {...sharedProps} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={onMobileClose}
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden flex flex-col w-[min(14rem,88vw)]"
              style={{
                backgroundColor: "var(--color-bg)",
                borderRight: "1px solid var(--color-border)",
              }}
            >
              <SidebarContent {...sharedProps} collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
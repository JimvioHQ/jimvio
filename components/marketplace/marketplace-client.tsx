// "use client";

// import React, { useState, useMemo, useCallback } from "react";
// import { useBodyScrollLock, useEscapeClose } from "@/hooks/use-body-scroll-lock";
// import Link from "next/link";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   Search,
//   Package,
//   Zap,
//   ShieldCheck,
//   Sparkles,
//   TrendingUp,
//   Clock,
//   Star,
//   ShoppingBag,
//   X,
//   ChevronRight,
//   MapPin,
//   Tag,
//   Award,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { MarketplaceSearch, marketplaceHref } from "@/components/marketplace/marketplace-search";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { ProductCardClient } from "@/components/marketplace/product-card-client";
// import { ProductCardDigital } from "@/components/marketplace/product-card-digital";
// import { ProductCardPhysical } from "@/components/marketplace/product-card-physical";
// import { FollowButton } from "@/components/marketplace/follow-button";
// import { LocalizedPrice } from "@/components/currency/localized-price";
// import { GlassAmbientGlow } from "@/components/ui/glass";

// import {
//   Shirt, Home, Sofa, HeartPulse,
//   Apple, Trophy, Puzzle, BookOpen, Car, Flower2, Gem, Music,
//   Palette, Plane, PawPrint, Baby, Wrench,
// } from "lucide-react";
// import type { LucideIcon } from "lucide-react";
// /* ─── Types ─── */
// interface Product {
//   id: string;
//   name: string;
//   slug: string;
//   price: number;
//   compare_at_price?: number | null;
//   images?: string[];
//   rating?: number;
//   review_count?: number;
//   is_featured?: boolean;
//   is_digital?: boolean;
//   product_type?: string;
//   affiliate_enabled?: boolean;
//   affiliate_commission_rate?: number | null;
//   vendors?: { id: string; business_name?: string } | null;
//   product_categories?: { id: string; name: string; slug: string } | null;
//   source?: string;
//   currency?: string;
// }

// interface Category {
//   id: string;
//   name: string;
//   slug: string;
// }

// interface MarketplaceClientProps {
//   initialProducts: Product[];
//   categories: Category[];
//   total: number;
//   currentPage: number;
//   limit: number;
//   params: {
//     cat?: string;
//     type?: string;
//     catalog?: string;
//     q?: string;
//     sort?: string;
//     affiliate?: string;
//   };
//   viralClips?: any[];
//   topCreators?: any[];
//   popularStores?: any[];
//   hasShopifyProducts?: boolean;
//   cartProductIds?: string[];
//   followedVendorIds?: string[];
//   marketplaceStats?: {
//     activeVendors: number;
//     activeListings: number;
//     activeVendorsLabel: string;
//     activeListingsLabel: string;
//   };
//   uiVariant?: "all" | "digital" | "physical";
// }

// /* ─── Hero Deal Banner ─── */
// function HeroDealBanner({ params, basePath }: { params: Record<string, string | undefined>, basePath?: string }) {
//   const type = params.type;
//   const isAll = !type;
//   const isDigital = type === "digital";
//   const isPhysical = type === "physical";

//   return (
//     <div className="relative overflow-hidden rounded-sm mx-0 mb-6 shadow-none border border-border">
//       {/* Background with premium dynamic gradient */}
//       <div
//         className={cn(
//           "absolute inset-0 bg-gradient-to-br transition-all duration-700",
//           isDigital
//             ? "from-sky-50 dark:from-sky-950/20 via-white dark:via-[#0a0a0a] to-sky-50 dark:to-sky-900/10"
//             : "from-orange-50 dark:from-orange-950/10 via-surface dark:via-zinc-900 to-orange-50/50 dark:to-orange-900/5"
//         )}
//       />

//       {/* Ambient glowing orbs for depth */}
//       <div className="absolute -top-10 -left-10 w-48 h-48 rounded-sm mix-blend-multiply opacity-50 blur-2xl" style={{ background: "radial-gradient(circle, #fcd34d 0%, transparent 70%)" }} />
//       <div className="absolute top-10 -right-12 w-56 h-56 rounded-sm mix-blend-multiply opacity-40 blur-2xl" style={{ background: "radial-gradient(circle, #fb923c 0%, transparent 70%)" }} />
//       <div className="absolute -bottom-16 left-1/4 w-40 h-40 rounded-sm mix-blend-multiply opacity-30 blur-2xl" style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }} />

//       {/* ── Dynamic Decorative Elements (Real Images) ── */}

//       {/* 1. DIGITAL ITEMS */}
//       {(isAll || isDigital) && (
//         <>
//           <div className={cn(
//             "absolute z-0 flex items-center justify-center filter drop-shadow-none transition-all duration-[2000ms]",
//             isDigital ? "top-4 left-4 sm:left-12 rotate-[-5deg] scale-110" : "top-2 -left-8 sm:left-0 rotate-[-12deg] scale-90 sm:scale-100",
//             "animate-[bounce_6s_infinite]"
//           )}>
//             <div className="relative w-48 h-48 sm:w-80 sm:h-80 overflow-visible flex items-center justify-center">
//               <img src="/digital-cart.png" alt="3D Digital Cart" className="w-full h-full object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)]" />
//             </div>
//           </div>
//         </>
//       )}

//       {/* 2. DELIVERY CAR (Center) */}
//       {isAll && (
//         <div className="absolute z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 sm:opacity-30 blur-[2px] pointer-events-none mix-blend-overlay w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-sm overflow-hidden">
//           <img src="https://images.unsplash.com/photo-1617469165786-8a07f0f6707f?q=80&w=800&auto=format&fit=crop" alt="Delivery Van" className="w-full h-full object-cover rounded-sm filter contrast-125" />
//         </div>
//       )}

//       {/* 3. PHYSICAL ITEMS */}
//       {(isAll || isPhysical) && (
//         <>
//           <div className={cn(
//             "absolute z-0 flex items-center justify-center filter drop-shadow-none transition-all duration-[2000ms]",
//             isPhysical ? "bottom-4 left-4 sm:left-12 rotate-[5deg] scale-110" : "bottom-[-20px] -right-8 sm:-right-4 rotate-[15deg] scale-90 sm:scale-110",
//             "animate-[bounce_5s_infinite_0.5s]"
//           )}>
//             <div className="relative w-48 h-48 sm:w-80 sm:h-80 overflow-visible flex items-center justify-center">
//               <img src="https://png.pngtree.com/png-clipart/20250225/original/pngtree-shopping-cart-filled-with-electronic-gadgets-and-colorful-bags-looks-modern-png-image_20511724.png" alt="3D Shopping Cart" className="w-full h-full object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)] mix-blend-multiply contrast-125" />
//             </div>
//           </div>
//         </>
//       )}

//       <div className="relative z-10 px-4 py-8 sm:py-10 flex flex-col items-center text-center">
//         {/* Title */}
//         <h2 className="text-[26px] sm:text-[32px] font-black text-stone-900 dark:text-white tracking-tight leading-tight mb-1 flex items-center justify-center gap-2">
//           <Star className="h-7 w-7 text-orange-500 fill-orange-500 animate-[spin_4s_linear_infinite]" />
//           Top Deals Today!
//         </h2>

//         {/* Subtitle */}
//         <p className="text-[14px] sm:text-[16px] text-stone-600 dark:text-text-muted font-medium mb-5">
//           Best offers waiting for you!
//         </p>

//         {/* Delivery Badge */}
//         <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-stone-50 dark:bg-stone-900 border border-border shadow-none mb-6">
//           <MapPin className="h-4 w-4 text-emerald-500" />
//           <span className="text-[12px] font-bold text-stone-700 dark:text-stone-300">Worldwide Delivery Available</span>
//         </div>

//         {/* Action Button */}
//         <Link
//           href={marketplaceHref(params, { sort: "trending" }, basePath)}
//           className="group relative inline-flex items-center justify-center overflow-hidden rounded-sm p-4 px-8 font-black text-white shadow-[0_8px_20px_rgba(249,115,22,0.4)] transition-transform hover:scale-105 active:scale-95"
//         >
//           <span className="absolute inset-0 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />
//           <span className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-20 flex" style={{ background: "linear-gradient(to right, transparent, white, transparent)" }} />
//           <span className="relative z-10 text-[15px] tracking-wide">Check Offers</span>
//         </Link>
//       </div>
//     </div>
//   );
// }

// /* ─── Product Type Tabs (Segmented Control) ─── */
// function TypeTabs({ params, basePath }: { params: Record<string, string | undefined>; basePath?: string; }) {
//   const isDigital = params.type === "digital";
//   const isPhysical = params.type === "physical";
//   const isAll = !params.type;

//   const tabs = [
//     { label: "All Items", type: null as string | null },
//     { label: "Digital", type: "digital" },
//     { label: "Physical", type: "physical" },
//   ].filter(tab => {
//     if (!params.type) return true;
//     return tab.type === params.type;
//   });

//   return (
//     <div className="flex justify-center w-full">
//       <div className="flex items-center p-1 rounded-sm w-full md:w-auto overflow-hidden">
//         {tabs.map((tab) => {
//           const isActive = tab.type === null ? isAll : params.type === tab.type;
//           const href = tab.type
//             ? marketplaceHref(params, { type: tab.type, catalog: null }, basePath)
//             : marketplaceHref(params, { type: null, catalog: null }, basePath);

//           return (
//             <Link
//               key={tab.label}
//               href={href}
//               className={cn(
//                 "relative flex-1 md:flex-none shrink-0 flex items-center justify-center px-3 sm:px-6 py-2 rounded-sm text-[13px] sm:text-[14px] font-bold transition-all whitespace-nowrap z-10",
//                 isActive
//                   ? "text-stone-900 dark:text-white"
//                   : "text-stone-500 hover:text-stone-800 dark:text-text-secondary dark:hover:text-stone-300 hover:bg-surface/50"
//               )}
//             >
//               {isActive && (
//                 <motion.div
//                   layoutId="activeTabIndicator"
//                   className={cn(
//                     "absolute inset-0 rounded-sm shadow-none border",
//                     tab.type === "digital" ? "bg-sky-500/10 border-sky-500/20 shadow-sky-500/5" :
//                       tab.type === "physical" ? "bg-orange-500/10 border-orange-500/20 shadow-orange-500/5" :
//                         "bg-surface dark:bg-surface-secondary border-border"
//                   )}
//                   style={{ zIndex: -1 }}
//                   transition={{ type: "spring", stiffness: 450, damping: 35 }}
//                 />
//               )}
//               {tab.label}
//             </Link>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// /* ─── Category Chip ─── */
// function CategoryChip({
//   label,
//   active,
//   href,
//   Icon,
// }: {
//   label: string;
//   active: boolean;
//   href: string;
//   Icon?: LucideIcon;
// }) {
//   return (
//     <Link
//       href={href}
//       className={cn(
//         "shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-[12px] font-semibold transition-all border whitespace-nowrap shadow-none",
//         active
//           ? "bg-orange-500 text-white border-orange-400 shadow-[0_4px_12px_rgba(249,115,22,0.30)]"
//           : "bg-surface dark:bg-surface border-border text-stone-600 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-500"
//       )}
//     >
//       {Icon && <span className="text-base leading-none">
//         <Icon className="h-4 w-4 " />
//       </span>}
//       {label}
//     </Link>
//   );
// }

// /* ─── Sort Pill ─── */
// function SortPill({
//   active,
//   href,
//   icon: Icon,
//   label,
// }: {
//   active: boolean;
//   href: string;
//   icon?: React.ElementType;
//   label: string;
// }) {
//   return (
//     <Link
//       href={href}
//       className={cn(
//         "shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-[12px] font-semibold border transition-all whitespace-nowrap shadow-none",
//         active
//           ? "bg-orange-500 text-white border-orange-400 shadow-[0_4px_12px_rgba(249,115,22,0.30)]"
//           : "bg-surface dark:bg-surface border-border text-stone-500 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-500"
//       )}
//     >
//       {Icon && <Icon className="h-4 w-4 " />}
//       {label}
//     </Link>
//   );
// }

// /* ─── Category icon map ─── */
// const CATEGORY_ICONS: Record<string, LucideIcon> = {
//   electronics: Zap,
//   fashion: Shirt,
//   apparel: ShoppingBag,
//   home: Home,
//   furniture: Sofa,
//   beauty: Sparkles,
//   health: HeartPulse,
//   food: Apple,
//   sports: Trophy,
//   toys: Puzzle,
//   books: BookOpen,
//   automotive: Car,
//   garden: Flower2,
//   jewelry: Gem,
//   music: Music,
//   art: Palette,
//   travel: Plane,
//   pets: PawPrint,
//   baby: Baby,
//   tools: Wrench,
// };

// function getCategoryIcon(slug: string, name: string): LucideIcon | undefined {
//   const s = `${slug} ${name}`.toLowerCase();
//   for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
//     if (s.includes(key)) return icon;
//   }
//   return ShoppingBag;
// }

// /* ─── Main Component ─── */
// export function MarketplaceClient({
//   initialProducts,
//   categories,
//   total,
//   currentPage,
//   limit,
//   params,
//   viralClips = [],
//   topCreators = [],
//   popularStores = [],
//   hasShopifyProducts = false,
//   cartProductIds = [],
//   followedVendorIds = [],
//   marketplaceStats,
//   basePath = "/marketplace",
//   uiVariant = "all",
// }: MarketplaceClientProps & { basePath?: string }) {
//   const DIGITAL_SLUG_PATTERNS = ["ebook", "course", "software", "template", "digital", "asset"];
//   const displayCategories = useMemo(() => {
//     if (params.type === "digital") {
//       const dCats = categories.filter(c =>
//         DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
//       );
//       if (dCats.length > 0) return dCats;
//       return [
//         { id: "template", slug: "template", name: "Templates" },
//         { id: "ebook", slug: "ebook", name: "E-Books" },
//         { id: "software", slug: "software", name: "Software" },
//         { id: "course", slug: "course", name: "Courses" }
//       ];
//     }
//     if (params.type === "physical") {
//       return categories.filter(c =>
//         !DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
//       );
//     }
//     return categories;
//   }, [categories, params.type]);

//   const cartSet = useMemo(() => new Set(cartProductIds), [cartProductIds]);
//   const followSet = useMemo(() => new Set(followedVendorIds), [followedVendorIds]);
//   const totalPages = Math.ceil(total / limit);

//   const [modalClip, setModalClip] = useState<(typeof viralClips)[number] | null>(null);
//   const closeModalClip = useCallback(() => setModalClip(null), []);
//   useBodyScrollLock(!!modalClip);
//   useEscapeClose(!!modalClip, closeModalClip);

//   const paramsRecord = params as Record<string, string | undefined>;
//   const currentSort = params.sort ?? "trending";

//   const mixedFeed = useMemo(
//     () => initialProducts.map((p) => ({ type: "product" as const, data: p })),
//     [initialProducts]
//   );

//   const statLine =
//     marketplaceStats && (marketplaceStats.activeVendors > 0 || marketplaceStats.activeListings > 0)
//       ? `${marketplaceStats.activeListingsLabel} listings available`
//       : null;

//   const renderCat = (cat: { slug: string | null; name: string }) => {
//     const isActive = (!params.cat && !cat.slug) || params.cat === cat.slug;
//     const IconItem = cat.slug ? getCategoryIcon(cat.slug, cat.name) : ShoppingBag;
//     return (
//       <Link
//         key={cat.slug || "all"}
//         href={marketplaceHref(paramsRecord, { cat: cat.slug ?? null }, basePath)}
//         className={cn(
//           "flex items-center gap-2.5 py-2 px-3 rounded-sm text-[12px] font-semibold transition-all",
//           isActive
//             ? "bg-orange-500/10 text-orange-600 border border-orange-500/20"
//             : "text-stone-500 dark:text-text-muted hover:bg-surface-secondary dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-white border border-transparent"
//         )}
//       >
//         {IconItem && <span className="text-base leading-none">
//           <IconItem className="h-4 w-4 " />
//         </span>}
//         <span className="flex-1 truncate">{cat.name}</span>
//         {isActive && (
//           <span className="w-1.5 h-1.5 rounded-sm bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
//         )}
//       </Link>
//     );
//   };

//   return (
//     <div className={cn(
//       "min-h-screen relative transition-colors duration-500",
//       uiVariant === "digital"
//         ? "bg-[#fafcfe] dark:bg-[#050505]"
//         : "bg-white dark:bg-bg"
//     )}>
//       {/* ── Sticky Top Bar ── */}
//       <div className="sticky top-0 z-50 border-b border-border shadow-none bg-surface">
//         <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-3 pb-3">
//           <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">

//             {/* Search bar */}
//             <div className="w-full md:max-w-[420px] lg:max-w-[500px]">
//               <MarketplaceSearch currentParams={paramsRecord} className="w-full" basePath={basePath} />
//             </div>

//             {/* Right side controls */}
//             <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-4">

//               {/* Segmented Type tabs */}
//               <div className="w-full md:w-auto">
//                 <TypeTabs params={paramsRecord} basePath={basePath} />
//               </div>

//               {/* Stats Badge (Desktop Only) */}
//               {statLine && (
//                 <div className={cn(
//                   "hidden lg:flex items-center gap-3 pl-5 border-l",
//                   uiVariant === "digital" ? "border-sky-500/20" : "border-stone-200 dark:border-white/10"
//                 )}>
//                   <div className="relative flex h-2.5 w-2.5">
//                     <span className={cn(
//                       "animate-ping absolute inline-flex h-full w-full rounded-sm opacity-75",
//                       uiVariant === "digital" ? "bg-sky-400" : "bg-emerald-400"
//                     )}></span>
//                     <span className={cn(
//                       "relative inline-flex rounded-sm h-2.5 w-2.5",
//                       uiVariant === "digital" ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]" : "bg-emerald-500"
//                     )}></span>
//                   </div>
//                   <div className="flex flex-col">
//                     <span className={cn(
//                       "text-[10px] font-black uppercase tracking-widest leading-none",
//                       uiVariant === "digital" ? "text-sky-400/60" : "text-stone-400 dark:text-stone-600"
//                     )}>
//                       {uiVariant === "digital" ? "Network Node" : "Market Status"}
//                     </span>
//                     <span className={cn(
//                       "text-[13px] font-black leading-tight block mt-0.5",
//                       uiVariant === "digital" ? "text-white" : "text-stone-700 dark:text-stone-300"
//                     )}>
//                       {statLine}
//                     </span>
//                   </div>
//                 </div>
//               )}

//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Main Content ── */}
//       <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 lg:py-6 flex flex-col lg:flex-row gap-6">

//         {/* ── LEFT SIDEBAR (desktop) ── */}
//         <aside className="hidden lg:block lg:w-60 shrink-0">
//           <div className="sticky top-[130px] space-y-5">
//             {/* Main sidebar shell with variant-aware borders */}
//             <div className={cn(
//               "bg-surface dark:bg-surface rounded-sm border border-border shadow-none overflow-hidden",
//               uiVariant === "digital" && "border-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.05)]",
//               uiVariant === "physical" && "border-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.05)]"
//             )}>
//               <div className="p-4">
//                 <div className="mb-4">
//                   {renderCat({ slug: null, name: "All Browse" })}
//                 </div>

//                 {uiVariant === "all" ? (
//                   <div className="space-y-5">
//                     {(() => {
//                       const digitals = displayCategories.filter(c => DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p)));
//                       if (digitals.length === 0) return null;
//                       return (
//                         <div>
//                           <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-sky-50 dark:bg-sky-500/10 rounded-sm">
//                             <Zap className="h-3 w-3 text-sky-500" />
//                             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">Digital Hub</h3>
//                           </div>
//                           <div className="flex flex-col gap-0.5">
//                             {digitals.map(renderCat)}
//                           </div>
//                         </div>
//                       );
//                     })()}
//                     {(() => {
//                       const physicals = displayCategories.filter(c => !DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p)));
//                       if (physicals.length === 0) return null;
//                       return (
//                         <div>
//                           <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-orange-50 dark:bg-orange-500/10 rounded-sm">
//                             <Package className="h-3 w-3 text-orange-500" />
//                             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Physical Goods</h3>
//                           </div>
//                           <div className="flex flex-col gap-0.5">
//                             {physicals.map(renderCat)}
//                           </div>
//                         </div>
//                       );
//                     })()}
//                   </div>
//                 ) : (
//                   <>
//                     <h3 className={cn(
//                       "text-[10px] font-black uppercase tracking-[0.2em] mb-3 px-3",
//                       uiVariant === "digital" ? "text-sky-400" : "text-stone-400 dark:text-stone-600"
//                     )}>
//                       {uiVariant === "digital" ? "Assets Directory" : "Product Catalog"}
//                     </h3>
//                     <div className="flex flex-col gap-0.5">
//                       {displayCategories.map(renderCat)}
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>

//             {/* Contextual Info Card */}
//             <div className={cn(
//               "rounded-sm border p-5 relative overflow-hidden group",
//               uiVariant === "digital" ? "bg-sky-500/[0.03] border-sky-500/10" : "bg-orange-50 dark:bg-zinc-900 border-orange-200/50 dark:border-white/5"
//             )}>
//               <div className="relative z-10">
//                 <div className={cn(
//                   "h-8 w-8 rounded-sm flex items-center justify-center mb-3",
//                   uiVariant === "digital" ? "bg-sky-500/20 text-sky-400" : "bg-orange-500 text-white"
//                 )}>
//                   <ShieldCheck className="h-4 w-4" />
//                 </div>
//                 <h4 className="text-[13px] font-bold text-stone-900 dark:text-white mb-1">
//                   {uiVariant === "digital" ? "Verified License" : "Trust & Tracking"}
//                 </h4>
//                 <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed italic">
//                   {uiVariant === "digital"
//                     ? "Ownership confirmed on chain. Access your files instantly via your library."
//                     : "Secure door-to-door delivery. Track your package live from our network."}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </aside>

//         {/* ── PRODUCT AREA ── */}
//         <div className="flex-1 min-w-0 space-y-4">

//           {/* Hero Deal Banner */}
//           <HeroDealBanner params={paramsRecord} basePath={basePath} />

//           {/* Category chips (mobile + desktop) */}
//           <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
//             <CategoryChip
//               label="All"
//               active={!params.cat}
//               href={marketplaceHref(paramsRecord, { cat: null }, basePath)}
//               Icon={ShoppingBag}
//             />
//             {displayCategories.slice(0, 12).map((cat) => (
//               <CategoryChip
//                 key={cat.slug}
//                 label={cat.name}
//                 active={params.cat === cat.slug}
//                 href={marketplaceHref(paramsRecord, { cat: cat.slug }, basePath)}
//                 Icon={getCategoryIcon(cat.slug, cat.name)}
//               />
//             ))}
//           </div>

//           {/* Sort pills */}
//           <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
//             <SortPill
//               active={currentSort === "trending"}
//               href={marketplaceHref(paramsRecord, { sort: "trending" }, basePath)}
//               icon={TrendingUp}
//               label="Trending"
//             />
//             <SortPill
//               active={currentSort === "newest"}
//               href={marketplaceHref(paramsRecord, { sort: "newest" }, basePath)}
//               icon={Clock}
//               label="New"
//             />
//             <SortPill
//               active={currentSort === "best_selling"}
//               href={marketplaceHref(paramsRecord, { sort: "best_selling" }, basePath)}
//               icon={Award}
//               label="Best Selling"
//             />
//             <SortPill
//               active={currentSort === "price_asc"}
//               href={marketplaceHref(paramsRecord, { sort: "price_asc" }, basePath)}
//               label="Price ↑"
//             />
//             <SortPill
//               active={currentSort === "price_desc"}
//               href={marketplaceHref(paramsRecord, { sort: "price_desc" }, basePath)}
//               label="Price ↗"
//             />
//           </div>

//           {/* Active filter chips */}
//           {(params.q || params.cat || params.affiliate === "1") && (
//             <div className="flex flex-wrap items-center gap-2">
//               <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Filters:</span>
//               {params.q?.trim() ? (
//                 <Link
//                   href={marketplaceHref(paramsRecord, { q: null }, basePath)}
//                   className="inline-flex items-center gap-1 rounded-sm bg-surface dark:bg-surface border border-border px-3 py-1 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all shadow-none"
//                 >
//                   "{params.q.trim()}" <X className="h-3 w-3 opacity-50" />
//                 </Link>
//               ) : null}
//               {params.cat ? (
//                 <Link
//                   href={marketplaceHref(paramsRecord, { cat: null }, basePath)}
//                   className="inline-flex items-center gap-1 rounded-sm bg-surface dark:bg-surface border border-border px-3 py-1 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all shadow-none"
//                 >
//                   {displayCategories.find((c) => c.slug === params.cat)?.name ?? params.cat}{" "}
//                   <X className="h-3 w-3 opacity-50" />
//                 </Link>
//               ) : null}
//               {params.affiliate === "1" ? (
//                 <Link
//                   href={marketplaceHref(paramsRecord, { affiliate: null }, basePath)}
//                   className="inline-flex items-center gap-1 rounded-sm bg-surface dark:bg-surface border border-border px-3 py-1 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all shadow-none"
//                 >
//                   Affiliate <X className="h-3 w-3 opacity-50" />
//                 </Link>
//               ) : null}
//               <Link href={basePath} className="text-[11px] font-semibold text-orange-500 hover:text-orange-600 ml-1">
//                 Clear all
//               </Link>
//             </div>
//           )}

//           {/* Result count + section heading */}
//           <div className="flex items-center justify-between">
//             <h2 className="text-[15px] font-bold text-stone-800 dark:text-white">
//               {params.q?.trim()
//                 ? `Results for "${params.q.trim()}"`
//                 : params.type === "digital"
//                   ? "Digital Products"
//                   : params.type === "physical"
//                     ? "Physical Products"
//                     : params.cat
//                       ? (displayCategories.find((c) => c.slug === params.cat)?.name ?? "Products")
//                       : "All Products"}
//             </h2>
//             <span className="text-[12px] text-stone-400 dark:text-text-muted tabular-nums">
//               <span className="font-semibold text-stone-600 dark:text-stone-300">{total}</span>{" "}
//               result{total === 1 ? "" : "s"}
//             </span>
//           </div>

//           {/* Product grid */}
//           <AnimatePresence mode="wait">
//             {mixedFeed.length > 0 ? (
//               <motion.div
//                 key={JSON.stringify(params)}
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 transition={{ duration: 0.25 }}
//               >
//                 {uiVariant === "all" ? (
//                   <div className="space-y-10">
//                     {(() => {
//                       const digitals = mixedFeed.filter(m => m.data.product_type === "digital" || m.data.is_digital);
//                       if (digitals.length === 0) return null;
//                       return (
//                         <div>
//                           <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/50">
//                             <Zap className="h-4 w-4 text-sky-500" />
//                             <h3 className="text-[13px] font-black uppercase tracking-[0.1em] text-sky-500">Digital Assets</h3>
//                           </div>
//                           <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//                             {digitals.map((item, idx) => (
//                               <motion.div
//                                 key={`product-${item.data.id}-${idx}`}
//                                 initial={{ opacity: 0, y: 16 }}
//                                 animate={{ opacity: 1, y: 0 }}
//                                 transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
//                               >
//                                 <ProductCardDigital p={item.data} initialInCart={cartSet.has(item.data.id)} />
//                               </motion.div>
//                             ))}
//                           </div>
//                         </div>
//                       );
//                     })()}

//                     {(() => {
//                       const physicals = mixedFeed.filter(m => m.data.product_type !== "digital" && !m.data.is_digital);
//                       if (physicals.length === 0) return null;
//                       return (
//                         <div>
//                           <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/50">
//                             <Package className="h-4 w-4 text-orange-500" />
//                             <h3 className="text-[13px] font-black uppercase tracking-[0.1em] text-orange-500">Physical Goods</h3>
//                           </div>
//                           <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//                             {physicals.map((item, idx) => (
//                               <motion.div
//                                 key={`product-${item.data.id}-${idx}`}
//                                 initial={{ opacity: 0, y: 16 }}
//                                 animate={{ opacity: 1, y: 0 }}
//                                 transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
//                               >
//                                 <ProductCardPhysical p={item.data} detailBasePath="/marketplace" initialInCart={cartSet.has(item.data.id)} />

//                               </motion.div>
//                             ))}
//                           </div>
//                         </div>
//                       );
//                     })()}
//                   </div>
//                 ) : (
//                   <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//                     {mixedFeed.map((item, idx) => (
//                       <motion.div
//                         key={`product-${item.data.id}-${idx}`}
//                         initial={{ opacity: 0, y: 16 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{
//                           delay: Math.min(idx * 0.04, 0.4),
//                           duration: 0.32,
//                           ease: [0.23, 1, 0.32, 1],
//                         }}
//                       >
//                         {uiVariant === "digital" ? (
//                           <ProductCardDigital p={item.data} detailBasePath="/marketplace" initialInCart={cartSet.has(item.data.id)} />
//                         ) : uiVariant === "physical" ? (
//                           <ProductCardPhysical p={item.data} detailBasePath="/marketplace" initialInCart={cartSet.has(item.data.id)} />
//                         ) : (
//                           <ProductCardClient p={item.data} detailBasePath="/marketplace" initialInCart={cartSet.has(item.data.id)} />
//                         )}

//                       </motion.div>
//                     ))}
//                   </div>
//                 )}

//                 {/* Recommended section label */}
//                 {initialProducts.length >= 8 && (
//                   <div className="mt-8 flex items-center justify-between">
//                     <h3 className="text-[15px] font-bold text-stone-800 dark:text-white flex items-center gap-2">
//                       <Sparkles className="h-4 w-4 text-orange-500" />
//                       Recommended for you
//                     </h3>
//                     <Link
//                       href="/marketplace"
//                       className="inline-flex items-center gap-1 text-[12px] font-semibold text-orange-500 hover:text-orange-600"
//                     >
//                       {total} Items <ChevronRight className="h-3.5 w-3.5" />
//                     </Link>
//                   </div>
//                 )}
//               </motion.div>
//             ) : (
//               /* Empty state */
//               <motion.div
//                 initial={{ opacity: 0, scale: 0.98 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 className="bg-surface dark:bg-surface rounded-sm border border-border shadow-none p-12 sm:p-16 text-center"
//               >
//                 <div className="h-16 w-16 rounded-sm flex items-center justify-center mx-auto mb-5"
//                   style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}
//                 >
//                   <Search className="h-7 w-7 text-orange-400" />
//                 </div>
//                 <h3 className="text-[18px] font-bold text-stone-800 dark:text-white mb-2">No products match</h3>
//                 <p className="text-[13px] text-stone-500 dark:text-text-muted mb-8 max-w-sm mx-auto leading-relaxed">
//                   Try a different search term, clear your filters, or browse all categories.
//                 </p>
//                 <Link href={basePath}>
//                   <button
//                     type="button"
//                     className="inline-flex items-center gap-2 px-6 py-3 rounded-sm text-white text-[13px] font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_4px_16px_rgba(249,115,22,0.35)]"
//                     style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
//                   >
//                     View all products
//                   </button>
//                 </Link>
//               </motion.div>
//             )}
//           </AnimatePresence>

//           {/* Pagination */}
//           {totalPages > 1 && initialProducts.length > 0 && (
//             <div className="flex items-center justify-center gap-2 mt-8 pb-8">
//               {currentPage > 1 ? (
//                 <Link href={marketplaceHref(paramsRecord, { page: String(currentPage - 1) }, basePath)}>
//                   <button
//                     type="button"
//                     className="px-4 py-2 rounded-sm bg-surface dark:bg-surface border border-border text-[12px] font-semibold text-stone-600 dark:text-stone-300 shadow-none hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all"
//                   >
//                     Previous
//                   </button>
//                 </Link>
//               ) : null}
//               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                 const pg = Math.max(1, currentPage - 2) + i;
//                 if (pg > totalPages) return null;
//                 return (
//                   <Link key={pg} href={marketplaceHref(paramsRecord, { page: String(pg) }, basePath)}>
//                     <button
//                       type="button"
//                       className={cn(
//                         "min-w-[40px] h-10 px-3 rounded-sm text-[12px] font-black transition-all border",
//                         pg === currentPage
//                           ? "bg-orange-500 border-orange-400 text-white shadow-[0_4px_12px_rgba(249,115,22,0.30)]"
//                           : "bg-surface dark:bg-surface border-border text-stone-600 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400"
//                       )}
//                     >
//                       {pg}
//                     </button>
//                   </Link>
//                 );
//               })}
//               {currentPage < totalPages ? (
//                 <Link href={marketplaceHref(paramsRecord, { page: String(currentPage + 1) }, basePath)}>
//                   <button
//                     type="button"
//                     className="px-4 py-2 rounded-sm bg-surface dark:bg-surface border border-border text-[12px] font-semibold text-stone-600 dark:text-stone-300 shadow-none hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all"
//                   >
//                     Next
//                   </button>
//                 </Link>
//               ) : null}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── Clip modal ── */}
//       {modalClip && (
//         <>
//           <div
//             className="fixed inset-0 z-[1000] bg-black/80 animate-in fade-in duration-200"
//             onClick={closeModalClip}
//             aria-hidden
//           />
//           <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
//             <div className="pointer-events-auto w-full max-w-lg flex flex-col bg-white dark:bg-surface rounded-sm overflow-hidden shadow-none border border-border relative">
//               <button
//                 type="button"
//                 onClick={closeModalClip}
//                 className="absolute top-3 right-3 z-20 w-8 h-8 rounded-sm bg-black/50 flex items-center justify-center text-white hover:bg-black/80 transition-all shadow-none"
//               >
//                 <X className="h-4 w-4" />
//               </button>
//               <div className="aspect-[9/16] max-h-[50vh] relative bg-stone-900">
//                 {modalClip.video_url?.includes("youtube.com") || modalClip.video_url?.includes("youtu.be") ? (
//                   <iframe
//                     src={String(modalClip.video_url).replace("watch?v=", "embed/") + "?autoplay=1&mute=1&loop=1&controls=0"}
//                     className="absolute inset-0 w-full h-full pointer-events-none scale-[1.2]"
//                     allow="autoplay"
//                     title={modalClip.title ?? "Clip"}
//                   />
//                 ) : (
//                   <div
//                     className="absolute inset-0 bg-cover bg-center"
//                     style={{
//                       backgroundImage: modalClip.thumbnail_url
//                         ? `url(${modalClip.thumbnail_url})`
//                         : "linear-gradient(to bottom, #1c1917, #431407)",
//                     }}
//                   />
//                 )}
//                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
//                 <div className="absolute bottom-4 left-4 right-12 flex items-center gap-3">
//                   <Avatar className="h-10 w-10 border-2 border-orange-400">
//                     <AvatarImage
//                       src={(modalClip.vendors as { logo_url?: string; business_logo?: string } | undefined)?.logo_url ?? (modalClip.vendors as { business_logo?: string } | undefined)?.business_logo}
//                     />
//                     <AvatarFallback className="bg-orange-500 text-white font-bold">
//                       {modalClip.vendors?.business_name?.[0] ?? "V"}
//                     </AvatarFallback>
//                   </Avatar>
//                   <div className="flex-1 min-w-0">
//                     <p className="text-white font-bold truncate">{modalClip.vendors?.business_name ?? "Creator"}</p>
//                     <p className="text-[11px] text-white/60">{(modalClip.total_views ?? 0).toLocaleString()} views</p>
//                   </div>
//                   {modalClip.vendors?.id && (
//                     <FollowButton
//                       vendorId={modalClip.vendors.id}
//                       className="rounded-sm h-9 px-4 text-xs font-bold bg-orange-500 border-0 text-white hover:bg-orange-400 shrink-0"
//                     />
//                   )}
//                 </div>
//               </div>
//               {modalClip.products && (
//                 <div className="p-4 border-t border-border flex items-center gap-4 bg-stone-50 dark:bg-stone-900">
//                   <div className="w-14 h-14 rounded-sm bg-white dark:bg-stone-800 border border-border flex items-center justify-center overflow-hidden shrink-0">
//                     {Array.isArray(modalClip.products.images) && modalClip.products.images[0] ? (
//                       <img src={modalClip.products.images[0]} alt="" className="w-full h-full object-cover" />
//                     ) : (
//                       <ShoppingBag className="h-6 w-6 text-white/50" />
//                     )}
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <p className="text-white font-bold text-sm truncate">{modalClip.products.name}</p>
//                     <LocalizedPrice
//                       amount={Number(modalClip.products.price)}
//                       currency={(modalClip.products as { currency?: string | null }).currency}
//                       className="text-orange-400 font-bold"
//                     />
//                   </div>
//                   <Link
//                     href={`/marketplace/${(modalClip.products as { slug?: string }).slug ?? ""}?buy=1`}
//                     onClick={closeModalClip}
//                   >
//                     <button
//                       type="button"
//                       className="px-5 py-2.5 rounded-sm text-white text-[12px] font-semibold hover:opacity-90 transition-all shadow-none"
//                       style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
//                     >
//                       Buy Now
//                     </button>
//                   </Link>
//                 </div>
//               )}
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useBodyScrollLock, useEscapeClose } from "@/hooks/use-body-scroll-lock";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Package, Zap, ShieldCheck, Sparkles, TrendingUp,
  Clock, Star, ShoppingBag, X, ChevronRight, MapPin,
  Award, SlidersHorizontal, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketplaceSearch, marketplaceHref } from "@/components/marketplace/marketplace-search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { ProductCardDigital } from "@/components/marketplace/product-card-digital";
import { ProductCardPhysical } from "@/components/marketplace/product-card-physical";
import { FollowButton } from "@/components/marketplace/follow-button";
import { LocalizedPrice } from "@/components/currency/localized-price";
import {
  Shirt, Home, Sofa, HeartPulse, Apple, Trophy, Puzzle,
  BookOpen, Car, Flower2, Gem, Music, Palette, Plane, PawPrint, Baby, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─── Types ─── */
interface Product {
  id: string; name: string; slug: string; price: number;
  compare_at_price?: number | null; images?: string[];
  rating?: number; review_count?: number; is_featured?: boolean;
  is_digital?: boolean; product_type?: string;
  affiliate_enabled?: boolean; affiliate_commission_rate?: number | null;
  vendors?: { id: string; business_name?: string } | null;
  product_categories?: { id: string; name: string; slug: string } | null;
  source?: string; currency?: string;
}
interface Category { id: string; name: string; slug: string; }
interface MarketplaceClientProps {
  initialProducts: Product[]; categories: Category[];
  total: number; currentPage: number; limit: number;
  params: { cat?: string; type?: string; catalog?: string; q?: string; sort?: string; affiliate?: string; };
  viralClips?: any[]; topCreators?: any[]; popularStores?: any[];
  hasShopifyProducts?: boolean; cartProductIds?: string[];
  followedVendorIds?: string[];
  marketplaceStats?: { activeVendors: number; activeListings: number; activeVendorsLabel: string; activeListingsLabel: string; };
  uiVariant?: "all" | "digital" | "physical";
}

/* ─── Category icon map ─── */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Zap, fashion: Shirt, apparel: ShoppingBag, home: Home,
  furniture: Sofa, beauty: Sparkles, health: HeartPulse, food: Apple,
  sports: Trophy, toys: Puzzle, books: BookOpen, automotive: Car,
  garden: Flower2, jewelry: Gem, music: Music, art: Palette,
  travel: Plane, pets: PawPrint, baby: Baby, tools: Wrench,
};
function getCategoryIcon(slug: string, name: string): LucideIcon {
  const s = `${slug} ${name}`.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (s.includes(key)) return icon;
  }
  return ShoppingBag;
}

const DIGITAL_SLUG_PATTERNS = ["ebook", "course", "software", "template", "digital", "asset"];

/* ─── Type Tabs ─── */
function TypeTabs({ params, basePath }: { params: Record<string, string | undefined>; basePath?: string }) {
  const tabs = [
    { label: "All", value: null as string | null },
    { label: "Digital", value: "digital" },
    { label: "Physical", value: "physical" },
  ];
  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl"
      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
    >
      {tabs.map(tab => {
        const isActive = tab.value === null ? !params.type : params.type === tab.value;
        const href = tab.value
          ? marketplaceHref(params, { type: tab.value, catalog: null }, basePath)
          : marketplaceHref(params, { type: null, catalog: null }, basePath);
        return (
          <Link
            key={tab.label}
            href={href}
            className="relative px-4 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-150 whitespace-nowrap"
            style={isActive
              ? { background: "var(--color-text-primary)", color: "var(--color-bg)" }
              : { color: "var(--color-text-muted)" }
            }
            onMouseEnter={e => { if (!isActive) (e.currentTarget.style.color = "var(--color-text-primary)"); }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget.style.color = "var(--color-text-muted)"); }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ─── Category chip ─── */
function CategoryChip({ label, active, href, Icon }: {
  label: string; active: boolean; href: string; Icon?: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
      style={active
        ? { background: "var(--color-accent)", color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 12px rgba(253,80,0,0.25)" }
        : { background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
      }
      onMouseEnter={e => { if (!active) { (e.currentTarget.style.color = "var(--color-accent)"); (e.currentTarget.style.borderColor = "var(--color-accent)") } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); } }}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </Link>
  );
}

/* ─── Sort pill ─── */
function SortPill({ active, href, icon: Icon, label }: {
  active: boolean; href: string; icon?: React.ElementType; label: string;
}) {
  return (
    <Link
      href={href}
      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
      style={active
        ? { background: "var(--color-accent)", color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 12px rgba(253,80,0,0.25)" }
        : { background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
      }
      onMouseEnter={e => { if (!active) { (e.currentTarget.style.color = "var(--color-accent)"); (e.currentTarget.style.borderColor = "var(--color-accent)"); } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); } }}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </Link>
  );
}

/* ─── Sidebar category link ─── */
function SidebarCat({ cat, active, href }: {
  cat: { slug: string | null; name: string }; active: boolean; href: string;
}) {
  const Icon = cat.slug ? getCategoryIcon(cat.slug, cat.name) : ShoppingBag;
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
      style={active
        ? { background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }
        : { color: "var(--color-text-muted)", border: "1px solid transparent" }
      }
      onMouseEnter={e => { if (!active) { (e.currentTarget.style.background = "var(--color-surface-secondary)"); (e.currentTarget.style.color = "var(--color-text-primary)"); } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget.style.background = "transparent"); (e.currentTarget.style.color = "var(--color-text-muted)"); } }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{cat.name}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "var(--color-accent)" }} />}
    </Link>
  );
}

/* ─── Section divider ─── */
function SectionDivider({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={cn("h-5 w-5 rounded-md flex items-center justify-center", color)}>
        <Icon className="h-3 w-3" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
    </div>
  );
}

/* ─── Hero banner ─── */
function HeroBanner({ params, basePath }: { params: Record<string, string | undefined>; basePath?: string }) {
  const isDigital = params.type === "digital";
  const isPhysical = params.type === "physical";

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: isDigital
            ? "radial-gradient(ellipse 80% 100% at 100% 50%, rgba(14,165,233,0.08) 0%, transparent 60%)"
            : "radial-gradient(ellipse 80% 100% at 100% 50%, rgba(253,80,0,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-3 max-w-md">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: "var(--color-accent)" }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {isDigital ? "Digital Marketplace" : isPhysical ? "Physical Store" : "Jimvio Marketplace"}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight" style={{ color: "var(--color-text-primary)" }}>
            {isDigital
              ? "Premium digital assets, ready to download"
              : isPhysical
                ? "Quality products, delivered to your door"
                : "Everything you need, in one place"}
          </h2>

          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {isDigital
              ? "Templates, courses, software and more — instant access after purchase."
              : isPhysical
                ? "From electronics to fashion — tracked worldwide shipping."
                : "Shop digital products or physical goods from verified vendors globally."}
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {[
              { icon: ShieldCheck, label: "Verified vendors" },
              { icon: MapPin, label: "Worldwide delivery" },
              { icon: Star, label: "Buyer protection" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Link
            href={marketplaceHref(params, { sort: "trending" }, basePath)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{ background: "var(--color-accent)", boxShadow: "0 4px 16px rgba(253,80,0,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
          >
            <TrendingUp className="h-4 w-4" />
            Trending now
          </Link>
          <Link
            href={marketplaceHref(params, { sort: "newest" }, basePath)}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "transparent" }}
            onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.borderColor = "var(--color-border-strong)"); }}
            onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); }}
          >
            New arrivals
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export function MarketplaceClient({
  initialProducts, categories, total, currentPage, limit, params,
  viralClips = [], cartProductIds = [], followedVendorIds = [],
  marketplaceStats, basePath = "/marketplace", uiVariant = "all",
}: MarketplaceClientProps & { basePath?: string }) {

  const displayCategories = useMemo(() => {
    if (params.type === "digital") {
      const dCats = categories.filter(c =>
        DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
      );
      return dCats.length > 0 ? dCats : [
        { id: "template", slug: "template", name: "Templates" },
        { id: "ebook", slug: "ebook", name: "E-Books" },
        { id: "software", slug: "software", name: "Software" },
        { id: "course", slug: "course", name: "Courses" },
      ];
    }
    if (params.type === "physical") {
      return categories.filter(c =>
        !DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
      );
    }
    return categories;
  }, [categories, params.type]);

  const cartSet = useMemo(() => new Set(cartProductIds), [cartProductIds]);
  const totalPages = Math.ceil(total / limit);

  const [modalClip, setModalClip] = useState<(typeof viralClips)[number] | null>(null);
  const closeModalClip = useCallback(() => setModalClip(null), []);
  useBodyScrollLock(!!modalClip);
  useEscapeClose(!!modalClip, closeModalClip);

  const paramsRecord = params as Record<string, string | undefined>;
  const currentSort = params.sort ?? "trending";
  const mixedFeed = useMemo(() => initialProducts.map(p => ({ type: "product" as const, data: p })), [initialProducts]);
  const hasActiveFilter = !!(params.q || params.cat || params.affiliate === "1");

  const statLine = marketplaceStats && (marketplaceStats.activeVendors > 0 || marketplaceStats.activeListings > 0)
    ? `${marketplaceStats.activeListingsLabel} listings`
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>

      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-0 z-50 backdrop-blur-sm"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">

            {/* Search */}
            <div className="w-full md:max-w-[460px]">
              <MarketplaceSearch currentParams={paramsRecord} className="w-full" basePath={basePath} />
            </div>

            {/* Right: tabs + live badge */}
            <div className="w-full md:w-auto flex items-center gap-4">
              <TypeTabs params={paramsRecord} basePath={basePath} />

              {statLine && (
                <div
                  className="hidden lg:flex items-center gap-2.5 pl-4"
                  style={{ borderLeft: "1px solid var(--color-border)" }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    {statLine}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Layout ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">

        {/* ── Sidebar ── */}
        <aside className="hidden lg:block lg:w-56 shrink-0">
          <div className="sticky top-[73px] space-y-4">

            {/* Categories */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                  Categories
                </p>
              </div>
              <div className="p-3 space-y-0.5">
                <SidebarCat
                  cat={{ slug: null, name: "All Products" }}
                  active={!params.cat}
                  href={marketplaceHref(paramsRecord, { cat: null }, basePath)}
                />

                {uiVariant === "all" ? (
                  <>
                    {(() => {
                      const dCats = displayCategories.filter(c =>
                        DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
                      );
                      return dCats.length > 0 ? (
                        <div className="pt-2">
                          <SectionDivider icon={Zap} label="Digital" color="bg-sky-500/10 text-sky-500" />
                          {dCats.map(c => (
                            <SidebarCat key={c.slug} cat={c} active={params.cat === c.slug}
                              href={marketplaceHref(paramsRecord, { cat: c.slug }, basePath)} />
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {(() => {
                      const pCats = displayCategories.filter(c =>
                        !DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
                      );
                      return pCats.length > 0 ? (
                        <div className="pt-2">
                          <SectionDivider icon={Package} label="Physical" color="bg-orange-500/10 text-orange-500" />
                          {pCats.map(c => (
                            <SidebarCat key={c.slug} cat={c} active={params.cat === c.slug}
                              href={marketplaceHref(paramsRecord, { cat: c.slug }, basePath)} />
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </>
                ) : (
                  displayCategories.map(c => (
                    <SidebarCat key={c.slug} cat={c} active={params.cat === c.slug}
                      href={marketplaceHref(paramsRecord, { cat: c.slug }, basePath)} />
                  ))
                )}
              </div>
            </div>

            {/* Trust card */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-subtle)" }}
                >
                  <ShieldCheck className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
                </div>
                <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {uiVariant === "digital" ? "Verified licenses" : "Buyer protection"}
                </p>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {uiVariant === "digital"
                  ? "Instant access to your files after purchase via your library."
                  : "Every order tracked from warehouse to door. Refund if undelivered."}
              </p>
            </div>
          </div>
        </aside>

        {/* ── Product area ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Hero */}
          <HeroBanner params={paramsRecord} basePath={basePath} />

          {/* Category chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <CategoryChip label="All" active={!params.cat}
              href={marketplaceHref(paramsRecord, { cat: null }, basePath)} Icon={ShoppingBag} />
            {displayCategories.slice(0, 12).map(cat => (
              <CategoryChip key={cat.slug} label={cat.name} active={params.cat === cat.slug}
                href={marketplaceHref(paramsRecord, { cat: cat.slug }, basePath)}
                Icon={getCategoryIcon(cat.slug, cat.name)} />
            ))}
          </div>

          {/* Sort + result count row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <SortPill active={currentSort === "trending"} href={marketplaceHref(paramsRecord, { sort: "trending" }, basePath)} icon={TrendingUp} label="Trending" />
              <SortPill active={currentSort === "newest"} href={marketplaceHref(paramsRecord, { sort: "newest" }, basePath)} icon={Clock} label="New" />
              <SortPill active={currentSort === "best_selling"} href={marketplaceHref(paramsRecord, { sort: "best_selling" }, basePath)} icon={Award} label="Best Selling" />
              <SortPill active={currentSort === "price_asc"} href={marketplaceHref(paramsRecord, { sort: "price_asc" }, basePath)} label="Price ↑" />
              <SortPill active={currentSort === "price_desc"} href={marketplaceHref(paramsRecord, { sort: "price_desc" }, basePath)} label="Price ↓" />
            </div>

            <p className="text-xs tabular-nums shrink-0" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{total.toLocaleString()}</span>
              {" "}result{total !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Active filter chips */}
          {hasActiveFilter && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Filters:
              </span>
              {params.q?.trim() && (
                <Link
                  href={marketplaceHref(paramsRecord, { q: null }, basePath)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                >
                  "{params.q.trim()}" <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
                </Link>
              )}
              {params.cat && (
                <Link
                  href={marketplaceHref(paramsRecord, { cat: null }, basePath)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                >
                  {displayCategories.find(c => c.slug === params.cat)?.name ?? params.cat}
                  <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
                </Link>
              )}
              {params.affiliate === "1" && (
                <Link
                  href={marketplaceHref(paramsRecord, { affiliate: null }, basePath)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                >
                  Affiliate <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
                </Link>
              )}
              <Link href={basePath} className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                Clear all
              </Link>
            </div>
          )}

          {/* Section heading */}
          <h1 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            {params.q?.trim()
              ? `Results for "${params.q.trim()}"`
              : params.type === "digital" ? "Digital Products"
                : params.type === "physical" ? "Physical Products"
                  : params.cat
                    ? (displayCategories.find(c => c.slug === params.cat)?.name ?? "Products")
                    : "All Products"}
          </h1>

          {/* Products */}
          <AnimatePresence mode="wait">
            {mixedFeed.length > 0 ? (
              <motion.div
                key={JSON.stringify(params)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {uiVariant === "all" ? (
                  <div className="space-y-10">
                    {(() => {
                      const digitals = mixedFeed.filter(m => m.data.product_type === "digital" || m.data.is_digital);
                      const physicals = mixedFeed.filter(m => m.data.product_type !== "digital" && !m.data.is_digital);
                      return (
                        <>
                          {digitals.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-5 w-5 rounded-md bg-sky-500/10 flex items-center justify-center">
                                  <Zap className="h-3 w-3 text-sky-500" />
                                </div>
                                <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Digital Assets</h2>
                                <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
                                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{digitals.length}</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                {digitals.map((item, idx) => (
                                  <motion.div key={item.data.id}
                                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.28 }}
                                  >
                                    <ProductCardDigital p={item.data} initialInCart={cartSet.has(item.data.id)} />
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}

                          {physicals.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-5 w-5 rounded-md bg-orange-500/10 flex items-center justify-center">
                                  <Package className="h-3 w-3 text-orange-500" />
                                </div>
                                <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Physical Goods</h2>
                                <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
                                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{physicals.length}</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                {physicals.map((item, idx) => (
                                  <motion.div key={item.data.id}
                                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.28 }}
                                  >
                                    <ProductCardPhysical p={item.data} detailBasePath="/marketplace" initialInCart={cartSet.has(item.data.id)} />
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {mixedFeed.map((item, idx) => (
                      <motion.div key={item.data.id}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.28 }}
                      >
                        {uiVariant === "digital" ? <ProductCardDigital p={item.data} detailBasePath="/marketplace" initialInCart={cartSet.has(item.data.id)} />
                          : uiVariant === "physical" ? <ProductCardPhysical p={item.data} detailBasePath="/marketplace" initialInCart={cartSet.has(item.data.id)} />
                            : <ProductCardClient p={item.data} detailBasePath="/marketplace" initialInCart={cartSet.has(item.data.id)} />}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl py-20 text-center"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                >
                  <Search className="h-6 w-6" style={{ color: "var(--color-text-muted)" }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
                  No products found
                </h3>
                <p className="text-sm max-w-xs mx-auto leading-relaxed mb-8" style={{ color: "var(--color-text-muted)" }}>
                  Try a different search term or clear your filters to see all products.
                </p>
                <Link
                  href={basePath}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: "var(--color-accent)", boxShadow: "0 4px 16px rgba(253,80,0,0.25)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                >
                  View all products
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && mixedFeed.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 pt-6 pb-8">
              {currentPage > 1 && (
                <Link href={marketplaceHref(paramsRecord, { page: String(currentPage - 1) }, basePath)}>
                  <button
                    className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                  >
                    Previous
                  </button>
                </Link>
              )}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, currentPage - 2) + i;
                if (pg > totalPages) return null;
                const isActive = pg === currentPage;
                return (
                  <Link key={pg} href={marketplaceHref(paramsRecord, { page: String(pg) }, basePath)}>
                    <button
                      className="h-9 min-w-[36px] px-3 rounded-xl text-xs font-semibold transition-all"
                      style={isActive
                        ? { background: "var(--color-accent)", color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 12px rgba(253,80,0,0.25)" }
                        : { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }
                      }
                    >
                      {pg}
                    </button>
                  </Link>
                );
              })}
              {currentPage < totalPages && (
                <Link href={marketplaceHref(paramsRecord, { page: String(currentPage + 1) }, basePath)}>
                  <button
                    className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                  >
                    Next
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Clip modal ── */}
      {modalClip && (
        <>
          <div className="fixed inset-0 z-[1000] bg-black/80 animate-in fade-in duration-200" onClick={closeModalClip} aria-hidden />
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-md flex flex-col rounded-2xl overflow-hidden relative"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <button
                onClick={closeModalClip}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl bg-black/50 flex items-center justify-center text-white hover:bg-black/80 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="aspect-[9/16] max-h-[50vh] relative bg-stone-900">
                {modalClip.video_url?.includes("youtube.com") || modalClip.video_url?.includes("youtu.be") ? (
                  <iframe
                    src={String(modalClip.video_url).replace("watch?v=", "embed/") + "?autoplay=1&mute=1&loop=1&controls=0"}
                    className="absolute inset-0 w-full h-full pointer-events-none scale-[1.2]"
                    allow="autoplay" title={modalClip.title ?? "Clip"}
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: modalClip.thumbnail_url ? `url(${modalClip.thumbnail_url})` : "linear-gradient(to bottom, #1c1917, #431407)" }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-12 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white/20">
                    <AvatarImage src={(modalClip.vendors as any)?.logo_url ?? (modalClip.vendors as any)?.business_logo} />
                    <AvatarFallback className="text-white font-bold" style={{ background: "var(--color-accent)" }}>
                      {modalClip.vendors?.business_name?.[0] ?? "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{modalClip.vendors?.business_name ?? "Creator"}</p>
                    <p className="text-[11px] text-white/60">{(modalClip.total_views ?? 0).toLocaleString()} views</p>
                  </div>
                  {modalClip.vendors?.id && (
                    <FollowButton vendorId={modalClip.vendors.id}
                      className="rounded-xl h-9 px-4 text-xs font-semibold border-none text-white shrink-0"
                    // style={{ background: "var(--color-accent)" }}
                    />
                  )}
                </div>
              </div>
              {modalClip.products && (
                <div
                  className="p-4 flex items-center gap-4"
                  style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
                >
                  <div
                    className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    {Array.isArray(modalClip.products.images) && modalClip.products.images[0]
                      ? <img src={modalClip.products.images[0]} alt="" className="w-full h-full object-cover" />
                      : <ShoppingBag className="h-5 w-5" style={{ color: "var(--color-text-muted)" }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {modalClip.products.name}
                    </p>
                    <LocalizedPrice
                      amount={Number(modalClip.products.price)}
                      currency={(modalClip.products as any).currency}
                      className="text-sm font-bold"
                    // style={{ color: "var(--color-accent)" }}
                    />
                  </div>
                  <Link href={`/marketplace/${(modalClip.products as any).slug ?? ""}?buy=1`} onClick={closeModalClip}>
                    <button
                      className="px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all"
                      style={{ background: "var(--color-accent)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                    >
                      Buy Now
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
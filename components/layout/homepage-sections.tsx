// "use client";

// import React from "react";
// import Link from "next/link";
// import { motion } from "framer-motion";
// import {
//   ChevronRight, Star, ShieldCheck, CheckCircle, Ship, Globe,
//   DollarSign, Package, Zap, Menu, BarChart2, TrendingUp,
//   UserPlus, ArrowRight, Search, Lock, PlayCircle,
// } from "lucide-react";
// import { cn, formatDisplayMoney } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import { stableDiscountPercent, industryCardBackground, INDUSTRY_GRADIENTS } from "@/lib/homepage-helpers";

// type LucideIcon = React.FC<React.SVGProps<SVGSVGElement>>;

// // ── Animation helpers ──────────────────────────────────────────
// const fadeUp = {
//   hidden: { opacity: 0, y: 28 },
//   show: { opacity: 1, y: 0, transition: { type: "spring", damping: 28, stiffness: 200 } },
// };
// const stagger = {
//   show: { transition: { staggerChildren: 0.08 } },
// };
// const scaleIn = {
//   hidden: { opacity: 0, scale: 0.94 },
//   show: { opacity: 1, scale: 1, transition: { type: "spring", damping: 24, stiffness: 180 } },
// };

// // ── Professional solid surface tokens ────────────────────────────
// const GLASS_LIGHT_STYLE: React.CSSProperties = {
//   background: "var(--color-surface)",
//   border: "1px solid var(--color-border)",
//   boxShadow: "var(--shadow-none)",
// };
// const GLASS_DARK_STYLE: React.CSSProperties = {
//   background: "var(--color-surface)",
//   border: "1px solid var(--color-border)",
//   boxShadow: "var(--shadow-none)",
// };

// // Neutral — no backdrop blur
// const glassLight = "";
// const glassDark = "";
// const glassMid = "";

// // Specular removed
// function GlassSpecular() { return null; }

// // ── Section eyebrow label ──────────────────────────────────────
// function Eyebrow({ text }: { text: string }) {
//   return (
//     <p className="text-[10px] font-semibold text-stone-400 dark:text-text-muted uppercase tracking-[0.25em] mb-2">{text}</p>
//   );
// }

// // ── TRUST BAR ─────────────────────────────────────────────────
// interface TrustBarItem { title: string; desc: string; }
// const TRUST_ICONS: LucideIcon[] = [ShieldCheck, CheckCircle, Ship, DollarSign, Globe];

// export function TrustBar({ items }: { items: TrustBarItem[] }) {
//   return (
//     <motion.div
//       initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
//       variants={stagger}
//       className="relative z-10 py-3 md:py-4 overflow-hidden bg-surface border-y border-border"
//     >
//       <div className="max-w-[1536px] mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
//         {items.map((item, idx) => {
//           const Icon = TRUST_ICONS[idx % TRUST_ICONS.length];
//           return (
//             <motion.div key={idx} variants={fadeUp} className="flex items-center gap-2 md:gap-2.5 group">
//               <motion.span
//                 whileHover={{ scale: 1.12, rotate: -4 }}
//                 className="relative shrink-0 h-8 w-8 flex items-center justify-center rounded-sm transition-all bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 shadow-none"
//               >
//                 <Icon className="h-4 w-4 text-[#fd5000]" />
//               </motion.span>
//               <div className="min-w-0">
//                 <p className="text-[10px] md:text-[12px] font-semibold text-stone-900 dark:text-white tracking-tight leading-tight truncate">{item.title}</p>
//                 <p className="text-[8px] md:text-[10px] text-stone-500 dark:text-text-muted mt-0.5 truncate">{item.desc}</p>
//               </div>
//             </motion.div>
//           );
//         })}
//       </div>
//     </motion.div>
//   );
// }

// // ── RECOMMENDED PICKS HEADER ───────────────────────────────────
// export function RecommendedHeader() {
//   return (
//     <motion.div
//       initial="hidden" whileInView="show" viewport={{ once: true }}
//       variants={stagger}
//       className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
//     >
//       <motion.div variants={fadeUp}>
//         <Eyebrow text="Hand-Picked Listings" />
//         <h2 className="text-[28px] sm:text-[34px] font-black text-zinc-900 dark:text-white leading-tight tracking-tight flex items-center gap-3">
//           <span className="h-10 w-10 flex items-center justify-center rounded-sm bg-orange-50 dark:bg-orange-500/10 ring-1 ring-orange-500/20">
//             <Star className="h-5 w-5 fill-[#fd5000] text-[#fd5000]" />
//           </span>
//           Recommended Picks
//         </h2>
//         <p className="mt-2 text-[14px] font-bold text-zinc-400 dark:text-text-muted">Curated from verified suppliers — updated as inventory changes.</p>
//       </motion.div>
//       <motion.div variants={fadeUp}>
//         <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}>
//           <Link
//             href="/marketplace"
//             className="inline-flex items-center gap-2 px-5 py-3 rounded-sm text-[13px] font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:text-white transition-all border border-border bg-surface shadow-none hover:bg-stone-50 dark:hover:bg-stone-900"
//           >
//             Browse all <ChevronRight className="h-4 w-4" />
//           </Link>
//         </motion.div>
//       </motion.div>
//     </motion.div>
//   );
// }

// // ── CATEGORY SIDEBAR ──────────────────────────────────────────
// interface SidebarCat { icon: React.ReactNode; label: string; slug: string; }

// export function CategorySidebar({ cats }: { cats: SidebarCat[] }) {
//   return (
//     <motion.div
//       initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
//       viewport={{ once: true }} transition={{ type: "spring", damping: 28, stiffness: 160, delay: 0.2 }}
//       className="rounded-sm overflow-hidden sticky top-[calc(var(--navbar-height)+1rem)] bg-surface border border-border shadow-none"
//     >
//       <div className="px-5 py-4 border-b border-border">
//         <Eyebrow text="Browse by Category" />
//       </div>
//       <div className="p-3">
//         {cats.slice(0, 8).map((cat, idx) => (
//           <motion.div key={idx} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
//             <Link href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}
//               className="flex items-center gap-3 px-3 py-3 rounded-sm hover:bg-stone-50 dark:hover:bg-stone-900 transition-all group">
//               <div className="h-9 w-9 rounded-sm bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 flex items-center justify-center group-hover:bg-[#fd5000] group-hover:border-[#fd5000] transition-colors">
//                 <span className="text-[#fd5000] group-hover:text-white transition-colors">{cat.icon}</span>
//               </div>
//               <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-white flex-1">{cat.label}</span>
//               <ChevronRight className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600" />
//             </Link>
//           </motion.div>
//         ))}
//       </div>
//       <div className="px-4 pb-4">
//         <Link href="/marketplace" className="block w-full text-center py-2.5 rounded-sm text-[12px] font-bold text-orange-600 border border-orange-200 hover:bg-orange-50 transition-all">
//           View All Categories →
//         </Link>
//       </div>
//     </motion.div>
//   );
// }

// // ── FLASH DEALS ───────────────────────────────────────────────
// export function FlashDeals({ products }: { products: any[] }) {
//   return (
//     <motion.div
//       initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
//       variants={stagger}
//       className="rounded-sm overflow-hidden relative bg-surface border border-border shadow-none"
//     >
//       <div className="absolute top-0 right-0 p-4">
//         <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-sm border border-orange-100">
//           <span className="h-2 w-2 rounded-sm bg-orange-500" />
//           <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">High Demand</span>
//         </div>
//       </div>

//       <div className="px-6 py-6 border-b border-border flex items-center gap-4">
//         <div className="h-12 w-12 rounded-sm bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 flex items-center justify-center">
//           <Zap className="h-6 w-6 text-[#fd5000] fill-[#fd5000]" />
//         </div>
//         <div>
//           <p className="text-[10px] font-black text-zinc-400 dark:text-text-muted uppercase tracking-[0.25em] mb-1">Live · Refreshed daily</p>
//           <h3 className="text-[22px] font-black text-zinc-900 dark:text-white leading-tight tracking-tight">Flash Trade Deals</h3>
//         </div>
//       </div>

//       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 p-6">
//         {products.slice(0, 5).map((p, i) => {
//           const dealPct = stableDiscountPercent(p.id);
//           const heat = Math.min(94, 65 + (dealPct % 30));
//           const img = p.images?.[0] || null;

//           return (
//             <motion.div key={p.id} variants={scaleIn}>
//               <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}>
//                 <Link href={`/marketplace/${p.slug}`} className="group block rounded-sm p-3 bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all border border-border">
//                   <div className="aspect-square bg-white dark:bg-surface-secondary rounded-sm mb-4 flex items-center justify-center relative overflow-hidden border border-border shadow-none">
//                     {img ? (
//                       <img
//                         src={img}
//                         alt={p.name}
//                         className="h-full w-full object-cover"
//                       />
//                     ) : (
//                       <Package className="h-8 w-8 text-stone-300" />
//                     )}

//                     <div className="absolute top-2 right-2 bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-none">
//                       -{dealPct}%
//                     </div>
//                   </div>

//                   <div className="space-y-2 px-1">
//                     <h4 className="text-[13px] font-black text-zinc-800 dark:text-white line-clamp-1 group-hover:text-[#fd5000] transition-colors uppercase tracking-tight">
//                       {p.name || "Refined Goods"}
//                     </h4>

//                     <div className="flex items-baseline gap-1.5">
//                       <span className="text-[16px] font-black text-zinc-950 dark:text-white tracking-tighter">
//                         {formatDisplayMoney(Number(p.price), (p as any).currency ?? "RWF")}
//                       </span>
//                     </div>

//                     <div className="pt-2">
//                       <div className="flex justify-between items-center mb-1.5">
//                         <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">{heat}% Sold</span>
//                         {heat > 80 && <span className="text-[9px] font-black text-orange-500 animate-pulse uppercase">Hot</span>}
//                       </div>
//                       <div className="w-full h-2 bg-zinc-100 dark:bg-surface-secondary rounded-sm overflow-hidden border border-zinc-50 dark:border-border-strong shadow-inner">
//                         <motion.div
//                           initial={{ width: 0 }}
//                           whileInView={{ width: `${heat}%` }}
//                           transition={{ duration: 1, delay: 0.2 }}
//                           className="h-full bg-gradient-to-r from-orange-400 via-[#fd5000] to-orange-600 rounded-sm shadow-[0_0_8px_rgba(253,80,0,0.4)]"
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 </Link>
//               </motion.div>
//             </motion.div>
//           );
//         })}
//       </div>
//     </motion.div>
//   );
// }

// // ── TRENDING SIDE PANEL ───────────────────────────────────────
// interface TrendingCat { name: string; slug: string; product_count?: number; }
// interface Supplier { business_name?: string; business_slug?: string; rating?: number; }

// export function TrendingSidePanel({ trendingCats, suppliers }: { trendingCats: TrendingCat[]; suppliers: Supplier[] }) {
//   return (
//     <motion.div
//       initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
//       viewport={{ once: true }} transition={{ type: "spring", damping: 28, stiffness: 160 }}
//       className="hidden lg:flex flex-col gap-4"
//     >
//       {/* Trending Now */}
//       <div className="rounded-sm p-6 relative overflow-hidden bg-stone-900 border border-stone-800">
//         <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Hot This Week</p>
//         <h3 className="text-[18px] font-bold text-white mb-5 tracking-tight">Trending Now</h3>
//         <div className="space-y-2">
//           {trendingCats.map((item) => (
//             <motion.div key={item.slug} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
//               <Link href={`/marketplace?cat=${encodeURIComponent(item.slug)}`}
//                 className="flex items-center gap-3 bg-white/5 rounded-sm px-4 py-3 hover:bg-white/10 border border-white/10 transition-all group">
//                 <span className="text-[13px] font-semibold text-stone-300 flex-1">{item.name}</span>
//                 <span className="text-[10px] text-stone-500 font-bold">{item.product_count != null && item.product_count > 0 ? `${item.product_count}` : "→"}</span>
//               </Link>
//             </motion.div>
//           ))}
//         </div>
//       </div>

//       {/* Top Suppliers */}
//       <div className="rounded-sm p-5 bg-surface border border-border shadow-none">
//         <Eyebrow text="Top Suppliers" />
//         <div className="space-y-3 mt-3">
//           {suppliers.length === 0 ? (
//             <p className="text-[11px] font-bold text-zinc-400">Suppliers appear as stores join.</p>
//           ) : (
//             suppliers.map((v) => (
//               <motion.div key={v.business_slug ?? v.business_name} whileHover={{ x: 3 }}>
//                 <Link href={v.business_slug ? `/vendors/${v.business_slug}` : "/vendors"} className="flex items-center gap-3 group">
//                   <div className="h-9 w-9 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-[#fd5000] text-[12px] font-black group-hover:bg-[#fd5000] group-hover:text-white transition-colors">
//                     {(v.business_name ?? "?")[0]}
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <p className="text-[13px] font-black text-zinc-800 dark:text-stone-300 truncate group-hover:text-[#fd5000] transition-colors">{v.business_name}</p>
//                     <p className="text-[10px] flex items-center gap-x-2 font-bold text-zinc-400 dark:text-text-muted">
//                       <Star className="h-4 w-4 fill-[#fd5000] text-[#fd5000]" /> 
//                       {Number(v.rating ?? 0).toFixed(1) || "N/A"} · Active</p>
//                   </div>
//                 </Link>
//               </motion.div>
//             ))
//           )}
//         </div>
//       </div>
//     </motion.div>
//   );
// }

// // ── INDUSTRIES SECTION ────────────────────────────────────────
// interface Industry { name: string; slug: string; product_count?: number; image_url?: string | null; }
// function pickIcon(slug: string, name: string): LucideIcon {
//   const s = `${slug} ${name}`.toLowerCase();
//   if (s.includes("elect")) return Zap;
//   if (s.includes("fashion") || s.includes("apparel")) return Menu;
//   if (s.includes("machin")) return Menu;
//   if (s.includes("agri")) return Globe;
//   if (s.includes("health")) return ShieldCheck;
//   return Package;
// }

// export function IndustriesSection({ industries }: { industries: Industry[] }) {
//   return (
//     <motion.section
//       initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
//       variants={stagger}
//       className="rounded-sm p-8 sm:p-12 relative overflow-hidden bg-surface border border-border shadow-none"
//     >
//       <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 relative z-10">
//         <div>
//           <Eyebrow text="Browse by Sector" />
//           <h2 className="text-[28px] sm:text-[34px] font-bold text-stone-900 dark:text-white tracking-tight leading-tight flex items-center gap-3">
//             <span className="h-10 w-10 flex items-center justify-center rounded-sm bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20">
//               <Menu className="h-5 w-5 text-orange-500" />
//             </span>
//             Global Industries
//           </h2>
//         </div>
//         <motion.div whileHover={{ x: 4 }}>
//           <Link href="/marketplace" className="inline-flex items-center gap-2 text-[12px] font-black text-[#fd5000] uppercase tracking-[0.15em] hover:gap-3 transition-all">
//             All Sections <ChevronRight className="h-4 w-4" />
//           </Link>
//         </motion.div>
//       </motion.div>

//       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">
//         {industries.map((cat, i) => {
//           const Icon = pickIcon(cat.slug, cat.name);
//           const img = industryCardBackground(cat.slug, cat.image_url ?? null);
//           const grad = INDUSTRY_GRADIENTS[i % INDUSTRY_GRADIENTS.length];
//           const countLabel = cat.product_count != null && cat.product_count > 0
//             ? `${cat.product_count >= 1000 ? `${Math.round(cat.product_count / 1000)}k+` : `${cat.product_count}+`} listings`
//             : "Explore";
//           return (
//             <motion.div key={cat.slug} variants={scaleIn}>
//               <Link href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}
//                 className="relative h-[180px] rounded-sm overflow-hidden block border border-border shadow-none hover:shadow-none transition-shadow">
//                 <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${img}')` }} />
//                 <div className={cn("absolute inset-0", grad)} />
//                 <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center z-10">
//                   <div className="h-10 w-10 rounded-sm bg-white/20 border border-white/30 flex items-center justify-center mb-2.5 text-white">
//                     <Icon className="h-5 w-5" />
//                   </div>
//                   <h4 className="text-[14px] font-bold text-white mb-0.5">{cat.name}</h4>
//                   <p className="text-[10px] text-white/70 font-semibold uppercase tracking-widest">{countLabel}</p>
//                 </div>
//               </Link>
//             </motion.div>
//           );
//         })}
//       </div>
//     </motion.section>
//   );
// }

// // ── AFFILIATE PANEL ───────────────────────────────────────────
// interface AffiliatePanelProps {
//   valueProps: string[];
//   campaigns?: string[];
//   spotlightCreator?: { full_name?: string; total_earnings?: number; total_clicks?: number; total_conversions?: number } | null;
//   trendingCats: { name: string }[];
// }

// export function AffiliatePanel({ valueProps, campaigns = [], spotlightCreator, trendingCats }: AffiliatePanelProps) {
//   const chips = campaigns.length > 0 ? campaigns : trendingCats.map((c) => c.name);
//   return (
//     <motion.section
//       initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
//       variants={stagger}
//       className="rounded-sm overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-[460px] relative bg-surface border border-border shadow-none"
//     >

//       {/* Left */}
//       <motion.div variants={fadeUp} className="p-8 md:p-14 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/10 relative z-10">
//         <span className="inline-block w-fit px-4 py-1.5 rounded-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-none">
//           Partner with Jimvio
//         </span>
//         <h3 className="text-[32px] md:text-[40px] font-black text-zinc-950 dark:text-white leading-tight mb-6 tracking-tight">
//           Turn Your Network<br />Into Global Trade
//         </h3>
//         <p className="text-[15px] text-zinc-600 dark:text-white/50 font-bold leading-relaxed mb-8 max-w-md">
//           Earn high-ticket commissions on every bulk deal referred through our creator-friendly B2B ecosystem.
//         </p>
//         <div className="space-y-3 mb-10">
//           {valueProps.map((t) => (
//             <motion.div key={t} whileHover={{ x: 5 }} className="flex items-center gap-3 text-[14px] font-bold text-zinc-900 dark:text-white/70">
//               <div className="h-6 w-6 rounded-sm bg-[#fd5000]/20 text-[#fd5000] flex items-center justify-center text-[11px] font-black border border-[#fd5000]/30 shrink-0">✓</div>
//               {t}
//             </motion.div>
//           ))}
//         </div>
//         <div className="flex flex-col sm:flex-row gap-3">
//           <Button className="h-11 px-8 rounded-sm bg-stone-900 dark:bg-white text-white dark:text-stone-950 font-bold text-[14px] hover:bg-stone-800 shadow-none" asChild>
//             <Link href="/register?role=affiliate">Start Earning →</Link>
//           </Button>
//           <Button variant="outline" className="h-11 px-8 rounded-sm border-border text-stone-900 dark:text-white font-bold text-[14px] hover:bg-stone-50 dark:hover:bg-stone-900" asChild>
//             <Link href="/dashboard">Creator Hub →</Link>
//           </Button>
//         </div>
//       </motion.div>

//       {/* Right */}
//       <motion.div variants={fadeUp} className="p-8 md:p-14 flex flex-col justify-center relative z-10">
//         {chips.length > 0 && (
//           <div className="mb-10">
//             <h3 className="text-[22px] font-black text-zinc-950 dark:text-white mb-2 tracking-tight">Active Categories</h3>
//             <p className="text-[13px] text-zinc-500 dark:text-white/40 font-bold mb-6">Bridging manufacturers and authentic voices.</p>
//             <div className="flex flex-wrap gap-2.5">
//               {chips.map((t, i) => (
//                 <motion.span key={`${t}-${i}`} whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.97 }}
//                   className={cn(
//                     "px-4 py-2.5 rounded-sm text-[11px] font-black border capitalize tracking-[0.12em] cursor-default transition-all shadow-none",
//                     i === 0
//                       ? "bg-orange-500 text-white border-orange-500 shadow-orange-500/20"
//                       : "bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-white border-black/5 dark:border-white/10 hover:border-orange-500/40 hover:text-orange-500"
//                   )}>
//                   {t}
//                 </motion.span>
//               ))}
//             </div>
//           </div>
//         )}
//         {/* Creator spotlight */}
//         <div className="bg-stone-50 dark:bg-stone-900 border border-border rounded-sm p-5 flex items-center gap-4 mb-8 border-l-4 border-l-orange-500">
//           {spotlightCreator ? (
//             <>
//               <Avatar className="h-12 w-12 border-2 border-black/5 dark:border-white/15 shrink-0">
//                 <AvatarFallback className="bg-[#f97316] text-white font-black text-[16px]">
//                   {(spotlightCreator.full_name ?? "C")[0]}
//                 </AvatarFallback>
//               </Avatar>
//               <div className="flex-1 min-w-0">
//                 <p className="text-[15px] font-black text-zinc-950 dark:text-white truncate">{spotlightCreator.full_name ?? "Top creator"}</p>
//                 <p className="text-[11px] text-zinc-500 dark:text-white/40 font-black uppercase tracking-[0.1em]">{Number(spotlightCreator.total_conversions ?? 0).toLocaleString()} conversions</p>
//               </div>
//               <div className="text-right shrink-0">
//                 <div className="text-[18px] font-black text-[#fd5000]">{formatDisplayMoney(Number(spotlightCreator.total_earnings ?? 0), "RWF")}</div>
//                 <p className="text-[9px] text-zinc-400 dark:text-white/30 font-black uppercase tracking-[0.15em]">Earnings</p>
//               </div>
//             </>
//           ) : (
//             <p className="text-sm text-zinc-900 dark:text-white/40 font-bold w-full text-center py-2">Be the first top earner — share products you love.</p>
//           )}
//         </div>
//         <Button className="w-full h-11 rounded-sm bg-[#fd5000] hover:bg-orange-600 text-white font-bold text-[14px] shadow-none" asChild>
//           <Link href="/dashboard">Access Dashboard →</Link>
//         </Button>
//       </motion.div>
//     </motion.section>
//   );
// }

// // ── MARKET INTELLIGENCE ───────────────────────────────────────
// interface MarketCategory { name: string; product_count?: number; }

// export function MarketIntelligence({
//   categories, trending,
// }: {
//   categories: MarketCategory[];
//   trending: any[];
// }) {
//   return (
//     <motion.div
//       initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
//       variants={stagger}
//       className="grid grid-cols-1 gap-6 lg:grid-cols-2"
//     >
//       {/* Market Pulse */}
//       <motion.div variants={fadeUp} className="rounded-sm p-7 relative overflow-hidden bg-surface border border-border shadow-none">
//         <div className="absolute left-0 top-0 h-full w-1 rounded-sm-sm bg-orange-500" />
//         <h4 className="mb-6 flex items-center gap-3 text-[20px] font-bold text-stone-900 dark:text-white tracking-tight pl-3">
//           <span className="h-9 w-9 flex items-center justify-center rounded-sm bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20"><BarChart2 className="h-5 w-5 text-orange-500" /></span>
//           Market Pulse
//         </h4>
//         <div className="space-y-5 pl-3">
//           {(categories.length > 0 ? categories.slice(0, 4) : [
//             { name: "Electronics", product_count: 80 }, { name: "Machinery", product_count: 35 },
//             { name: "Textiles", product_count: 65 }, { name: "Health", product_count: 90 },
//           ]).map((cat, i) => (
//             <motion.div key={i} whileHover={{ x: 4 }} className="flex items-center gap-4 group">
//               <div className="flex-1">
//                 <div className="flex justify-between items-center mb-2">
//                   <span className="text-[13px] font-black text-zinc-800 dark:text-stone-300 group-hover:text-[#f97316] transition-colors">{cat.name} Market</span>
//                   <span className="text-[11px] font-black px-2 py-0.5 rounded-sm bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-600">↑ {8 + i}%</span>
//                 </div>
//                 <div className="h-2 w-full bg-zinc-100 dark:bg-surface-secondary rounded-sm overflow-hidden">
//                   <motion.div
//                     initial={{ width: 0 }} whileInView={{ width: `${60 + (i * 10)}%` }}
//                     viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.15, ease: "easeOut" }}
//                     className="h-full rounded-sm bg-gradient-to-r from-[#fd5000] to-orange-400"
//                   />
//                 </div>
//               </div>
//             </motion.div>
//           ))}
//         </div>
//       </motion.div>

//       {/* Hot Sourcing */}
//       <motion.div variants={fadeUp} className="rounded-sm p-7 relative overflow-hidden bg-surface border border-border shadow-none">
//         <div className="mb-5 flex items-center justify-between">
//           <h4 className="flex items-center gap-2.5 text-[20px] font-bold text-stone-900 dark:text-white tracking-tight">
//             <span className="h-9 w-9 flex items-center justify-center rounded-sm bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20"><TrendingUp className="h-5 w-5 text-orange-500" /></span>
//             Hot Sourcing
//           </h4>
//           <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">Live</span>
//         </div>
//         <div className="flex flex-wrap gap-2 mb-5">
//           {categories.slice(0, 8).map((cat: any) => (
//             <Link key={cat.id} href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}>
//               <span className="inline-flex cursor-pointer rounded-sm border border-border bg-stone-50 dark:bg-stone-900 px-3 py-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-400 hover:border-orange-300 hover:text-orange-600 transition-all">
//                 {cat.name}
//               </span>
//             </Link>
//           ))}
//         </div>
//         <div className="flex flex-col gap-2">
//           {trending.slice(0, 3).map((prod: any, i: number) => (
//             <Link key={prod.id ?? i} href={`/marketplace/${prod.slug}`} className="group block">
//               <div className="flex gap-3 rounded-sm border border-border bg-stone-50 dark:bg-stone-900 p-3 hover:border-orange-200 hover:bg-orange-50/50 dark:hover:bg-stone-800 transition-all">
//                 <div className="h-12 w-12 shrink-0 rounded-sm bg-white dark:bg-white/5 flex items-center justify-center overflow-hidden border border-border">
//                   {prod.images?.[0] ? <img src={prod.images[0]} className="h-full w-full object-cover" alt="" /> : <Package className="h-5 w-5 text-stone-300" />}
//                 </div>
//                 <div className="min-w-0 flex-1">
//                   <h5 className="line-clamp-1 text-[12px] font-semibold text-stone-800 dark:text-stone-200 group-hover:text-orange-600 transition-colors">{prod.name}</h5>
//                   <p className="text-[10px] text-stone-400 font-medium mt-0.5">{formatDisplayMoney(Number(prod.price ?? 0), (prod as any).currency ?? "RWF")}</p>
//                 </div>
//                 <span className="shrink-0 self-center rounded bg-orange-500 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">Live</span>
//               </div>
//             </Link>
//           ))}
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }

// // ── HOW IT WORKS ──────────────────────────────────────────────
// export function HowItWorks() {
//   const steps = [
//     { icon: <UserPlus className="h-5 w-5" />, title: "Digital ID", desc: "One unified account for vendors, buyers, and creators." },
//     { icon: <ArrowRight className="h-5 w-5" />, title: "AI Search", desc: "Find verified partners in seconds using our neural matching." },
//     { icon: <Search className="h-5 w-5" />, title: "Smart Contracts", desc: "Automated agreements and secure multi-currency escrow." },
//     { icon: <ShieldCheck className="h-5 w-5" />, title: "Global Sync", desc: "Real-time tracking and logistics integration across 180 countries." },
//   ];
//   return (
//     <div
//       className="relative overflow-hidden py-16 md:py-24 bg-stone-50 dark:bg-stone-900 border-y border-border"
//     >
//       <div className="max-w-[1536px] mx-auto px-4 sm:px-6">
//         <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
//           <motion.div variants={fadeUp} className="text-center mb-12">
//             <Eyebrow text="How it works" />
//             <h2 className="text-[30px] sm:text-[38px] font-bold text-stone-900 dark:text-white tracking-tight">The Jimvio Protocol</h2>
//             <p className="mt-3 text-[15px] font-bold text-zinc-400 dark:text-text-muted max-w-md mx-auto">Simplifying global trade for the modern era</p>
//           </motion.div>
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//             {steps.map((s, idx) => (
//               <motion.div key={idx} variants={scaleIn}>
//                 <div className="rounded-sm px-5 py-6 bg-surface border border-border shadow-none group cursor-default hover:border-orange-200 transition-colors">
//                   <div className="h-11 w-11 flex items-center justify-center rounded-sm bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-orange-500 mb-4 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-colors">
//                     {s.icon}
//                   </div>
//                   <h4 className="text-[15px] font-semibold text-stone-900 dark:text-white mb-1.5">{s.title}</h4>
//                   <p className="text-[12px] text-stone-400 dark:text-stone-500 leading-relaxed">{s.desc}</p>
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//           <motion.div variants={fadeUp} className="mt-10 text-center">
//             <Button
//               variant="orange"
//               className="h-11 rounded-sm px-10 text-[13px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-none"
//               asChild
//             >
//               <Link href="/marketplace">Initialize Trade Access →</Link>
//             </Button>
//           </motion.div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }

// // ── APP PROMO ─────────────────────────────────────────────────
// export function AppPromo() {
//   return (
//     <div className="relative overflow-hidden py-20 md:py-28 bg-stone-900 border-t border-stone-800">
//       <motion.div
//         initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
//         variants={stagger}
//         className="max-w-[1536px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-16 relative z-10"
//       >
//         <motion.div variants={fadeUp} className="flex-1 max-w-[580px]">
//           <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400 mb-5">Mobile Ecosystem</p>
//           <h3 className="text-[36px] sm:text-[48px] font-bold text-white mb-6 leading-tight tracking-tight">Trade Anywhere.<br />Global Mastery.</h3>
//           <p className="text-[15px] text-stone-400 font-medium leading-relaxed mb-10 max-w-[500px]">
//             The Jimvio mobile app integrates every facet of the creator-commerce ecosystem into a single high-performance interface.
//           </p>
//           <div className="flex flex-wrap gap-4">
//             {[
//               { name: "App Store", sub: "Available on", icon: <Lock className="h-5 w-5" /> },
//               { name: "Google Play", sub: "Get it on", icon: <PlayCircle className="h-5 w-5" /> },
//             ].map(btn => (
//               <div key={btn.name} className="flex items-center gap-4 px-6 py-3.5 rounded-sm cursor-pointer transition-all group border border-stone-700 bg-stone-800 hover:border-stone-600 shadow-none">
//                 <div className="text-stone-400 group-hover:text-orange-400 transition-colors shrink-0">{btn.icon}</div>
//                 <div className="min-w-0">
//                   <div className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em]">{btn.sub}</div>
//                   <div className="text-[16px] font-bold tracking-tight text-white leading-none mt-1">{btn.name}</div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </motion.div>

//         <motion.div variants={scaleIn} className="text-center">
//           <div className="h-36 w-36 rounded-sm flex items-center justify-center mx-auto border border-stone-700 bg-stone-800">
//             <div className="h-16 w-16 bg-orange-500 rounded-sm flex items-center justify-center">
//               <Zap className="h-8 w-8 text-white fill-white stroke-none" />
//             </div>
//           </div>
//           <p className="text-[11px] text-stone-500 font-bold uppercase tracking-[0.2em] mt-4">Scan to download</p>
//         </motion.div>
//       </motion.div>
//     </div>
//   );
// }

"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight, Star, ShieldCheck, CheckCircle, Ship, Globe,
  DollarSign, Package, Zap, Menu, BarChart2, TrendingUp,
  UserPlus, ArrowRight, Search, Lock, PlayCircle,
} from "lucide-react";
import { cn, formatDisplayMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { stableDiscountPercent, industryCardBackground, INDUSTRY_GRADIENTS } from "@/lib/homepage-helpers";

type LucideIcon = React.FC<React.SVGProps<SVGSVGElement>>;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};
const stagger = {
  show: { transition: { staggerChildren: 0.07 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1, scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Shared primitives ───────────────────────────────────────── */

/** Ruled eyebrow label — uses a leading tick mark instead of generic uppercase */
function Eyebrow({ text }: { text: string }) {
  return (
    <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
      <span className="inline-block w-4 h-px bg-[#fd5000] flex-shrink-0" />
      {text}
    </p>
  );
}

/** Hard ruled divider — used between sections instead of space alone */
function Rule({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

/** Orange accent dot — replaces animated blobs */
function AccentDot({ className }: { className?: string }) {
  return <span className={cn("inline-block w-1.5 h-1.5 rounded-full bg-[#fd5000] flex-shrink-0", className)} />;
}

/* ─── TRUST BAR ───────────────────────────────────────────────── */
interface TrustBarItem { title: string; desc: string; }
const TRUST_ICONS: LucideIcon[] = [ShieldCheck, CheckCircle, Ship, DollarSign, Globe];

export function TrustBar({ items }: { items: TrustBarItem[] }) {
  return (
    <motion.div
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      variants={stagger}
      className="relative z-10 bg-background border-y border-border"
    >
      {/* Ticker-style inner rule */}
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {items.map((item, idx) => {
            const Icon = TRUST_ICONS[idx % TRUST_ICONS.length];
            return (
              <motion.div
                key={idx}
                variants={fadeUp}
                className="flex items-center gap-3 py-4 px-5 first:pl-0 last:pr-0 group"
              >
                <div className="shrink-0 w-8 h-8 flex items-center justify-center border border-[#fd5000]/30 bg-[#fd5000]/5 text-[#fd5000] transition-colors group-hover:bg-[#fd5000] group-hover:border-[#fd5000] group-hover:text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground tracking-tight leading-tight truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── RECOMMENDED PICKS HEADER ────────────────────────────────── */
export function RecommendedHeader() {
  return (
    <motion.div
      initial="hidden" whileInView="show" viewport={{ once: true }}
      variants={stagger}
      className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
    >
      <motion.div variants={fadeUp}>
        <Eyebrow text="Hand-Picked Listings" />
        <h2 className="text-[28px] sm:text-[34px] font-black text-foreground leading-tight tracking-tight flex items-center gap-3">
          <span className="inline-flex rounded-sm items-center justify-center w-9 h-9 border border-[#fd5000]/30 bg-[#fd5000]/5">
            <Star className="h-4 w-4 fill-[#fd5000] text-[#fd5000]" />
          </span>
          Recommended Picks
        </h2>
        <p className="mt-2 text-[14px] font-medium text-muted-foreground">
          Curated from verified suppliers — updated as inventory changes.
        </p>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Link
          href="/marketplace"
          className="inline-flex rounded-sm items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-foreground/30 bg-background"
        >
          Browse all <ChevronRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ─── CATEGORY SIDEBAR ────────────────────────────────────────── */
interface SidebarCat { icon: React.ReactNode; label: string; slug: string; }

export function CategorySidebar({ cats }: { cats: SidebarCat[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="sticky top-[calc(var(--navbar-height)+1rem)] bg-background border border-border overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <Eyebrow text="Browse by Category" />
      </div>

      <div className="divide-y divide-border/60">
        {cats.slice(0, 8).map((cat, idx) => (
          <Link
            key={idx}
            href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors group"
          >
            <div className="w-7 h-7 flex items-center justify-center border border-border text-muted-foreground group-hover:border-[#fd5000]/40 group-hover:text-[#fd5000] transition-colors flex-shrink-0">
              {cat.icon}
            </div>
            <span className="text-[13px] font-semibold text-foreground/80 group-hover:text-foreground flex-1 transition-colors">{cat.label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <Link
          href="/marketplace"
          className="block w-full text-center py-2.5 text-[12px] font-semibold text-[#fd5000] border border-[#fd5000]/30 hover:bg-[#fd5000] hover:text-white transition-all"
        >
          View All Categories
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── FLASH DEALS ─────────────────────────────────────────────── */
export function FlashDeals({ products }: { products: any[] }) {
  return (
    <motion.div
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="bg-background border border-border overflow-hidden rounded-xl"
    >
      {/* Header row — ruled, no card shadows */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between ">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#fd5000] rounded-full flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-white fill-white stroke-none" />
          </div>
          <div>
            <h3 className="text-[18px] font-black text-foreground leading-tight tracking-tight">Flash Trade Deals</h3>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live · Refreshed daily</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded px-3 py-1 border border-[#fd5000]/30 bg-[#fd5000]/5">
          <AccentDot className="animate-pulse" />
          <span className="text-[10px] font-bold text-[#fd5000] uppercase tracking-wider">High Demand</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-border">
        {products.slice(0, 5).map((p, i) => {
          const dealPct = stableDiscountPercent(p.id);
          const heat = Math.min(94, 65 + (dealPct % 30));
          const img = p.images?.[0] || null;

          return (
            <motion.div key={p.id} variants={scaleIn} className="group">
              <Link
                href={`/marketplace/${p.slug}`}
                className="block p-4 hover:bg-muted/30 transition-colors border-t border-border md:border-t-0 relative"
              >
                {/* Discount badge — top-left corner, not floating */}
                <div className="absolute rounded-br top-0 left-0 bg-[#fd5000] text-white text-[10px] font-bold px-2 py-0.5 leading-none">
                  -{dealPct}%
                </div>

                {/* Product image */}
                <div className="aspect-square bg-muted flex items-center justify-center mb-3 mt-4 overflow-hidden border border-border/50">
                  {img
                    ? <img src={img} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <Package className="h-8 w-8 text-muted-foreground/30" />
                  }
                </div>

                {/* Product info */}
                <h4 className="text-[13px] font-bold text-foreground line-clamp-1 group-hover:text-[#fd5000] transition-colors tracking-tight mb-1">
                  {p.name || "Refined Goods"}
                </h4>
                <div className="text-[16px] font-black text-foreground tracking-tighter mb-3">
                  {formatDisplayMoney(Number(p.price), (p as any).currency ?? "RWF")}
                </div>

                {/* Heat bar */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-[#fd5000] uppercase tracking-widest">{heat}% Sold</span>
                    {heat > 80 && (
                      <span className="text-[9px] font-bold text-[#fd5000]">HOT</span>
                    )}
                  </div>
                  <div className="w-full h-1 bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${heat}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                      className="h-full bg-[#fd5000]"
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── TRENDING SIDE PANEL ─────────────────────────────────────── */
interface TrendingCat { name: string; slug: string; product_count?: number; }
interface Supplier { business_name?: string; business_slug?: string; rating?: number; }

export function TrendingSidePanel({
  trendingCats, suppliers,
}: { trendingCats: TrendingCat[]; suppliers: Supplier[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="hidden lg:flex flex-col gap-4 "
    >
      {/* Trending Now — dark panel */}
      <div className="bg-stone-900 dark:bg-stone-950 border border-stone-800 overflow-hidden rounded-lg">
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em] mb-0.5">Hot This Week</p>
            <h3 className="text-[16px] font-bold text-white tracking-tight leading-none">Trending Now</h3>
          </div>
          <AccentDot className="animate-pulse" />
        </div>
        <div className="divide-y divide-stone-800">
          {trendingCats.map((item, i) => (
            <Link
              key={item.slug}
              href={`/marketplace?cat=${encodeURIComponent(item.slug)}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-stone-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-stone-600 tabular-nums w-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] font-semibold text-stone-300 group-hover:text-white transition-colors">{item.name}</span>
              </div>
              <span className="text-[10px] text-stone-600 font-bold tabular-nums">
                {item.product_count != null && item.product_count > 0 ? item.product_count : "—"}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Suppliers */}
      <div className="bg-background border border-border overflow-hidden rounded-lg">
        <div className="px-5 py-3.5 border-b border-border">
          <Eyebrow text="Top Suppliers" />
        </div>
        <div className="divide-y divide-border/60">
          {suppliers.length === 0 ? (
            <p className="text-[12px] text-muted-foreground px-5 py-4">Suppliers appear as stores join.</p>
          ) : (
            suppliers.map((v, i) => (
              <Link
                key={v.business_slug ?? i}
                href={v.business_slug ? `/vendors/${v.business_slug}` : "/vendors"}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
              >
                {/* Rank */}
                <span className="text-[11px] font-bold text-muted-foreground/40 tabular-nums w-5 flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* Initial avatar */}
                <div className="w-8 h-8 rounded-full bg-[#fd5000]/10 border border-[#fd5000]/20 text-[#fd5000] text-[12px] font-black flex items-center justify-center flex-shrink-0 group-hover:bg-[#fd5000] group-hover:text-white transition-colors">
                  {(v.business_name ?? "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-[#fd5000] transition-colors">{v.business_name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Star className="h-3 w-3 fill-[#fd5000] text-[#fd5000]" />
                    {Number(v.rating ?? 0).toFixed(1)} · Active
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── INDUSTRIES SECTION ──────────────────────────────────────── */
interface Industry { name: string; slug: string; product_count?: number; image_url?: string | null; }

function pickIcon(slug: string, name: string): LucideIcon {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes("elect")) return Zap;
  if (s.includes("fashion") || s.includes("apparel")) return Menu;
  if (s.includes("machin")) return Menu;
  if (s.includes("agri")) return Globe;
  if (s.includes("health")) return ShieldCheck;
  return Package;
}

export function IndustriesSection({ industries }: { industries: Industry[] }) {
  return (
    <motion.section
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="bg-background border border-border overflow-hidden rounded-xl"
    >
      {/* Section header */}
      <div className="px-8 py-5 border-b rounded-md border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div variants={fadeUp} className="rounded-md">
          <Eyebrow text="Browse by Sector" />
          <h2 className="text-[28px] sm:text-[34px] font-bold text-foreground tracking-tight leading-tight flex items-center gap-3">
            <span className="inline-flex rounded-sm items-center justify-center w-9 h-9 border border-border text-muted-foreground">
              <Menu className="h-4 w-4" />
            </span>
            Global Industries
          </h2>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#fd5000] uppercase tracking-[0.15em] hover:gap-3 transition-all">
            All Sections <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>

      {/* Industry grid — borderless inner cards, separated by grid lines */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-border">
        {industries.map((cat, i) => {
          const Icon = pickIcon(cat.slug, cat.name);
          const img = industryCardBackground(cat.slug, cat.image_url ?? null);
          const grad = INDUSTRY_GRADIENTS[i % INDUSTRY_GRADIENTS.length];
          const countLabel = cat.product_count != null && cat.product_count > 0
            ? cat.product_count >= 1000
              ? `${Math.round(cat.product_count / 1000)}k+`
              : `${cat.product_count}+`
            : "Explore";

          return (
            <motion.div key={cat.slug} variants={scaleIn}>
              <Link
                href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}
                className="relative h-[180px] overflow-hidden block group"
              >
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${img}')` }} />
                <div className={cn("absolute inset-0", grad)} />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-[#fd5000]/0 group-hover:bg-[#fd5000]/15 transition-colors duration-300" />
                <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center z-10">
                  <div className="w-9 h-9 border border-white/30 bg-black/20 flex items-center justify-center mb-2 group-hover:border-white/60 transition-colors">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-[14px] font-bold text-white leading-tight">{cat.name}</h4>
                  <p className="text-[10px] text-white/60 font-semibold uppercase tracking-widest mt-1">{countLabel}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ─── AFFILIATE PANEL ─────────────────────────────────────────── */
interface AffiliatePanelProps {
  valueProps: string[];
  campaigns?: string[];
  spotlightCreator?: {
    full_name?: string;
    total_earnings?: number;
    total_clicks?: number;
    total_conversions?: number;
  } | null;
  trendingCats: { name: string }[];
}

export function AffiliatePanel({
  valueProps, campaigns = [], spotlightCreator, trendingCats,
}: AffiliatePanelProps) {
  const chips = campaigns.length > 0 ? campaigns : trendingCats.map(c => c.name);

  return (
    <motion.section
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="border border-border overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-[460px] rounded-xl"
    >
      {/* Left — value prop */}
      <motion.div
        variants={fadeUp}
        className="p-8 md:p-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-border bg-background"
      >
        <span className="inline-block w-fit px-4 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-[0.2em] mb-6">
          Partner with Jimvio
        </span>
        <h3 className="text-[32px] md:text-[40px] font-black text-foreground leading-tight mb-6 tracking-tight">
          Turn Your Network<br />Into Global Trade
        </h3>
        <p className="text-[15px] text-muted-foreground font-medium leading-relaxed mb-8 max-w-md">
          Earn high-ticket commissions on every bulk deal referred through our creator-friendly B2B ecosystem.
        </p>

        {/* Value props list */}
        <div className="space-y-2.5 mb-10">
          {valueProps.map((t) => (
            <div key={t} className="flex items-center gap-3 text-[14px] font-medium text-foreground">
              <div className="w-5 h-5 flex items-center rounded justify-center bg-[#fd5000] text-white text-[10px] font-black flex-shrink-0">
                ✓
              </div>
              {t}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="h-11 px-8 bg-foreground text-background font-bold text-[14px] hover:opacity-85 transition-opacity border-0"
            asChild
          >
            <Link href="/register?role=affiliate">Start Earning →</Link>
          </Button>
          <Button
            variant="outline"
            className="h-11 px-8 border-border text-foreground font-bold text-[14px] hover:bg-muted/50"
            asChild
          >
            <Link href="/dashboard">Creator Hub →</Link>
          </Button>
        </div>
      </motion.div>

      {/* Right — chips + spotlight */}
      <motion.div
        variants={fadeUp}
        className="p-8 md:p-12 flex flex-col justify-center bg-stone-50 dark:bg-stone-900/50"
      >
        {chips.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[22px] font-black text-foreground mb-1 tracking-tight">Active Categories</h3>
            <p className="text-[13px] text-muted-foreground font-medium mb-5">Bridging manufacturers and authentic voices.</p>
            <div className="flex flex-wrap gap-2">
              {chips.map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className={cn(
                    "px-3 py-1.5 rounded text-[11px] font-bold border capitalize tracking-[0.08em]",
                    i === 0
                      ? "bg-[#fd5000] text-white border-[#fd5000]"
                      : "bg-background text-muted-foreground border-border hover:border-[#fd5000]/40 hover:text-[#fd5000] transition-colors cursor-default"
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Creator spotlight */}
        <div className="border border-border bg-background p-5 flex items-center gap-4 border-l-2 border-l-[#fd5000]">
          {spotlightCreator ? (
            <>
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarFallback className="bg-[#fd5000] text-white font-black text-[15px]">
                  {(spotlightCreator.full_name ?? "C")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-foreground truncate">{spotlightCreator.full_name ?? "Top creator"}</p>
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.1em]">
                  {Number(spotlightCreator.total_conversions ?? 0).toLocaleString()} conversions
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[18px] font-black text-[#fd5000]">
                  {formatDisplayMoney(Number(spotlightCreator.total_earnings ?? 0), "RWF")}
                </div>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.15em]">Earnings</p>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground w-full text-center py-2">
              Be the first top earner — share products you love.
            </p>
          )}
        </div>

        <Button
          className="w-full h-11 mt-6 bg-[#fd5000] hover:bg-orange-600 text-white font-bold text-[14px] border-0"
          asChild
        >
          <Link href="/dashboard">Access Dashboard →</Link>
        </Button>
      </motion.div>
    </motion.section>
  );
}

/* ─── MARKET INTELLIGENCE ─────────────────────────────────────── */
interface MarketCategory { name: string; product_count?: number; }

export function MarketIntelligence({
  categories, trending,
}: { categories: MarketCategory[]; trending: any[] }) {
  const displayCats = categories.length > 0
    ? categories.slice(0, 4)
    : [
      { name: "Electronics", product_count: 80 },
      { name: "Machinery", product_count: 35 },
      { name: "Textiles", product_count: 65 },
      { name: "Health", product_count: 90 },
    ];

  return (
    <motion.div
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="grid grid-cols-1 gap-px lg:grid-cols-2 border border-border bg-border rounded-xl"
    >
      {/* Market Pulse */}
      <motion.div variants={fadeUp} className="bg-background p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 flex items-center justify-center border border-border text-muted-foreground">
            <BarChart2 className="h-4 w-4" />
          </div>
          <h4 className="text-[20px] font-bold text-foreground tracking-tight">Market Pulse</h4>
        </div>

        {/* Ruled separator */}
        <Rule className="mb-6" />

        <div className="space-y-5">
          {displayCats.map((cat, i) => (
            <div key={i} className="space-y-2 group">
              <div className="flex justify-between items-baseline">
                <span className="text-[13px] font-semibold rounded-r text-foreground group-hover:text-[#fd5000] transition-colors">
                  {cat.name}
                </span>
                <span className="text-[11px] font-bold text-emerald-500 tabular-nums">↑ {8 + i}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${60 + i * 10}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.12, ease: "easeOut" }}
                  className="h-full bg-[#fd5000] rounded-md"
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Hot Sourcing */}
      <motion.div variants={fadeUp} className="bg-background p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center border border-border text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h4 className="text-[20px] font-bold text-foreground tracking-tight">Hot Sourcing</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <AccentDot className="animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Live</span>
          </div>
        </div>

        <Rule className="mb-5" />

        {/* Category tags — flat, not pill-shaped */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {categories.slice(0, 8).map((cat: any) => (
            <Link key={cat.id} href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}>
              <span className="inline-flex cursor-pointer rounded border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:border-[#fd5000]/40 hover:text-[#fd5000] hover:bg-[#fd5000]/5 transition-all">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>

        {/* Trending products — ruled list */}
        <div className="divide-y divide-border">
          {trending.slice(0, 3).map((prod: any, i: number) => (
            <Link key={prod.id ?? i} href={`/marketplace/${prod.slug}`} className="group flex gap-3 py-3 first:pt-0 last:pb-0 items-center">
              <div className="w-11 h-11 items-center justify-center flex-shrink-0 bg-muted border rounded-md border-border overflow-hidden">
                {prod.images?.[0]
                  ? <img src={prod.images[0]} className="h-full w-full object-cover" alt="" />
                  : <Package className="h-4 w-4 text-muted-foreground/40 m-auto" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-[12px] font-semibold text-foreground line-clamp-1 group-hover:text-[#fd5000] transition-colors">{prod.name}</h5>
                <p className="text-[11px] text-muted-foreground">{formatDisplayMoney(Number(prod.price ?? 0), (prod as any).currency ?? "RWF")}</p>
              </div>
              <div className="flex-shrink-0 bg-[#fd5000] px-2 py-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wide text-white">Live</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── HOW IT WORKS ────────────────────────────────────────────── */
export function HowItWorks() {
  const steps = [
    { icon: <UserPlus className="h-5 w-5" />, num: "01", title: "Digital ID", desc: "One unified account for vendors, buyers, and creators." },
    { icon: <ArrowRight className="h-5 w-5" />, num: "02", title: "AI Search", desc: "Find verified partners in seconds using our neural matching." },
    { icon: <Search className="h-5 w-5" />, num: "03", title: "Smart Contracts", desc: "Automated agreements and secure multi-currency escrow." },
    { icon: <ShieldCheck className="h-5 w-5" />, num: "04", title: "Global Sync", desc: "Real-time tracking and logistics integration across 180 countries." },
  ];

  return (
    <div className="relative overflow-hidden py-16 md:py-24 bg-stone-50 dark:bg-stone-900/60 border-y border-border">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>

          <motion.div variants={fadeUp} className="mb-12">
            <Eyebrow text="How it works" />
            <h2 className="text-[30px] sm:text-[38px] font-bold text-foreground tracking-tight">The Jimvio Protocol</h2>
            <p className="mt-2 text-[15px] font-medium text-muted-foreground max-w-md">
              Simplifying global trade for the modern era
            </p>
          </motion.div>

          {/* Steps — ruled grid, numbered */}
          <div className="grid grid-cols-1 sm:grid-cols-2 rounded-lg lg:grid-cols-4 border border-border divide-x divide-y sm:divide-y-0 divide-border">
            {steps.map((s, idx) => (
              <motion.div key={idx} variants={fadeUp}>
                <div className="p-7 group hover:bg-muted/30 transition-colors h-full">
                  {/* Step number */}
                  <p className="text-[11px] font-bold text-muted-foreground/40 tracking-widest mb-4">{s.num}</p>
                  <div className="w-10 h-10 rounded flex items-center justify-center border border-border text-muted-foreground mb-4 group-hover:border-[#fd5000]/40 group-hover:text-[#fd5000] transition-colors">
                    {s.icon}
                  </div>
                  <h4 className="text-[15px] font-semibold text-foreground mb-2">{s.title}</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8">
            <Button
              className="h-11 px-10 bg-[#fd5000] hover:bg-orange-600
               text-white text-[13px] font-medium capitalize border-0"
              asChild
            >
              <Link href="/marketplace">Initialize Trade Access →</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── APP PROMO ───────────────────────────────────────────────── */
export function AppPromo() {
  return (
    <div className="relative overflow-hidden py-20 md:py-28 bg-stone-900 dark:bg-stone-950 border-t border-stone-800">
      <motion.div
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="max-w-[1536px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start justify-between gap-16 relative z-10"
      >
        <motion.div variants={fadeUp} className="flex-1 max-w-[580px]">
          <Eyebrow text="Mobile Ecosystem" />
          <h3 className="text-[36px] sm:text-[48px] font-bold text-white mb-5 leading-tight tracking-tight">
            Trade Anywhere.<br />
            <span className="text-[#fd5000]">Global Mastery.</span>
          </h3>
          <p className="text-[15px] text-stone-400 font-medium leading-relaxed mb-10 max-w-[500px]">
            The Jimvio mobile app integrates every facet of the creator-commerce ecosystem into a single high-performance interface.
          </p>

          <Rule className="bg-stone-800 mb-8" />

          {/* Store buttons — hard-edged */}
          <div className="flex flex-wrap gap-3">
            {[
              { name: "App Store", sub: "Available on", icon: <Lock className="h-5 w-5" /> },
              { name: "Google Play", sub: "Get it on", icon: <PlayCircle className="h-5 w-5" /> },
            ].map(btn => (
              <div
                key={btn.name}
                className="flex rounded-sm items-center gap-4 px-6 py-3.5 cursor-pointer transition-all group border border-stone-700 hover:border-[#fd5000]/50 hover:bg-[#fd5000]/5"
              >
                <div className="text-stone-500 group-hover:text-[#fd5000] transition-colors flex-shrink-0">{btn.icon}</div>
                <div>
                  <div className="text-[10px] text-stone-600 font-bold uppercase tracking-[0.2em]">{btn.sub}</div>
                  <div className="text-[16px] font-bold tracking-tight text-white leading-tight mt-0.5">{btn.name}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
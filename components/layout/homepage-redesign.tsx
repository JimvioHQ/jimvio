// // components/layout/homepage-redesign.tsx
// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
// import {
//   ShoppingBag, Users, DollarSign,
//   ArrowRight, ChevronRight, Star, Shield,
//   Globe, Package, Store, TrendingUp, CheckCircle,
//   Zap, MapPin, Tag, BarChart3, Award, Wallet,
//   Layers, Search, Filter, Heart, ExternalLink,
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// /* ─── Animation presets ─── */
// const fadeUp = {
//   hidden: { opacity: 0, y: 28 },
//   show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
// };
// const fadeIn = {
//   hidden: { opacity: 0 },
//   show:   { opacity: 1, transition: { duration: 0.4 } },
// };
// const stagger = { show: { transition: { staggerChildren: 0.09 } } };
// const staggerFast = { show: { transition: { staggerChildren: 0.05 } } };

// /* ─── Types ─── */
// interface Campaign  { id: string; title: string; campaign_type?: string; rate_per_1k_views?: number; slug?: string; }
// interface Community { id: string; name: string; member_count?: number; avatar_url?: string; slug?: string; }

// interface HomepageRedesignProps {
//   campaigns?:   Campaign[];
//   communities?: Community[];
//   stats?: { users: string; earned: string; secure: string; countries: string; };
// }

// function Ticker() {
//   const items = [
//     "✦ Global Marketplace",
//     "✦ Verified Vendors",
//     "✦ Earn Commissions",
//     "✦ Join Communities",
//     "✦ Free to Start",
//     "✦ Instant Payouts",
//     "✦ 50+ Countries",
//     "✦ 10,000+ Creators",
//   ];
//   const doubled = [...items, ...items];

//   return (
//     <div
//       className="overflow-hidden py-2.5"
//       style={{
//         background: "var(--color-accent)",
//         borderBottom: "1px solid rgba(255,255,255,0.1)",
//       }}
//     >
//       <motion.div
//         className="flex gap-8 whitespace-nowrap"
//         animate={{ x: ["0%", "-50%"] }}
//         transition={{ duration: 28, ease: "linear", repeat: Infinity }}
//       >
//         {doubled.map((item, i) => (
//           <span
//             key={i}
//             className="text-white text-[11px] font-bold uppercase tracking-widest shrink-0"
//           >
//             {item}
//           </span>
//         ))}
//       </motion.div>
//     </div>
//   );
// }

// /* ═══════════════════════════════════════════════
//    HERO
// ═══════════════════════════════════════════════ */
// function Hero() {
//   const [activeCount] = useState(Math.floor(Math.random() * 3000) + 8200);
//   const [currentWord, setCurrentWord] = useState(0);
//   const words = ["Sell Products", "Build Audiences", "Earn Commissions", "Grow Globally"];

//   useEffect(() => {
//     const t = setInterval(() => setCurrentWord(w => (w + 1) % words.length), 2800);
//     return () => clearInterval(t);
//   }, []);

//   return (
//     <section
//       className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32"
//       style={{ background: "var(--color-bg)" }}
//     >
//       {/* Noise texture overlay */}
//       <div
//         className="absolute inset-0 pointer-events-none opacity-[0.025]"
//         style={{
//           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
//           backgroundRepeat: "repeat",
//           backgroundSize: "200px",
//         }}
//       />

//       {/* Radial glow */}
//       <div
//         className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
//         style={{
//           background: "radial-gradient(ellipse at center, rgba(253,80,0,0.07) 0%, transparent 65%)",
//         }}
//       />

//       {/* Diagonal accent bar */}
//       <div
//         className="absolute top-0 right-0 w-[500px] h-[3px] pointer-events-none"
//         style={{
//           background: "linear-gradient(to left, var(--color-accent), transparent)",
//           transform: "skewY(-2deg) translateY(40px)",
//         }}
//       />

//       <div className="max-w-8xl mx-auto px-4 sm:px-6">
//         <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-16 items-center">

//           {/* Left copy */}
//           <motion.div
//             initial="hidden" animate="show" variants={stagger}
//             className="text-center lg:text-left"
//           >
//             {/* Pill badge */}
//             <motion.div variants={fadeUp} className="flex justify-center lg:justify-start mb-7">
//               <div
//                 className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold"
//                 style={{
//                   background: "rgba(253,80,0,0.08)",
//                   border: "1px solid rgba(253,80,0,0.18)",
//                   color: "var(--color-accent)",
//                 }}
//               >
//                 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//                 {activeCount.toLocaleString()} people active on the platform
//               </div>
//             </motion.div>

//             {/* Headline with animated word swap */}
//             <motion.div variants={fadeUp} className="mb-5">
//               <h1
//                 className="font-black leading-[1.05] tracking-tight"
//                 style={{
//                   fontSize: "clamp(2.6rem, 5vw, 4.2rem)",
//                   color: "var(--color-text-primary)",
//                   letterSpacing: "-0.03em",
//                 }}
//               >
//                 The platform to
//                 <br />
//                 <span
//                   className="relative inline-block overflow-hidden"
//                   style={{ color: "var(--color-accent)" }}
//                 >
//                   <AnimatePresence mode="wait">
//                     <motion.span
//                       key={currentWord}
//                       initial={{ y: 40, opacity: 0 }}
//                       animate={{ y: 0, opacity: 1 }}
//                       exit={{ y: -40, opacity: 0 }}
//                       transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
//                       className="block"
//                     >
//                       {words[currentWord]}
//                     </motion.span>
//                   </AnimatePresence>
//                 </span>
//                 <br />
//                 <span style={{ color: "var(--color-text-primary)" }}>Anywhere.</span>
//               </h1>
//             </motion.div>

//             <motion.p
//               variants={fadeUp}
//               className="text-base sm:text-lg leading-relaxed mb-9 max-w-[440px] mx-auto lg:mx-0"
//               style={{ color: "var(--color-text-muted)" }}
//             >
//               Jimvio connects vendors, affiliates and communities globally.
//               List products, earn commissions, build your network — all in one place.
//             </motion.p>

//             {/* CTAs */}
//             <motion.div
//               variants={fadeUp}
//               className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10"
//             >
//               <Link
//                 href="/register"
//                 className="group inline-flex items-center justify-center gap-2.5 h-13 px-8 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
//                 style={{
//                   height: "50px",
//                   background: "var(--color-accent)",
//                   boxShadow: "0 8px 24px rgba(253,80,0,0.32)",
//                 }}
//                 onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                 onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//               >
//                 Start for Free
//                 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
//               </Link>
//               <Link
//                 href="/marketplace"
//                 className="inline-flex items-center justify-center gap-2 h-[50px] px-8 rounded-2xl text-sm font-semibold transition-all"
//                 style={{
//                   border: "1px solid var(--color-border)",
//                   color: "var(--color-text-secondary)",
//                 }}
//                 onMouseEnter={e => {
//                   (e.currentTarget.style.borderColor = "var(--color-border-strong)");
//                   (e.currentTarget.style.color = "var(--color-text-primary)");
//                 }}
//                 onMouseLeave={e => {
//                   (e.currentTarget.style.borderColor = "var(--color-border)");
//                   (e.currentTarget.style.color = "var(--color-text-secondary)");
//                 }}
//               >
//                 Browse Marketplace
//               </Link>
//             </motion.div>

//             {/* Trust pills */}
//             <motion.div
//               variants={fadeUp}
//               className="flex items-center gap-4 flex-wrap justify-center lg:justify-start"
//             >
//               {[
//                 { icon: Shield,      label: "Secure Payments", color: "emerald" },
//                 { icon: CheckCircle, label: "Verified Vendors", color: "blue" },
//                 { icon: Globe,       label: "50+ Countries",   color: "violet" },
//               ].map(({ icon: Icon, label, color }) => (
//                 <div key={label} className="flex items-center gap-1.5">
//                   <Icon className={`h-3.5 w-3.5 text-${color}-500`} />
//                   <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
//                     {label}
//                   </span>
//                 </div>
//               ))}
//             </motion.div>
//           </motion.div>

//           {/* Right: Dashboard preview card */}
//           <motion.div
//             initial={{ opacity: 0, y: 24 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
//             className="relative hidden lg:block"
//           >
//             {/* Main dashboard card */}
//             <div
//               className="relative rounded-3xl overflow-hidden p-6"
//               style={{
//                 background: "var(--color-surface)",
//                 border: "1px solid var(--color-border)",
//                 boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
//               }}
//             >
//               {/* Card header */}
//               <div className="flex items-center justify-between mb-5">
//                 <div>
//                   <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "var(--color-text-muted)" }}>
//                     Your Dashboard
//                   </p>
//                   <p className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
//                     Earnings Overview
//                   </p>
//                 </div>
//                 <div
//                   className="px-3 py-1.5 rounded-lg text-xs font-semibold"
//                   style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
//                 >
//                   ↑ +24% this week
//                 </div>
//               </div>

//               {/* Earnings bar chart (decorative) */}
//               <div className="flex items-end gap-1.5 h-24 mb-5">
//                 {[35, 52, 41, 68, 55, 72, 89, 63, 78, 95, 84, 100].map((h, i) => (
//                   <motion.div
//                     key={i}
//                     initial={{ height: 0 }}
//                     animate={{ height: `${h}%` }}
//                     transition={{ delay: 0.4 + i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
//                     className="flex-1 rounded-t-md"
//                     style={{
//                       background: i === 11
//                         ? "var(--color-accent)"
//                         : i >= 9
//                         ? "rgba(253,80,0,0.4)"
//                         : "var(--color-surface-secondary)",
//                       minWidth: 0,
//                     }}
//                   />
//                 ))}
//               </div>

//               {/* Stat row */}
//               <div className="grid grid-cols-3 gap-3 mb-5">
//                 {[
//                   { label: "Sales",      value: "1,240",  icon: ShoppingBag, color: "#fd5000" },
//                   { label: "Earned",     value: "$8,420", icon: Wallet,       color: "#10b981" },
//                   { label: "Referrals",  value: "386",    icon: Users,        color: "#0ea5e9" },
//                 ].map(item => (
//                   <div
//                     key={item.label}
//                     className="flex flex-col gap-1.5 p-3 rounded-xl"
//                     style={{ background: "var(--color-surface-secondary)" }}
//                   >
//                     <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
//                     <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
//                       {item.value}
//                     </p>
//                     <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
//                       {item.label}
//                     </p>
//                   </div>
//                 ))}
//               </div>

//               {/* Recent transactions */}
//               <div className="space-y-2.5">
//                 {[
//                   { name: "Nike Air Max",     amount: "+$42.00",  status: "Affiliate sale"  },
//                   { name: "Samsung Galaxy",   amount: "+$128.00", status: "Direct sale"     },
//                   { name: "Handmade Bag",     amount: "+$35.00",  status: "Commission"      },
//                 ].map(tx => (
//                   <div key={tx.name} className="flex items-center gap-3">
//                     <div
//                       className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
//                       style={{ background: "rgba(253,80,0,0.08)" }}
//                     >
//                       <Package className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
//                         {tx.name}
//                       </p>
//                       <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{tx.status}</p>
//                     </div>
//                     <p className="text-xs font-bold text-emerald-500 shrink-0">{tx.amount}</p>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Floating cards */}
//             <motion.div
//               initial={{ opacity: 0, x: -16 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ delay: 0.6, duration: 0.5 }}
//               className="absolute -left-6 top-1/3 px-4 py-3 rounded-2xl shadow-2xl"
//               style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
//             >
//               <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--color-text-muted)" }}>
//                 Today's Payout
//               </p>
//               <p className="text-2xl font-black" style={{ color: "var(--color-accent)" }}>$2,894</p>
//             </motion.div>

//             <motion.div
//               initial={{ opacity: 0, x: 16 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ delay: 0.75, duration: 0.5 }}
//               className="absolute -right-4 bottom-12 px-4 py-3 rounded-2xl shadow-2xl"
//               style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
//             >
//               <div className="flex items-center gap-2.5">
//                 <div
//                   className="h-9 w-9 rounded-xl flex items-center justify-center"
//                   style={{ background: "rgba(16,185,129,0.1)" }}
//                 >
//                   <TrendingUp className="h-4 w-4 text-emerald-500" />
//                 </div>
//                 <div>
//                   <p className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
//                     New vendor joined
//                   </p>
//                   <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>2 minutes ago</p>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>

//         </div>
//       </div>
//     </section>
//   );
// }

// /* ═══════════════════════════════════════════════
//    CORE VALUE PILLARS (3 cards — no video)
// ═══════════════════════════════════════════════ */
// function CorePillars() {
//   const pillars = [
//     {
//       icon: ShoppingBag,
//       title: "Marketplace",
//       tagline: "Buy & Sell Globally",
//       desc: "Thousands of verified products from trusted vendors. Shop or list your own — reach customers across 50+ countries.",
//       href: "/marketplace",
//       cta: "Explore products",
//       accent: "#fd5000",
//       bg: "rgba(253,80,0,0.06)",
//       border: "rgba(253,80,0,0.15)",
//       features: ["Verified vendors", "Secure checkout", "Global shipping"],
//     },
//     {
//       icon: DollarSign,
//       title: "Affiliate Program",
//       tagline: "Earn While You Sleep",
//       desc: "Promote any product and earn up to 30% commission on every sale. No inventory, no hassle — just share and earn.",
//       href: "/affiliate",
//       cta: "Start earning",
//       accent: "#10b981",
//       bg: "rgba(16,185,129,0.06)",
//       border: "rgba(16,185,129,0.15)",
//       features: ["Up to 30% commission", "Real-time tracking", "Instant withdrawals"],
//     },
//     {
//       icon: Users,
//       title: "Communities",
//       tagline: "Grow Your Network",
//       desc: "Find your niche. Join communities of buyers, sellers, and creators who share your interests and goals.",
//       href: "/communities",
//       cta: "Find your community",
//       accent: "#0ea5e9",
//       bg: "rgba(14,165,233,0.06)",
//       border: "rgba(14,165,233,0.15)",
//       features: ["Niche communities", "Peer networking", "Group deals"],
//     },
//   ];

//   return (
//     <section
//       className="py-20 sm:py-28"
//       style={{
//         background: "var(--color-surface)",
//         borderTop: "1px solid var(--color-border)",
//       }}
//     >
//       <div className="max-w-8xl mx-auto px-4 sm:px-6">
//         <motion.div
//           initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
//           variants={stagger}
//         >
//           <motion.div variants={fadeUp} className="text-center mb-14">
//             <p
//               className="text-[11px] font-bold uppercase tracking-widest mb-3"
//               style={{ color: "var(--color-accent)" }}
//             >
//               Built for growth
//             </p>
//             <h2
//               className="font-black tracking-tight mb-4"
//               style={{
//                 fontSize: "clamp(2rem, 4vw, 3rem)",
//                 color: "var(--color-text-primary)",
//                 letterSpacing: "-0.03em",
//               }}
//             >
//               Three ways to succeed on Jimvio
//             </h2>
//             <p className="text-base max-w-xl mx-auto" style={{ color: "var(--color-text-muted)" }}>
//               Whether you're a buyer, seller, or affiliate — the platform is built to maximize your results.
//             </p>
//           </motion.div>

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             {pillars.map((p, i) => (
//               <motion.div key={p.title} variants={fadeUp}>
//                 <Link
//                   href={p.href}
//                   className="group flex flex-col h-full p-7 rounded-3xl transition-all duration-300 hover:-translate-y-1"
//                   style={{
//                     background: "var(--color-bg)",
//                     border: "1px solid var(--color-border)",
//                   }}
//                   onMouseEnter={e => (e.currentTarget.style.borderColor = p.border)}
//                   onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                 >
//                   {/* Icon */}
//                   <div
//                     className="h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-105"
//                     style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.accent }}
//                   >
//                     <p.icon className="h-6 w-6" />
//                   </div>

//                   {/* Content */}
//                   <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: p.accent }}>
//                     {p.tagline}
//                   </p>
//                   <h3 className="text-xl font-black mb-3" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
//                     {p.title}
//                   </h3>
//                   <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: "var(--color-text-muted)" }}>
//                     {p.desc}
//                   </p>

//                   {/* Feature list */}
//                   <ul className="space-y-2 mb-7">
//                     {p.features.map(f => (
//                       <li key={f} className="flex items-center gap-2.5">
//                         <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: p.accent }} />
//                         <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
//                           {f}
//                         </span>
//                       </li>
//                     ))}
//                   </ul>

//                   {/* CTA */}
//                   <div
//                     className="flex items-center gap-2 text-sm font-bold transition-all group-hover:gap-3"
//                     style={{ color: p.accent }}
//                   >
//                     {p.cta} <ArrowRight className="h-4 w-4" />
//                   </div>
//                 </Link>
//               </motion.div>
//             ))}
//           </div>
//         </motion.div>
//       </div>
//     </section>
//   );
// }

// /* ═══════════════════════════════════════════════
//    PRODUCT CATEGORY BROWSE
// ═══════════════════════════════════════════════ */
// function CategoryBrowse() {
//   const cats = [
//     { name: "Electronics",    count: "2.4K+", icon: Zap,          color: "#f59e0b" },
//     { name: "Fashion",        count: "5.1K+", icon: Tag,          color: "#ec4899" },
//     { name: "Home & Living",  count: "1.8K+", icon: Layers,       color: "#0ea5e9" },
//     { name: "Health",         count: "890+",  icon: Heart,        color: "#10b981" },
//     { name: "Business",       count: "1.2K+", icon: BarChart3,    color: "#8b5cf6" },
//     { name: "Local Vendors",  count: "640+",  icon: MapPin,       color: "#fd5000" },
//   ];

//   return (
//     <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
//       <div className="max-w-8xl mx-auto px-4 sm:px-6">
//         <motion.div
//           initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
//           variants={stagger}
//         >
//           <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
//             <div>
//               <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>
//                 Product categories
//               </p>
//               <h2
//                 className="font-black tracking-tight"
//                 style={{
//                   fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
//                   color: "var(--color-text-primary)",
//                   letterSpacing: "-0.02em",
//                 }}
//               >
//                 Browse by category
//               </h2>
//             </div>
//             <Link
//               href="/marketplace"
//               className="inline-flex items-center gap-1.5 text-sm font-semibold shrink-0"
//               style={{ color: "var(--color-accent)" }}
//             >
//               View all products <ChevronRight className="h-4 w-4" />
//             </Link>
//           </motion.div>

//           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
//             {cats.map((cat, i) => (
//               <motion.div key={cat.name} variants={fadeUp}>
//                 <Link
//                   href={`/marketplace?category=${cat.name.toLowerCase().replace(/ /g, "-")}`}
//                   className="group flex flex-col items-center text-center p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
//                   style={{
//                     background: "var(--color-surface)",
//                     border: "1px solid var(--color-border)",
//                   }}
//                   onMouseEnter={e => (e.currentTarget.style.borderColor = `${cat.color}40`)}
//                   onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                 >
//                   <div
//                     className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
//                     style={{ background: `${cat.color}12`, color: cat.color }}
//                   >
//                     <cat.icon className="h-5 w-5" />
//                   </div>
//                   <p className="text-xs font-bold mb-1 leading-tight" style={{ color: "var(--color-text-primary)" }}>
//                     {cat.name}
//                   </p>
//                   <p className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
//                     {cat.count} items
//                   </p>
//                 </Link>
//               </motion.div>
//             ))}
//           </div>
//         </motion.div>
//       </div>
//     </section>
//   );
// }

// /* ═══════════════════════════════════════════════
//    AFFILIATE EARNINGS SPOTLIGHT
// ═══════════════════════════════════════════════ */
// function AffiliateSpotlight({ campaigns = [] }: { campaigns: Campaign[] }) {
//   const demo: Campaign[] = campaigns.length > 0 ? campaigns : [
//     { id: "1", title: "Premium Skincare Bundle",   campaign_type: "Affiliate", rate_per_1k_views: 18, slug: "skincare" },
//     { id: "2", title: "Wireless Tech Accessories", campaign_type: "Affiliate", rate_per_1k_views: 24, slug: "tech-acc" },
//     { id: "3", title: "Fashion Haul Collection",   campaign_type: "Affiliate", rate_per_1k_views: 12, slug: "fashion"  },
//     { id: "4", title: "Home Decor Essentials",     campaign_type: "Affiliate", rate_per_1k_views: 15, slug: "home"     },
//   ];

//   return (
//     <section
//       className="py-20 sm:py-28"
//       style={{
//         background: "var(--color-surface)",
//         borderTop: "1px solid var(--color-border)",
//         borderBottom: "1px solid var(--color-border)",
//       }}
//     >
//       <div className="max-w-8xl mx-auto px-4 sm:px-6">
//         <motion.div
//           initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
//           variants={stagger}
//         >
//           {/* Section header */}
//           <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mb-12">
//             <div>
//               <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#10b981" }}>
//                 Affiliate program
//               </p>
//               <h2
//                 className="font-black tracking-tight mb-4"
//                 style={{
//                   fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
//                   color: "var(--color-text-primary)",
//                   letterSpacing: "-0.025em",
//                 }}
//               >
//                 Earn commissions on
//                 <br />
//                 every product you share
//               </h2>
//               <p className="text-base max-w-lg" style={{ color: "var(--color-text-muted)" }}>
//                 Get your unique affiliate link. Share anywhere. Earn up to 30% on every purchase your referral makes — automatically.
//               </p>
//             </div>

//             {/* Earnings breakdown pill */}
//             <div
//               className="flex flex-col gap-4 p-5 rounded-2xl shrink-0 w-full lg:w-56"
//               style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}
//             >
//               {[
//                 { label: "Avg. commission", value: "22%" },
//                 { label: "Top earner / mo",  value: "$4.2K" },
//                 { label: "Payout delay",     value: "Same day" },
//               ].map(row => (
//                 <div key={row.label} className="flex items-center justify-between">
//                   <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
//                   <span className="text-sm font-black text-emerald-500">{row.value}</span>
//                 </div>
//               ))}
//             </div>
//           </motion.div>

//           {/* Campaign cards */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//             {demo.map((c, i) => (
//               <motion.div key={c.id} variants={fadeUp}>
//                 <Link
//                   href={`/affiliate/${c.slug ?? c.id}`}
//                   className="group flex flex-col gap-4 p-5 rounded-2xl h-full transition-all duration-200 hover:-translate-y-0.5"
//                   style={{
//                     background: "var(--color-bg)",
//                     border: "1px solid var(--color-border)",
//                   }}
//                   onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(16,185,129,0.3)")}
//                   onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                 >
//                   {/* Product icon placeholder */}
//                   <div
//                     className="h-10 w-10 rounded-xl flex items-center justify-center"
//                     style={{
//                       background: ["rgba(253,80,0,0.08)", "rgba(14,165,233,0.08)", "rgba(139,92,246,0.08)", "rgba(236,72,153,0.08)"][i % 4],
//                       color: ["#fd5000", "#0ea5e9", "#8b5cf6", "#ec4899"][i % 4],
//                     }}
//                   >
//                     <Package className="h-4.5 w-4.5" />
//                   </div>

//                   <div className="flex-1">
//                     <p className="text-sm font-bold mb-1.5 leading-snug" style={{ color: "var(--color-text-primary)" }}>
//                       {c.title}
//                     </p>
//                     <span
//                       className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
//                       style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}
//                     >
//                       {c.campaign_type ?? "Affiliate"}
//                     </span>
//                   </div>

//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Commission</p>
//                       <p className="text-lg font-black text-emerald-500">
//                         {c.rate_per_1k_views ?? 15}%
//                       </p>
//                     </div>
//                     <div
//                       className="flex items-center gap-1.5 text-xs font-bold transition-all group-hover:gap-2.5"
//                       style={{ color: "#10b981" }}
//                     >
//                       Get link <ExternalLink className="h-3.5 w-3.5" />
//                     </div>
//                   </div>
//                 </Link>
//               </motion.div>
//             ))}
//           </div>

//           <motion.div variants={fadeUp} className="flex justify-center mt-9">
//             <Link
//               href="/affiliate"
//               className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl text-sm font-bold text-white"
//               style={{
//                 background: "#10b981",
//                 boxShadow: "0 6px 20px rgba(16,185,129,0.3)",
//               }}
//               onMouseEnter={e => (e.currentTarget.style.background = "#059669")}
//               onMouseLeave={e => (e.currentTarget.style.background = "#10b981")}
//             >
//               Browse all affiliate products <ArrowRight className="h-4 w-4" />
//             </Link>
//           </motion.div>
//         </motion.div>
//       </div>
//     </section>
//   );
// }

// /* ═══════════════════════════════════════════════
//    COMMUNITIES SECTION
// ═══════════════════════════════════════════════ */
// function CommunitiesSection({ communities = [] }: { communities: Community[] }) {
//   const demo: Community[] = communities.length > 0 ? communities : [
//     { id: "1", name: "African Fashion Creators", member_count: 8420,  slug: "african-fashion" },
//     { id: "2", name: "Tech & Gadgets RW",        member_count: 12300, slug: "tech-gadgets"    },
//     { id: "3", name: "Business & Ecom Hub",      member_count: 5670,  slug: "business-hub"   },
//     { id: "4", name: "Fitness & Wellness",        member_count: 3200,  slug: "fitness"        },
//     { id: "5", name: "Food & Recipes Africa",     member_count: 7100,  slug: "food"           },
//     { id: "6", name: "Freelancers Network",       member_count: 4400,  slug: "freelancers"    },
//   ];

//   const gradients = [
//     "linear-gradient(135deg, #fd5000, #ff8c42)",
//     "linear-gradient(135deg, #0ea5e9, #38bdf8)",
//     "linear-gradient(135deg, #10b981, #34d399)",
//     "linear-gradient(135deg, #8b5cf6, #a78bfa)",
//     "linear-gradient(135deg, #ec4899, #f472b6)",
//     "linear-gradient(135deg, #f59e0b, #fbbf24)",
//   ];

//   return (
//     <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
//       <div className="max-w-8xl mx-auto px-4 sm:px-6">
//         <motion.div
//           initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
//           variants={stagger}
//         >
//           <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
//             <div>
//               <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#0ea5e9" }}>
//                 Find your people
//               </p>
//               <h2
//                 className="font-black tracking-tight"
//                 style={{
//                   fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
//                   color: "var(--color-text-primary)",
//                   letterSpacing: "-0.02em",
//                 }}
//               >
//                 Popular Communities
//               </h2>
//             </div>
//             <Link
//               href="/communities"
//               className="inline-flex items-center gap-1.5 text-sm font-semibold shrink-0"
//               style={{ color: "#0ea5e9" }}
//             >
//               See all <ChevronRight className="h-4 w-4" />
//             </Link>
//           </motion.div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//             {demo.map((c, i) => (
//               <motion.div key={c.id} variants={fadeUp}>
//                 <Link
//                   href={`/communities/${c.slug ?? c.id}`}
//                   className="group flex items-center gap-4 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
//                   style={{
//                     background: "var(--color-surface)",
//                     border: "1px solid var(--color-border)",
//                   }}
//                   onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)")}
//                   onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                 >
//                   {/* Avatar */}
//                   <div
//                     className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shrink-0"
//                     style={{ background: gradients[i % gradients.length] }}
//                   >
//                     {c.name[0]}
//                   </div>

//                   <div className="flex-1 min-w-0">
//                     <p className="text-sm font-bold mb-0.5 truncate" style={{ color: "var(--color-text-primary)" }}>
//                       {c.name}
//                     </p>
//                     <div className="flex items-center gap-1.5">
//                       <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//                       <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
//                         {(c.member_count ?? 0).toLocaleString()} members
//                       </p>
//                     </div>
//                   </div>

//                   <div
//                     className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
//                     style={{
//                       background: "rgba(14,165,233,0.08)",
//                       color: "#0ea5e9",
//                       border: "1px solid rgba(14,165,233,0.2)",
//                     }}
//                   >
//                     Join
//                   </div>
//                 </Link>
//               </motion.div>
//             ))}
//           </div>
//         </motion.div>
//       </div>
//     </section>
//   );
// }

// /* ═══════════════════════════════════════════════
//    HOW IT WORKS
// ═══════════════════════════════════════════════ */
// function HowItWorks() {
//   const steps = [
//     {
//       num: "01",
//       icon: Users,
//       title: "Create your free account",
//       desc: "Sign up in 60 seconds. No credit card required.",
//       color: "#0ea5e9",
//     },
//     {
//       num: "02",
//       icon: Search,
//       title: "Pick your path",
//       desc: "Sell products, become an affiliate, or join communities.",
//       color: "#fd5000",
//     },
//     {
//       num: "03",
//       icon: Store,
//       title: "List or promote",
//       desc: "Add your own products or share links to earn commissions.",
//       color: "#8b5cf6",
//     },
//     {
//       num: "04",
//       icon: Wallet,
//       title: "Get paid",
//       desc: "Withdraw earnings directly to your account, any time.",
//       color: "#10b981",
//     },
//   ];

//   return (
//     <section
//       className="py-20 sm:py-28"
//       style={{
//         background: "var(--color-surface)",
//         borderTop: "1px solid var(--color-border)",
//         borderBottom: "1px solid var(--color-border)",
//       }}
//     >
//       <div className="max-w-8xl mx-auto px-4 sm:px-6">
//         <motion.div
//           initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
//           variants={stagger}
//         >
//           <motion.div variants={fadeUp} className="text-center mb-14">
//             <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>
//               Simple to start
//             </p>
//             <h2
//               className="font-black tracking-tight mb-3"
//               style={{
//                 fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
//                 color: "var(--color-text-primary)",
//                 letterSpacing: "-0.025em",
//               }}
//             >
//               From zero to earning
//               <br />
//               in 4 steps
//             </h2>
//             <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
//               No experience needed. Built for anyone ready to grow online.
//             </p>
//           </motion.div>

//           {/* Steps grid */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
//             {steps.map((step, i) => (
//               <motion.div key={step.num} variants={fadeUp}>
//                 <div
//                   className="relative flex flex-col p-6 rounded-2xl h-full"
//                   style={{
//                     background: "var(--color-bg)",
//                     border: "1px solid var(--color-border)",
//                   }}
//                 >
//                   {/* Step number watermark */}
//                   <div
//                     className="absolute top-4 right-4 text-5xl font-black leading-none select-none"
//                     style={{ color: `${step.color}10` }}
//                   >
//                     {step.num}
//                   </div>

//                   {/* Icon */}
//                   <div
//                     className="h-12 w-12 rounded-xl flex items-center justify-center mb-5 z-10"
//                     style={{
//                       background: `${step.color}12`,
//                       border: `1px solid ${step.color}25`,
//                       color: step.color,
//                     }}
//                   >
//                     <step.icon className="h-5 w-5" />
//                   </div>

//                   <p className="text-base font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
//                     {step.title}
//                   </p>
//                   <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
//                     {step.desc}
//                   </p>

//                   {/* Connector dot */}
//                   {i < steps.length - 1 && (
//                     <div
//                       className="hidden lg:block absolute top-1/2 -right-3 h-2 w-2 rounded-full -translate-y-1/2 z-20"
//                       style={{ background: "var(--color-border-strong)" }}
//                     />
//                   )}
//                 </div>
//               </motion.div>
//             ))}
//           </div>

//           <motion.div variants={fadeUp} className="flex justify-center mt-10">
//             <Link
//               href="/register"
//               className="inline-flex items-center gap-2.5 h-[50px] px-9 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
//               style={{
//                 background: "var(--color-accent)",
//                 boxShadow: "0 6px 20px rgba(253,80,0,0.3)",
//               }}
//               onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//               onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//             >
//               Get started free <ArrowRight className="h-4 w-4" />
//             </Link>
//           </motion.div>
//         </motion.div>
//       </div>
//     </section>
//   );
// }

// /* ═══════════════════════════════════════════════
//    TRUST / STATS SECTION
// ═══════════════════════════════════════════════ */
// function TrustSection({ stats }: { stats?: HomepageRedesignProps["stats"] }) {
//   const s = stats ?? { users: "10K+", earned: "$1M+", secure: "99.9%", countries: "50+" };

//   const items = [
//     { value: s.users,     label: "Active users",     icon: Users,      color: "#0ea5e9", sub: "and growing daily"    },
//     { value: s.earned,    label: "Total paid out",   icon: DollarSign, color: "#10b981", sub: "to creators & sellers" },
//     { value: s.secure,    label: "Platform uptime",  icon: Shield,     color: "#fd5000", sub: "always available"      },
//     { value: s.countries, label: "Countries",        icon: Globe,      color: "#8b5cf6", sub: "worldwide reach"       },
//   ];

//   return (
//     <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
//       <div className="max-w-8xl mx-auto px-4 sm:px-6">
//         <motion.div
//           initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
//           variants={stagger}
//         >
//           <motion.div variants={fadeUp} className="text-center mb-14">
//             <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>
//               By the numbers
//             </p>
//             <h2
//               className="font-black tracking-tight"
//               style={{
//                 fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
//                 color: "var(--color-text-primary)",
//                 letterSpacing: "-0.025em",
//               }}
//             >
//               Trusted by thousands globally
//             </h2>
//           </motion.div>

//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//             {items.map(item => (
//               <motion.div key={item.label} variants={fadeUp}>
//                 <div
//                   className="flex flex-col items-center text-center p-7 rounded-2xl"
//                   style={{
//                     background: "var(--color-surface)",
//                     border: "1px solid var(--color-border)",
//                   }}
//                 >
//                   <div
//                     className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5"
//                     style={{
//                       background: `${item.color}10`,
//                       border: `1px solid ${item.color}20`,
//                       color: item.color,
//                     }}
//                   >
//                     <item.icon className="h-5 w-5" />
//                   </div>
//                   <p
//                     className="font-black mb-1"
//                     style={{
//                       fontSize: "clamp(2rem, 3vw, 2.75rem)",
//                       color: "var(--color-text-primary)",
//                       letterSpacing: "-0.03em",
//                     }}
//                   >
//                     {item.value}
//                   </p>
//                   <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
//                     {item.label}
//                   </p>
//                   <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
//                     {item.sub}
//                   </p>
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//         </motion.div>
//       </div>
//     </section>
//   );
// }

// /* ═══════════════════════════════════════════════
//    VENDOR SPOTLIGHT BANNER
// ═══════════════════════════════════════════════ */
// function VendorBanner() {
//   return (
//     <section
//       className="py-16 sm:py-20"
//       style={{
//         background: "var(--color-surface)",
//         borderTop: "1px solid var(--color-border)",
//       }}
//     >
//       <div className="max-w-8xl mx-auto px-4 sm:px-6">
//         <motion.div
//           initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
//           variants={stagger}
//         >
//           <motion.div
//             variants={fadeUp}
//             className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
//             style={{
//               background: "linear-gradient(135deg, #0d0600 0%, #1a0800 50%, #0d0600 100%)",
//               border: "1px solid rgba(253,80,0,0.2)",
//             }}
//           >
//             {/* Glow effect */}
//             <div
//               className="absolute top-0 right-0 w-[400px] h-[300px] pointer-events-none"
//               style={{
//                 background: "radial-gradient(ellipse at top right, rgba(253,80,0,0.15) 0%, transparent 60%)",
//               }}
//             />
//             {/* Grid */}
//             <div
//               className="absolute inset-0 opacity-5 pointer-events-none"
//               style={{
//                 backgroundImage: "linear-gradient(rgba(253,80,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(253,80,0,0.6) 1px, transparent 1px)",
//                 backgroundSize: "40px 40px",
//               }}
//             />

//             <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
//               <div>
//                 <div className="flex items-center gap-2.5 mb-5">
//                   <Award className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
//                   <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>
//                     For vendors & sellers
//                   </span>
//                 </div>
//                 <h2
//                   className="font-black text-white tracking-tight mb-4"
//                   style={{
//                     fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
//                     letterSpacing: "-0.025em",
//                   }}
//                 >
//                   Ready to reach your
//                   <br />
//                   <span style={{ color: "var(--color-accent)" }}>first 1,000 customers?</span>
//                 </h2>
//                 <p className="text-white/60 text-base max-w-lg">
//                   List your products for free. Access our global network of buyers, affiliates and communities ready to share your brand.
//                 </p>
//               </div>

//               <div className="flex flex-col gap-3 shrink-0">
//                 <Link
//                   href="/vendor/register"
//                   className="inline-flex items-center justify-center gap-2.5 h-[50px] px-8 rounded-2xl text-sm font-bold text-white transition-all"
//                   style={{
//                     background: "var(--color-accent)",
//                     boxShadow: "0 6px 20px rgba(253,80,0,0.4)",
//                   }}
//                   onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                   onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//                 >
//                   Open your store <Store className="h-4 w-4" />
//                 </Link>
//                 <Link
//                   href="/marketplace"
//                   className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-2xl text-sm font-semibold text-white/70 border border-white/10 hover:border-white/25 transition-all"
//                 >
//                   Browse marketplace
//                 </Link>
//               </div>
//             </div>
//           </motion.div>
//         </motion.div>
//       </div>
//     </section>
//   );
// }

// /* ═══════════════════════════════════════════════
//    FINAL CTA
// ═══════════════════════════════════════════════ */
// function FinalCTA() {
//   return (
//     <section className="py-24 sm:py-32" style={{ background: "var(--color-bg)" }}>
//       <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
//         <motion.div
//           initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
//           variants={stagger}
//         >
//           <motion.div variants={fadeUp}>
//             <div
//               className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 text-xs font-bold"
//               style={{
//                 background: "rgba(253,80,0,0.08)",
//                 border: "1px solid rgba(253,80,0,0.18)",
//                 color: "var(--color-accent)",
//               }}
//             >
//               <Star className="h-3.5 w-3.5" />
//               Free forever — no credit card needed
//             </div>
//           </motion.div>

//           <motion.h2
//             variants={fadeUp}
//             className="font-black tracking-tight mb-5"
//             style={{
//               fontSize: "clamp(2.5rem, 5vw, 4rem)",
//               color: "var(--color-text-primary)",
//               letterSpacing: "-0.035em",
//               lineHeight: 1.05,
//             }}
//           >
//             Your growth starts
//             <br />
//             <span style={{ color: "var(--color-accent)" }}>today.</span>
//           </motion.h2>

//           <motion.p
//             variants={fadeUp}
//             className="text-base leading-relaxed mb-10 max-w-sm mx-auto"
//             style={{ color: "var(--color-text-muted)" }}
//           >
//             Thousands of vendors and affiliates already growing on Jimvio. Join for free and see the difference.
//           </motion.p>

//           <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
//             <Link
//               href="/register"
//               className="group inline-flex items-center justify-center gap-2.5 h-14 px-10 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97]"
//               style={{
//                 background: "var(--color-accent)",
//                 boxShadow: "0 10px 32px rgba(253,80,0,0.35)",
//               }}
//               onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//               onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//             >
//               Create Free Account
//               <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
//             </Link>
//             <Link
//               href="/marketplace"
//               className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl text-base font-semibold transition-all"
//               style={{
//                 border: "1px solid var(--color-border)",
//                 color: "var(--color-text-secondary)",
//               }}
//               onMouseEnter={e => {
//                 (e.currentTarget.style.borderColor = "var(--color-border-strong)");
//                 (e.currentTarget.style.color = "var(--color-text-primary)");
//               }}
//               onMouseLeave={e => {
//                 (e.currentTarget.style.borderColor = "var(--color-border)");
//                 (e.currentTarget.style.color = "var(--color-text-secondary)");
//               }}
//             >
//               Explore first
//             </Link>
//           </motion.div>

//           {/* Social proof micro-row */}
//           <motion.div variants={fadeUp} className="flex items-center justify-center gap-6 mt-10 flex-wrap">
//             {[
//               { icon: CheckCircle, label: "No setup fees" },
//               { icon: Shield,      label: "Secure & private" },
//               { icon: Globe,       label: "Works globally" },
//             ].map(({ icon: Icon, label }) => (
//               <div key={label} className="flex items-center gap-1.5">
//                 <Icon className="h-3.5 w-3.5 text-emerald-500" />
//                 <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
//                   {label}
//                 </span>
//               </div>
//             ))}
//           </motion.div>
//         </motion.div>
//       </div>
//     </section>
//   );
// }

// /* ═══════════════════════════════════════════════
//    ROOT EXPORT
// ═══════════════════════════════════════════════ */
// export function HomepageRedesign({
//   campaigns   = [],
//   communities = [],
//   stats,
// }: HomepageRedesignProps) {
//   return (
//     <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
//       <Ticker />
//       <Hero />
//       <CorePillars />
//       <CategoryBrowse />
//       <AffiliateSpotlight campaigns={campaigns} />
//       <CommunitiesSection communities={communities} />
//       <HowItWorks />
//       <TrustSection stats={stats} />
//       <VendorBanner />
//       <FinalCTA />
//     </div>
//   );
// }
// components/layout/homepage-redesign.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShoppingBag, Users, DollarSign,
    ArrowRight, ChevronRight, Star, Shield,
    Globe, Package, Store, TrendingUp, CheckCircle,
    Zap, MapPin, Tag, BarChart3, Award, Wallet,
    Layers, Search, Heart, ExternalLink,
} from "lucide-react";
import { Hero } from "./hero-globe";
import JimvioLogo from "../ui/logo";
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

/* ─── Types ─── */
interface Campaign { id: string; title: string; campaign_type?: string; rate_per_1k_views?: number; slug?: string; }
interface Community { id: string; name: string; member_count?: number; avatar_url?: string; slug?: string; }
interface HomepageRedesignProps {
    campaigns?: Campaign[];
    communities?: Community[];
    stats?: { users: string; earned: string; secure: string; countries: string; };
}

/* ═══════════════════════════════════════════════
   TICKER
═══════════════════════════════════════════════ */
function Ticker() {
    const items = [
        "✦ Global Marketplace", "✦ Verified Vendors", "✦ Earn Commissions",
        "✦ Join Communities", "✦ Free to Start", "✦ Instant Payouts",
        "✦ 50+ Countries", "✦ 10,000+ Creators",
    ];
    const doubled = [...items, ...items];
    return (
        <div className="overflow-hidden py-2.5" style={{ background: "var(--color-accent)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <motion.div
                className="flex gap-8 whitespace-nowrap"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
            >
                {doubled.map((item, i) => (
                    <span key={i} className="text-white text-[11px] font-bold uppercase tracking-widest shrink-0">{item}</span>
                ))}
            </motion.div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   MARKETPLACE PRODUCT CARD — used inside Hero
═══════════════════════════════════════════════ */
const HERO_PRODUCTS = [
    { id: 1, name: "Premium Skincare Bundle", price: "$48", badge: "Trending", stars: 4.9, reviews: 312, sold: "1.2k sold", color: "#fd5000", bg: "rgba(253,80,0,0.08)", emoji: "🧴" },
    { id: 2, name: "Wireless Earbuds Pro", price: "$129", badge: "Top Pick", stars: 4.8, reviews: 896, sold: "3.5k sold", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", emoji: "🎧" },
    { id: 3, name: "Handmade Leather Bag", price: "$85", badge: "Local Made", stars: 5.0, reviews: 144, sold: "680 sold", color: "#fd5000", bg: "rgba(253,80,0,0.08)", emoji: "👜" },
    { id: 4, name: "Smart Fitness Tracker", price: "$64", badge: "New", stars: 4.7, reviews: 207, sold: "920 sold", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", emoji: "⌚" },
    { id: 5, name: "African Print Fabric", price: "$22", badge: "Bestseller", stars: 4.9, reviews: 531, sold: "2.1k sold", color: "#fd5000", bg: "rgba(253,80,0,0.08)", emoji: "🎨" },
    { id: 6, name: "Home Diffuser Set", price: "$39", badge: "Popular", stars: 4.8, reviews: 188, sold: "740 sold", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", emoji: "🏺" },
];

function StarRow({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} width="10" height="10" viewBox="0 0 10 10">
                    <polygon
                        points="5,0.5 6.5,3.5 9.5,4 7.2,6.2 7.7,9.2 5,7.7 2.3,9.2 2.8,6.2 0.5,4 3.5,3.5"
                        fill={s <= Math.round(rating) ? "#fd5000" : "rgba(253,80,0,0.2)"}
                    />
                </svg>
            ))}
        </div>
    );
}

function ProductCard({ p, index }: { p: typeof HERO_PRODUCTS[0]; index: number }) {
    const [wishlisted, setWishlisted] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="group relative rounded-2xl overflow-hidden flex flex-col"
            style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                transition: "border-color 0.2s, transform 0.2s",
            }}
            whileHover={{ y: -3 }}
        >
            {/* Product image area */}
            <div
                className="relative flex items-center justify-center"
                style={{
                    background: p.bg,
                    height: "120px",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <span style={{ fontSize: "42px", lineHeight: 1 }}>{p.emoji}</span>

                {/* Badge */}
                <div
                    className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide"
                    style={{ background: p.color, color: "#fff" }}
                >
                    {p.badge}
                </div>

                {/* Wishlist */}
                <button
                    onClick={() => setWishlisted(w => !w)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                    <Heart
                        className="h-3 w-3"
                        style={{ fill: wishlisted ? "#fd5000" : "none", color: wishlisted ? "#fd5000" : "var(--color-text-muted)" }}
                    />
                </button>
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-1.5 flex-1">
                <p className="text-xs font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
                    {p.name}
                </p>
                <div className="flex items-center gap-1.5">
                    <StarRow rating={p.stars} />
                    <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>({p.reviews})</span>
                </div>
                <div className="flex items-center justify-between mt-auto pt-1.5" style={{ borderTop: "1px solid var(--color-border)" }}>
                    <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>{p.price}</span>
                    <span className="text-[9px] font-semibold" style={{ color: "var(--color-text-muted)" }}>{p.sold}</span>
                </div>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════ */
// function Hero() {
//     const [activeCount] = useState(Math.floor(Math.random() * 3000) + 8200);
//     const [currentWord, setCurrentWord] = useState(0);
//     const words = ["Sell Products", "Build Audiences", "Earn Commissions", "Grow Globally"];

//     useEffect(() => {
//         const t = setInterval(() => setCurrentWord(w => (w + 1) % words.length), 2800);
//         return () => clearInterval(t);
//     }, []);

//     return (
//         <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32" style={{ background: "var(--color-bg)" }}>
//             {/* Subtle radial glow */}
//             <div
//                 className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
//                 style={{ background: "radial-gradient(ellipse at center, rgba(253,80,0,0.06) 0%, transparent 65%)" }}
//             />
//             {/* Accent line */}
//             <div
//                 className="absolute top-0 right-0 w-[400px] h-[2px] pointer-events-none"
//                 style={{ background: "linear-gradient(to left, var(--color-accent), transparent)", transform: "skewY(-2deg) translateY(36px)" }}
//             />

//             <div className="max-w-8xl mx-auto px-4 sm:px-6">
//                 <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-12 xl:gap-20 items-center">

//                     {/* ── Left copy ── */}
//                     <motion.div initial="hidden" animate="show" variants={stagger} className="text-center lg:text-left">
//                         {/* Live badge */}
//                         <motion.div variants={fadeUp} className="flex justify-center lg:justify-start mb-7">
//                             <div
//                                 className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold"
//                                 style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.18)", color: "var(--color-accent)" }}
//                             >
//                                 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//                                 {activeCount.toLocaleString()} people active now
//                             </div>
//                         </motion.div>

//                         {/* Headline */}
//                         <motion.div variants={fadeUp} className="mb-5">
//                             <h1
//                                 className="font-black leading-[1.05] tracking-tight"
//                                 style={{ fontSize: "clamp(2.8rem, 5vw, 4.4rem)", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}
//                             >
//                                 The platform to
//                                 <br />
//                                 <span className="relative inline-block overflow-hidden" style={{ color: "var(--color-accent)" }}>
//                                     <AnimatePresence mode="wait">
//                                         <motion.span
//                                             key={currentWord}
//                                             initial={{ y: 40, opacity: 0 }}
//                                             animate={{ y: 0, opacity: 1 }}
//                                             exit={{ y: -40, opacity: 0 }}
//                                             transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
//                                             className="block"
//                                         >
//                                             {words[currentWord]}
//                                         </motion.span>
//                                     </AnimatePresence>
//                                 </span>
//                                 <br />
//                                 <span style={{ color: "var(--color-text-primary)" }}>Anywhere.</span>
//                             </h1>
//                         </motion.div>

//                         <motion.p
//                             variants={fadeUp}
//                             className="text-base sm:text-lg leading-relaxed mb-9 max-w-[440px] mx-auto lg:mx-0"
//                             style={{ color: "var(--color-text-muted)" }}
//                         >
//                             Jimvio connects vendors, affiliates and communities globally.
//                             List products, earn commissions, build your network — all in one place.
//                         </motion.p>

//                         {/* CTAs */}
//                         <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
//                             <Link
//                                 href="/register"
//                                 className="group inline-flex items-center justify-center gap-2.5 px-8 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
//                                 style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 22px rgba(253,80,0,0.28)" }}
//                                 onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                                 onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//                             >
//                                 Start for Free
//                                 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
//                             </Link>
//                             <Link
//                                 href="/marketplace"
//                                 className="inline-flex items-center justify-center gap-2 px-8 rounded-2xl text-sm font-semibold transition-all"
//                                 style={{ height: "50px", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
//                                 onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
//                                 onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
//                             >
//                                 Browse Marketplace
//                             </Link>
//                         </motion.div>

//                         {/* Trust pills */}
//                         <motion.div variants={fadeUp} className="flex items-center gap-5 flex-wrap justify-center lg:justify-start">
//                             {[
//                                 { icon: Shield, label: "Secure Payments" },
//                                 { icon: CheckCircle, label: "Verified Vendors" },
//                                 { icon: Globe, label: "50+ Countries" },
//                             ].map(({ icon: Icon, label }) => (
//                                 <div key={label} className="flex items-center gap-1.5">
//                                     <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
//                                     <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
//                                 </div>
//                             ))}
//                         </motion.div>
//                     </motion.div>

//                     {/* ── Right: Marketplace product grid ── */}
//                     <div className="relative hidden lg:block">

//                         <JimvioLogo />


//                     </div>
//                     <GlobeHero />
//                 </div>
//             </div>
//         </section>
//     );
// }

/* ═══════════════════════════════════════════════
   CORE VALUE PILLARS
═══════════════════════════════════════════════ */
function CorePillars() {
    const pillars = [
        {
            icon: ShoppingBag, title: "Marketplace", tagline: "Buy & Sell Globally",
            desc: "Thousands of verified products from trusted vendors. Shop or list your own — reach customers across 50+ countries.",
            href: "/marketplace", cta: "Explore products",
            accent: "#fd5000", bg: "rgba(253,80,0,0.06)", border: "rgba(253,80,0,0.15)",
            features: ["Verified vendors", "Secure checkout", "Global shipping"],
        },
        {
            icon: DollarSign, title: "Affiliate Program", tagline: "Earn While You Sleep",
            desc: "Promote any product and earn up to 30% commission on every sale. No inventory, no hassle — just share and earn.",
            href: "/affiliate", cta: "Start earning",
            accent: "#fd5000", bg: "rgba(253,80,0,0.05)", border: "rgba(253,80,0,0.12)",
            features: ["Up to 30% commission", "Real-time tracking", "Instant withdrawals"],
        },
        {
            icon: Users, title: "Communities", tagline: "Grow Your Network",
            desc: "Find your niche. Join communities of buyers, sellers, and creators who share your interests and goals.",
            href: "/communities", cta: "Find your community",
            accent: "#fd5000", bg: "rgba(253,80,0,0.05)", border: "rgba(253,80,0,0.12)",
            features: ["Niche communities", "Peer networking", "Group deals"],
        },
    ];

    return (
        <section className="py-20 sm:py-28" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-accent)" }}>Built for growth</p>
                        <h2 className="font-black tracking-tight mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
                            Three ways to succeed on Jimvio
                        </h2>
                        <p className="text-base max-w-xl mx-auto" style={{ color: "var(--color-text-muted)" }}>
                            Whether you're a buyer, seller, or affiliate — the platform is built to maximize your results.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {pillars.map((p) => (
                            <motion.div key={p.title} variants={fadeUp}>
                                <Link
                                    href={p.href}
                                    className="group flex flex-col h-full p-7 rounded-3xl transition-all duration-300 hover:-translate-y-1"
                                    style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = p.border)}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <div
                                        className="h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-105"
                                        style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.accent }}
                                    >
                                        <p.icon className="h-6 w-6" />
                                    </div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: p.accent }}>{p.tagline}</p>
                                    <h3 className="text-xl font-black mb-3" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>{p.title}</h3>
                                    <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: "var(--color-text-muted)" }}>{p.desc}</p>
                                    <ul className="space-y-2 mb-7">
                                        {p.features.map(f => (
                                            <li key={f} className="flex items-center gap-2.5">
                                                <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: p.accent }} />
                                                <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="flex items-center gap-2 text-sm font-bold transition-all group-hover:gap-3" style={{ color: p.accent }}>
                                        {p.cta} <ArrowRight className="h-4 w-4" />
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   CATEGORY BROWSE
═══════════════════════════════════════════════ */
function CategoryBrowse() {
    const cats = [
        { name: "Electronics", count: "2.4K+", icon: Zap, },
        { name: "Fashion", count: "5.1K+", icon: Tag, },
        { name: "Home & Living", count: "1.8K+", icon: Layers, },
        { name: "Health", count: "890+", icon: Heart, },
        { name: "Business", count: "1.2K+", icon: BarChart3, },
        { name: "Local Vendors", count: "640+", icon: MapPin, },
    ];

    return (
        <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>Product categories</p>
                            <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                                Browse by category
                            </h2>
                        </div>
                        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0" style={{ color: "var(--color-accent)" }}>
                            View all products <ChevronRight className="h-4 w-4" />
                        </Link>
                    </motion.div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {cats.map((cat) => (
                            <motion.div key={cat.name} variants={fadeUp}>
                                <Link
                                    href={`/marketplace?category=${cat.name.toLowerCase().replace(/ /g, "-")}`}
                                    className="group flex flex-col items-center text-center p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.3)")}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <div
                                        className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                                        style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)" }}
                                    >
                                        <cat.icon className="h-5 w-5" />
                                    </div>
                                    <p className="text-xs font-bold mb-1 leading-tight" style={{ color: "var(--color-text-primary)" }}>{cat.name}</p>
                                    <p className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>{cat.count} items</p>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   AFFILIATE SPOTLIGHT
═══════════════════════════════════════════════ */
function AffiliateSpotlight({ campaigns = [] }: { campaigns: Campaign[] }) {
    const demo: Campaign[] = campaigns.length > 0 ? campaigns : [
        { id: "1", title: "Premium Skincare Bundle", campaign_type: "Affiliate", rate_per_1k_views: 18, slug: "skincare" },
        { id: "2", title: "Wireless Tech Accessories", campaign_type: "Affiliate", rate_per_1k_views: 24, slug: "tech-acc" },
        { id: "3", title: "Fashion Haul Collection", campaign_type: "Affiliate", rate_per_1k_views: 12, slug: "fashion" },
        { id: "4", title: "Home Decor Essentials", campaign_type: "Affiliate", rate_per_1k_views: 15, slug: "home" },
    ];

    return (
        <section
            className="py-20 sm:py-28"
            style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
        >
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mb-12">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>Affiliate program</p>
                            <h2 className="font-black tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}>
                                Earn commissions on<br />every product you share
                            </h2>
                            <p className="text-base max-w-lg" style={{ color: "var(--color-text-muted)" }}>
                                Get your unique affiliate link. Share anywhere. Earn up to 30% on every purchase your referral makes — automatically.
                            </p>
                        </div>
                        <div
                            className="flex flex-col gap-4 p-5 rounded-2xl shrink-0 w-full lg:w-56"
                            style={{ background: "rgba(253,80,0,0.05)", border: "1px solid rgba(253,80,0,0.15)" }}
                        >
                            {[
                                { label: "Avg. commission", value: "22%" },
                                { label: "Top earner / mo", value: "$4.2K" },
                                { label: "Payout delay", value: "Same day" },
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
                                    <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {demo.map((c, i) => (
                            <motion.div key={c.id} variants={fadeUp}>
                                <Link
                                    href={`/affiliate/${c.slug ?? c.id}`}
                                    className="group flex flex-col gap-4 p-5 rounded-2xl h-full transition-all duration-200 hover:-translate-y-0.5"
                                    style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.25)")}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)" }}>
                                        <Package className="h-4.5 w-4.5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold mb-1.5 leading-snug" style={{ color: "var(--color-text-primary)" }}>{c.title}</p>
                                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide" style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)" }}>
                                            {c.campaign_type ?? "Affiliate"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Commission</p>
                                            <p className="text-lg font-black" style={{ color: "var(--color-accent)" }}>{c.rate_per_1k_views ?? 15}%</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold transition-all group-hover:gap-2.5" style={{ color: "var(--color-accent)" }}>
                                            Get link <ExternalLink className="h-3.5 w-3.5" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div variants={fadeUp} className="flex justify-center mt-9">
                        <Link
                            href="/affiliate"
                            className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl text-sm font-bold text-white"
                            style={{ background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Browse all affiliate products <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   COMMUNITIES
═══════════════════════════════════════════════ */
function CommunitiesSection({ communities = [] }: { communities: Community[] }) {
    const demo: Community[] = communities.length > 0 ? communities : [
        { id: "1", name: "African Fashion Creators", member_count: 8420, slug: "african-fashion" },
        { id: "2", name: "Tech & Gadgets RW", member_count: 12300, slug: "tech-gadgets" },
        { id: "3", name: "Business & Ecom Hub", member_count: 5670, slug: "business-hub" },
        { id: "4", name: "Fitness & Wellness", member_count: 3200, slug: "fitness" },
        { id: "5", name: "Food & Recipes Africa", member_count: 7100, slug: "food" },
        { id: "6", name: "Freelancers Network", member_count: 4400, slug: "freelancers" },
    ];

    return (
        <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>Find your people</p>
                            <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                                Popular Communities
                            </h2>
                        </div>
                        <Link href="/communities" className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0" style={{ color: "var(--color-accent)" }}>
                            See all <ChevronRight className="h-4 w-4" />
                        </Link>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {demo.map((c, i) => (
                            <motion.div key={c.id} variants={fadeUp}>
                                <Link
                                    href={`/communities/${c.slug ?? c.id}`}
                                    className="group flex items-center gap-4 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.25)")}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <div
                                        className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shrink-0"
                                        style={{ background: "var(--color-accent)" }}
                                    >
                                        {c.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold mb-0.5 truncate" style={{ color: "var(--color-text-primary)" }}>{c.name}</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                                {(c.member_count ?? 0).toLocaleString()} members
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold"
                                        style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)", border: "1px solid rgba(253,80,0,0.18)" }}
                                    >
                                        Join
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════════ */
function HowItWorks() {
    const steps = [
        { num: "01", icon: Users, title: "Create your free account", desc: "Sign up in 60 seconds. No credit card required." },
        { num: "02", icon: Search, title: "Pick your path", desc: "Sell products, become an affiliate, or join communities." },
        { num: "03", icon: Store, title: "List or promote", desc: "Add your own products or share links to earn commissions." },
        { num: "04", icon: Wallet, title: "Get paid", desc: "Withdraw earnings directly to your account, any time." },
    ];

    return (
        <section className="py-20 sm:py-28" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>Simple to start</p>
                        <h2 className="font-black tracking-tight mb-3" style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}>
                            From zero to earning<br />in 4 steps
                        </h2>
                        <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>No experience needed. Built for anyone ready to grow online.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {steps.map((step, i) => (
                            <motion.div key={step.num} variants={fadeUp}>
                                <div className="relative flex flex-col p-6 rounded-2xl h-full" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                                    <div className="absolute top-4 right-4 text-5xl font-black leading-none select-none" style={{ color: "rgba(253,80,0,0.07)" }}>
                                        {step.num}
                                    </div>
                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-5 z-10" style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.15)", color: "var(--color-accent)" }}>
                                        <step.icon className="h-5 w-5" />
                                    </div>
                                    <p className="text-base font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{step.title}</p>
                                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{step.desc}</p>
                                    {i < steps.length - 1 && (
                                        <div className="hidden lg:block absolute top-1/2 -right-3 h-2 w-2 rounded-full -translate-y-1/2 z-20" style={{ background: "var(--color-border-strong)" }} />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div variants={fadeUp} className="flex justify-center mt-10">
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2.5 px-9 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                            style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Get started free <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   TRUST / STATS
═══════════════════════════════════════════════ */
function TrustSection({ stats }: { stats?: HomepageRedesignProps["stats"] }) {
    const s = stats ?? { users: "10K+", earned: "$1M+", secure: "99.9%", countries: "50+" };
    const items = [
        { value: s.users, label: "Active users", icon: Users, sub: "and growing daily" },
        { value: s.earned, label: "Total paid out", icon: DollarSign, sub: "to creators & sellers" },
        { value: s.secure, label: "Platform uptime", icon: Shield, sub: "always available" },
        { value: s.countries, label: "Countries", icon: Globe, sub: "worldwide reach" },
    ];

    return (
        <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>By the numbers</p>
                        <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}>
                            Trusted by thousands globally
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {items.map(item => (
                            <motion.div key={item.label} variants={fadeUp}>
                                <div className="flex flex-col items-center text-center p-7 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.15)", color: "var(--color-accent)" }}>
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <p className="font-black mb-1" style={{ fontSize: "clamp(2rem, 3vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>{item.value}</p>
                                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>{item.label}</p>
                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{item.sub}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   VENDOR BANNER
═══════════════════════════════════════════════ */
function VendorBanner() {
    return (
        <section className="py-16 sm:py-20" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div
                        variants={fadeUp}
                        className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
                        style={{
                            background: "linear-gradient(135deg, #0d0600 0%, #1a0800 50%, #0d0600 100%)",
                            border: "1px solid rgba(253,80,0,0.2)",
                        }}
                    >
                        <div className="absolute top-0 right-0 w-[400px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(253,80,0,0.15) 0%, transparent 60%)" }} />
                        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                            backgroundImage: "linear-gradient(rgba(253,80,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(253,80,0,0.6) 1px, transparent 1px)",
                            backgroundSize: "40px 40px",
                        }} />
                        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
                            <div>
                                <div className="flex items-center gap-2.5 mb-5">
                                    <Award className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>For vendors & sellers</span>
                                </div>
                                <h2 className="font-black text-white tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", letterSpacing: "-0.025em" }}>
                                    Ready to reach your<br /><span style={{ color: "var(--color-accent)" }}>first 1,000 customers?</span>
                                </h2>
                                <p className="text-white/60 text-base max-w-lg">
                                    List your products for free. Access our global network of buyers, affiliates and communities ready to share your brand.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 shrink-0">
                                <Link
                                    href="/vendor/register"
                                    className="inline-flex items-center justify-center gap-2.5 px-8 rounded-2xl text-sm font-bold text-white transition-all"
                                    style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.4)" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                                >
                                    Open your store <Store className="h-4 w-4" />
                                </Link>
                                <Link
                                    href="/marketplace"
                                    className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-2xl text-sm font-semibold text-white/70 border border-white/10 hover:border-white/25 transition-all"
                                >
                                    Browse marketplace
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   FINAL CTA
═══════════════════════════════════════════════ */
function FinalCTA() {
    return (
        <section className="py-24 sm:py-32" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp}>
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 text-xs font-bold"
                            style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.18)", color: "var(--color-accent)" }}
                        >
                            <Star className="h-3.5 w-3.5" />
                            Free forever — no credit card needed
                        </div>
                    </motion.div>

                    <motion.h2
                        variants={fadeUp}
                        className="font-black tracking-tight mb-5"
                        style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "var(--color-text-primary)", letterSpacing: "-0.035em", lineHeight: 1.05 }}
                    >
                        Your growth starts<br /><span style={{ color: "var(--color-accent)" }}>today.</span>
                    </motion.h2>

                    <motion.p variants={fadeUp} className="text-base leading-relaxed mb-10 max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
                        Thousands of vendors and affiliates already growing on Jimvio. Join for free and see the difference.
                    </motion.p>

                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/register"
                            className="group inline-flex items-center justify-center gap-2.5 px-10 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97]"
                            style={{ height: "56px", background: "var(--color-accent)", boxShadow: "0 10px 32px rgba(253,80,0,0.32)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Create Free Account
                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center justify-center gap-2 px-8 rounded-2xl text-base font-semibold transition-all"
                            style={{ height: "56px", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                        >
                            Explore first
                        </Link>
                    </motion.div>

                    <motion.div variants={fadeUp} className="flex items-center justify-center gap-6 mt-10 flex-wrap">
                        {[
                            { icon: CheckCircle, label: "No setup fees" },
                            { icon: Shield, label: "Secure & private" },
                            { icon: Globe, label: "Works globally" },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
                                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   ROOT EXPORT
═══════════════════════════════════════════════ */
export function HomepageRedesign({ campaigns = [], communities = [], stats }: HomepageRedesignProps) {
    return (
        <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
            <Ticker />
            <Hero />
            <CorePillars />
            <CategoryBrowse />
            <AffiliateSpotlight campaigns={campaigns} />
            <CommunitiesSection communities={communities} />
            <HowItWorks />
            <TrustSection stats={stats} />
            <VendorBanner />
            <FinalCTA />
        </div>
    );
}
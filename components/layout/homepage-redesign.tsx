// "use client";

// import React, { useState, useEffect } from "react";
// import Link from "next/link";
// import { motion } from "framer-motion";
// import {
//     ShoppingBag, Users, DollarSign,
//     ArrowRight, ChevronRight, Star, Shield,
//     Globe, Package, Store, CheckCircle,
//     Zap, MapPin, Tag, BarChart3, Award, Wallet,
//     Layers, Search, Heart, ExternalLink,
//     Clapperboard,
// } from "lucide-react";
// import { Hero } from "./hero";
// import { SharedCampaignCard, SharedCampaignRow } from "../ugc/campaign-card-shared";
// import { formatPlatformCount } from "@/lib/platform-settings-shared";
// import { createClient } from "@/lib/supabase/client";
// import CommunitiesSection from "./communities-section";
// import { SwipeableCardGrid } from "../ui/swipeable-card-grid";

// /* ─── Animation variants ─── */
// const fadeUp = {
//     hidden: { opacity: 0, y: 24 },
//     show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
// };
// const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// /* ─── Types ─── */
// interface Campaign {
//     id: string;
//     title: string;
//     campaign_type?: string;
//     rate_per_1k_views?: number;
//     slug?: string;
// }

// interface Community {
//     id: string
//     name: string
//     slug: string
//     tagline?: string
//     category?: string
//     member_count?: number
//     post_count?: number
//     is_free?: boolean
//     monthly_price?: number
//     currency?: string
//     cover_image?: string
//     avatar_url?: string
//     created_at?: string
// }

// interface HomepageRedesignProps {
//     campaigns?: SharedCampaignRow[];
//     communities?: Community[];
//     stats?: {
//         users: string;
//         earned: string;
//         secure: string;
//         countries: string;
//     };
// }

// /* ═══════════════════════════════════════════════
//    TICKER
// ═══════════════════════════════════════════════ */
// function Ticker() {
//     const items = [
//         "✦ Global Marketplace", "✦ Verified Vendors", "✦ Earn Commissions",
//         "✦ Join Communities", "✦ Free to Start", "✦ Instant Payouts",
//         "✦ 50+ Countries", "✦ 10,000+ Creators",
//     ];
//     const doubled = [...items, ...items];

//     return (
//         <div
//             className="overflow-hidden px-8  py-2.5"
//             style={{
//                 background: "var(--color-accent)",
//                 borderBottom: "1px solid rgba(255,255,255,0.1)",
//             }}
//         >
//             <motion.div
//                 className="flex gap-8 whitespace-nowrap"
//                 animate={{ x: ["0%", "-50%"] }}
//                 transition={{ duration: 30, ease: "linear", repeat: Infinity }}
//             >
//                 {doubled.map((item, i) => (
//                     <span
//                         key={i}
//                         className="text-white text-[11px] font-bold uppercase tracking-widest shrink-0"
//                     >
//                         {item}
//                     </span>
//                 ))}
//             </motion.div>
//         </div>
//     );
// }

// /* ═══════════════════════════════════════════════
//    HERO PRODUCT CARD
// ═══════════════════════════════════════════════ */
// const HERO_PRODUCTS = [
//     { id: 1, name: "Premium Skincare Bundle", price: "$48", badge: "Trending", stars: 4.9, reviews: 312, sold: "1.2k sold", color: "#fd5000", bg: "rgba(253,80,0,0.08)", emoji: "🧴" },
//     { id: 2, name: "Wireless Earbuds Pro", price: "$129", badge: "Top Pick", stars: 4.8, reviews: 896, sold: "3.5k sold", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", emoji: "🎧" },
//     { id: 3, name: "Handmade Leather Bag", price: "$85", badge: "Local Made", stars: 5.0, reviews: 144, sold: "680 sold", color: "#fd5000", bg: "rgba(253,80,0,0.08)", emoji: "👜" },
//     { id: 4, name: "Smart Fitness Tracker", price: "$64", badge: "New", stars: 4.7, reviews: 207, sold: "920 sold", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", emoji: "⌚" },
//     { id: 5, name: "African Print Fabric", price: "$22", badge: "Bestseller", stars: 4.9, reviews: 531, sold: "2.1k sold", color: "#fd5000", bg: "rgba(253,80,0,0.08)", emoji: "🎨" },
//     { id: 6, name: "Home Diffuser Set", price: "$39", badge: "Popular", stars: 4.8, reviews: 188, sold: "740 sold", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", emoji: "🏺" },
// ];

// function StarRow({ rating }: { rating: number }) {
//     return (
//         <div className="flex items-center gap-0.5">
//             {[1, 2, 3, 4, 5].map(s => (
//                 <svg key={s} width="10" height="10" viewBox="0 0 10 10">
//                     <polygon
//                         points="5,0.5 6.5,3.5 9.5,4 7.2,6.2 7.7,9.2 5,7.7 2.3,9.2 2.8,6.2 0.5,4 3.5,3.5"
//                         fill={s <= Math.round(rating) ? "#fd5000" : "rgba(253,80,0,0.2)"}
//                     />
//                 </svg>
//             ))}
//         </div>
//     );
// }

// function ProductCard({ p, index }: { p: typeof HERO_PRODUCTS[0]; index: number }) {
//     const [wishlisted, setWishlisted] = useState(false);

//     return (
//         <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.3 + index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
//             className="group relative rounded-2xl overflow-hidden flex flex-col"
//             style={{
//                 background: "var(--color-surface)",
//                 border: "1px solid var(--color-border)",
//                 transition: "border-color 0.2s, transform 0.2s",
//             }}
//             whileHover={{ y: -3 }}
//         >
//             {/* Product image area */}
//             <div
//                 className="relative flex items-center justify-center"
//                 style={{
//                     background: p.bg,
//                     height: "120px",
//                     borderBottom: "1px solid var(--color-border)",
//                 }}
//             >
//                 <span style={{ fontSize: "42px", lineHeight: 1 }}>{p.emoji}</span>

//                 {/* Badge */}
//                 <div
//                     className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide"
//                     style={{ background: p.color, color: "#fff" }}
//                 >
//                     {p.badge}
//                 </div>

//                 {/* Wishlist */}
//                 <button
//                     onClick={() => setWishlisted(w => !w)}
//                     className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center"
//                     style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
//                 >
//                     <Heart
//                         className="h-3 w-3"
//                         style={{
//                             fill: wishlisted ? "#fd5000" : "none",
//                             color: wishlisted ? "#fd5000" : "var(--color-text-muted)",
//                         }}
//                     />
//                 </button>
//             </div>

//             {/* Info */}
//             <div className="p-3 flex flex-col gap-1.5 flex-1">
//                 <p className="text-xs font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
//                     {p.name}
//                 </p>
//                 <div className="flex items-center gap-1.5">
//                     <StarRow rating={p.stars} />
//                     <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>({p.reviews})</span>
//                 </div>
//                 <div
//                     className="flex items-center justify-between mt-auto pt-1.5"
//                     style={{ borderTop: "1px solid var(--color-border)" }}
//                 >
//                     <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>{p.price}</span>
//                     <span className="text-[9px] font-semibold" style={{ color: "var(--color-text-muted)" }}>{p.sold}</span>
//                 </div>
//             </div>
//         </motion.div>
//     );
// }

// /* ═══════════════════════════════════════════════
//    UGC CAMPAIGNS
// ═══════════════════════════════════════════════ */
// function UGCCampaigns({ campaigns = [] }: { campaigns: SharedCampaignRow[] }) {
//     const demo: Campaign[] = campaigns.length > 0
//         ? (campaigns as unknown as Campaign[])
//         : [
//             { id: "1", title: "Summer Skincare Review", campaign_type: "UGC", rate_per_1k_views: 8, slug: "skincare-review" },
//             { id: "2", title: "Tech Unboxing Series", campaign_type: "Clipping", rate_per_1k_views: 12, slug: "tech-unbox" },
//             { id: "3", title: "Fashion Haul Africa", campaign_type: "UGC", rate_per_1k_views: 6, slug: "fashion-haul" },
//             { id: "4", title: "Fitness Transformation", campaign_type: "Clipping", rate_per_1k_views: 10, slug: "fitness" },
//             { id: "5", title: "Home Setup Tour", campaign_type: "UGC", rate_per_1k_views: 7, slug: "home-setup" },
//             { id: "6", title: "Food & Lifestyle Clips", campaign_type: "Clipping", rate_per_1k_views: 9, slug: "food-clips" },
//         ];

//     return (
//         <section
//             className="py-20 sm:py-28"
//             style={{
//                 background: "var(--color-surface)",
//                 borderTop: "1px solid var(--color-border)",
//                 borderBottom: "1px solid var(--color-border)",
//             }}
//         >
//             <div className="max-w-8xl mx-auto px-4 sm:px-6">
//                 <motion.div
//                     initial="hidden"
//                     whileInView="show"
//                     viewport={{ once: true, margin: "-80px" }}
//                     variants={stagger}
//                 >
//                     {/* Header */}
//                     <motion.div
//                         variants={fadeUp}
//                         className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mb-12"
//                     >
//                         <div>
//                             <div
//                                 className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-bold uppercase tracking-widest"
//                                 style={{
//                                     background: "rgba(253,80,0,0.08)",
//                                     border: "1px solid rgba(253,80,0,0.18)",
//                                     color: "var(--color-accent)",
//                                 }}
//                             >
//                                 <Clapperboard className="h-3 w-3" />
//                                 UGC &amp; Clipping campaigns
//                             </div>
//                             <h2
//                                 className="font-black tracking-tight mb-4"
//                                 style={{
//                                     fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
//                                     color: "var(--color-text-primary)",
//                                     letterSpacing: "-0.025em",
//                                 }}
//                             >
//                                 Get paid to create content.<br />
//                                 <span style={{ color: "var(--color-accent)" }}>No followers needed.</span>
//                             </h2>
//                             <p className="text-base max-w-lg" style={{ color: "var(--color-text-muted)" }}>
//                                 Join a brand campaign, film or clip content, and earn per 1,000 views — on any platform. It's that simple.
//                             </p>
//                         </div>

//                         {/* Stats pill */}
//                         <div
//                             className="flex flex-col gap-4 p-5 rounded-2xl shrink-0 w-full lg:w-56"
//                             style={{ background: "rgba(253,80,0,0.05)", border: "1px solid rgba(253,80,0,0.15)" }}
//                         >
//                             {[
//                                 { label: "Avg. per 1K views", value: "$8" },
//                                 { label: "Active campaigns", value: "120+" },
//                                 { label: "Platforms accepted", value: "Any" },
//                             ].map(row => (
//                                 <div key={row.label} className="flex items-center justify-between">
//                                     <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
//                                     <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>{row.value}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </motion.div>

//                     <SwipeableCardGrid
//                         items={demo}
//                         cols={{ sm: 2, lg: 4 }}
//                         renderCard={(c) => (<motion.div key={c.id} variants={fadeUp}>
//                             <SharedCampaignCard c={c as any} />
//                         </motion.div>)}
//                     />

//                     {/* Bottom CTA */}
//                     <motion.div variants={fadeUp} className="flex justify-center mt-9">
//                         <Link
//                             href="/ugc"
//                             className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl text-sm font-bold text-white"
//                             style={{ background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
//                             onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                             onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//                         >
//                             Browse all campaigns <ArrowRight className="h-4 w-4" />
//                         </Link>
//                     </motion.div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// // Decorative SVG corner accent for cards
// function CardAccent({ color }: { color: string }) {
//     return (
//         <svg
//             aria-hidden="true"
//             style={{
//                 position: "absolute",
//                 bottom: 0,
//                 right: 0,
//                 opacity: 0.06,
//                 pointerEvents: "none",
//                 borderRadius: "0 0 24px 0",
//             }}
//             width="120"
//             height="120"
//             viewBox="0 0 120 120"
//             fill="none"
//         >
//             <circle cx="120" cy="120" r="80" fill={color} />
//             <circle cx="120" cy="120" r="50" fill={color} />
//             <circle cx="120" cy="120" r="25" fill={color} />
//         </svg>
//     );
// }

// // Decorative SVG grid pattern for section background
// // function GridPattern() {
// //     return (
// //         <svg
// //             aria-hidden="true"
// //             style={{
// //                 position: "absolute",
// //                 inset: 0,
// //                 width: "100%",
// //                 height: "100%",
// //                 opacity: 0.03,
// //                 pointerEvents: "none",
// //             }}
// //         >
// //             <defs>
// //                 <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
// //                     <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fd5000" strokeWidth="1" />
// //                 </pattern>
// //             </defs>
// //             <rect width="100%" height="100%" fill="url(#grid)" />
// //         </svg>
// //     );
// // }

// // Decorative SVG ring for section header
// function RingDecor() {
//     return (
//         <svg
//             aria-hidden="true"
//             style={{
//                 position: "absolute",
//                 top: "-60px",
//                 left: "50%",
//                 transform: "translateX(-50%)",
//                 pointerEvents: "none",
//                 opacity: 0.07,
//             }}
//             width="500"
//             height="200"
//             viewBox="0 0 500 200"
//         >
//             <ellipse cx="250" cy="100" rx="240" ry="80" stroke="#fd5000" strokeWidth="1.5" fill="none" />
//             <ellipse cx="250" cy="100" rx="180" ry="55" stroke="#fd5000" strokeWidth="1" fill="none" />
//         </svg>
//     );
// }

// export function CorePillars() {
//     const pillars = [
//         {
//             icon: ShoppingBag,
//             title: "Marketplace",
//             tagline: "Buy & Sell Globally",
//             desc: "Thousands of verified products from trusted vendors. Shop or list your own — reach customers across 50+ countries.",
//             href: "/marketplace",
//             cta: "Explore products",
//             accent: "#fd5000",
//             bg: "rgba(253,80,0,0.06)",
//             border: "rgba(253,80,0,0.15)",
//             features: ["Verified vendors", "Secure checkout", "Global shipping"],
//             badge: null,
//         },
//         {
//             icon: DollarSign,
//             title: "Earn (Affiliate)",
//             tagline: "Earn While You Sleep",
//             desc: "Promote any product and earn up to 30% commission on every sale. No inventory, no hassle — just share and earn.",
//             href: "/affiliate",
//             cta: "Start earning free",
//             accent: "#fd5000",
//             bg: "rgba(253,80,0,0.06)",
//             border: "rgba(253,80,0,0.15)",
//             features: ["Up to 30% commission", "Real-time tracking", "Instant withdrawals"],
//             badge: null,
//         },
//         {
//             icon: Clapperboard,
//             title: "Campaigns",
//             tagline: "UGC & Clipping",
//             desc: "Join brand campaigns, create short-form content, and get paid per view. No followers required — just create.",
//             href: "/ugc",
//             cta: "Join a campaign",
//             accent: "#fd5000",
//             bg: "rgba(253,80,0,0.06)",
//             border: "rgba(253,80,0,0.15)",
//             features: ["Paid per 1K views", "Brand partnerships", "Any platform"],
//             badge: "Hot",
//         },
//         {
//             icon: Users,
//             title: "Communities",
//             tagline: "Connect & Grow",
//             desc: "Find your niche. Join communities of buyers, sellers, and creators who share your interests and goals.",
//             href: "/communities",
//             cta: "Discover communities",
//             accent: "#fd5000",
//             bg: "rgba(253,80,0,0.06)",
//             border: "rgba(253,80,0,0.15)",
//             features: ["Niche communities", "Peer networking", "Group deals"],
//             badge: null,
//         },
//     ];

//     return (
//         <section
//             className="py-20 sm:py-28"
//             style={{
//                 background: "var(--color-surface)",
//                 borderTop: "1px solid var(--color-border)",
//                 position: "relative",
//                 overflow: "hidden",
//             }}
//         >
//             {/* Decorative background grid */}
//             <GridPattern />

//             {/* Decorative top-center ring */}
//             <RingDecor />

//             {/* Decorative bottom-right blob */}
//             <svg
//                 aria-hidden="true"
//                 style={{
//                     position: "absolute",
//                     bottom: "-80px",
//                     right: "-80px",
//                     opacity: 0.04,
//                     pointerEvents: "none",
//                 }}
//                 width="320"
//                 height="320"
//                 viewBox="0 0 320 320"
//             >
//                 <circle cx="160" cy="160" r="160" fill="#fd5000" />
//             </svg>

//             <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
//                 <motion.div
//                     initial="hidden"
//                     whileInView="show"
//                     viewport={{ once: true, margin: "-80px" }}
//                     variants={stagger}
//                 >
//                     <motion.div variants={fadeUp} className="text-center mb-14" style={{ position: "relative" }}>
//                         <div
//                             style={{
//                                 display: "inline-flex",
//                                 alignItems: "center",
//                                 gap: "10px",
//                                 marginBottom: "12px",
//                             }}
//                         >
//                             <LineSVG />
//                             <p
//                                 style={{
//                                     color: "var(--color-accent, #fd5000)",
//                                     fontSize: "11px",
//                                     fontWeight: 700,
//                                     textTransform: "uppercase",
//                                     letterSpacing: "0.12em",
//                                     margin: 0,
//                                 }}
//                             >
//                                 Built for growth
//                             </p>
//                             <LineSVG />
//                         </div>

//                         <h2
//                             className="font-black tracking-tight mb-4"
//                             style={{
//                                 fontSize: "clamp(2rem, 4vw, 3rem)",
//                                 color: "var(--color-text-primary)",
//                                 letterSpacing: "-0.03em",
//                             }}
//                         >
//                             Four ways to succeed on Jimvio
//                         </h2>
//                         <p
//                             className="text-base max-w-xl mx-auto"
//                             style={{ color: "var(--color-text-muted)" }}
//                         >
//                             Whether you're a buyer, seller, creator, or affiliate — the platform is built to maximize your results.
//                         </p>
//                     </motion.div>

//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
//                         {pillars.map((p) => (
//                             <motion.div key={p.title} variants={fadeUp} style={{ position: "relative" }}>
//                                 {p.badge && (
//                                     <div
//                                         style={{
//                                             position: "absolute",
//                                             top: "-12px",
//                                             left: "20px",
//                                             zIndex: 10,
//                                             display: "inline-flex",
//                                             alignItems: "center",
//                                             gap: "4px",
//                                             padding: "4px 10px 4px 8px",
//                                             borderRadius: "999px",
//                                             background: p.accent,
//                                             boxShadow: `0 4px 14px ${p.accent}50`,
//                                             color: "#fff",
//                                             fontSize: "10px",
//                                             fontWeight: 700,
//                                             letterSpacing: "0.05em",
//                                             textTransform: "uppercase",
//                                         }}
//                                     >
//                                         <FlameIcon size={12} />
//                                         {p.badge}
//                                     </div>
//                                 )}

//                                 <Link
//                                     href={p.href}
//                                     className="group flex flex-col h-full p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1"
//                                     style={{
//                                         background: "var(--color-bg)",
//                                         border: "1px solid var(--color-border)",
//                                         position: "relative",
//                                         overflow: "hidden",
//                                     }}
//                                     onMouseEnter={(e) =>
//                                         (e.currentTarget.style.borderColor = p.border)
//                                     }
//                                     onMouseLeave={(e) =>
//                                         (e.currentTarget.style.borderColor = "var(--color-border)")
//                                     }
//                                 >
//                                     {/* Per-card decorative SVG corner */}
//                                     <CardAccent color={p.accent} />

//                                     {/* Decorative top-right crosshair */}
//                                     <CardCornerBlob size={200} />
//                                     <div
//                                         className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-105"
//                                         style={{
//                                             background: p.bg,
//                                             border: `1px solid ${p.border}`,
//                                             color: p.accent,
//                                             position: "relative",
//                                         }}
//                                     >
//                                         {/* Icon glow ring on hover */}
//                                         <svg
//                                             aria-hidden="true"
//                                             style={{
//                                                 position: "absolute",
//                                                 inset: "-4px",
//                                                 opacity: 0,
//                                                 transition: "opacity 300ms",
//                                             }}
//                                             className="group-hover:opacity-100"
//                                             width="56"
//                                             height="56"
//                                             viewBox="0 0 56 56"
//                                         >
//                                             <rect
//                                                 x="1"
//                                                 y="1"
//                                                 width="54"
//                                                 height="54"
//                                                 rx="18"
//                                                 stroke={p.accent}
//                                                 strokeWidth="1"
//                                                 strokeDasharray="6 4"
//                                                 fill="none"
//                                             />
//                                         </svg>
//                                         <p.icon className="h-5 w-5" />
//                                     </div>

//                                     <p
//                                         className="text-[14px] font-semibold uppercase tracking-normal mb-1"
//                                         style={{ color: p.accent }}
//                                     >
//                                         {p.tagline}
//                                     </p>
//                                     <h3
//                                         className="text-lg font-black mb-2.5"
//                                         style={{
//                                             color: "var(--color-text-primary)",
//                                             letterSpacing: "-0.02em",
//                                         }}
//                                     >
//                                         {p.title}
//                                     </h3>
//                                     <p
//                                         className="text-xs leading-relaxed mb-5 flex-1"
//                                         style={{ color: "var(--color-text-muted)" }}
//                                     >
//                                         {p.desc}
//                                     </p>

//                                     <ul className="space-y-1.5 mb-6">
//                                         {p.features.map((f) => (
//                                             <li key={f} className="flex items-center gap-2">
//                                                 {/* ✅ Custom SVG checkmark instead of Lucide CheckCircle */}
//                                                 <svg
//                                                     aria-hidden="true"
//                                                     width="14"
//                                                     height="14"
//                                                     viewBox="0 0 14 14"
//                                                     fill="none"
//                                                     style={{ flexShrink: 0 }}
//                                                 >
//                                                     <circle cx="7" cy="7" r="6.5" stroke={p.accent} strokeWidth="1" fill={p.bg} />
//                                                     <polyline
//                                                         points="4,7 6,9 10,5"
//                                                         stroke={p.accent}
//                                                         strokeWidth="1.5"
//                                                         strokeLinecap="round"
//                                                         strokeLinejoin="round"
//                                                         fill="none"
//                                                     />
//                                                 </svg>
//                                                 <span
//                                                     className="text-xs font-medium"
//                                                     style={{ color: "var(--color-text-secondary)" }}
//                                                 >
//                                                     {f}
//                                                 </span>
//                                             </li>
//                                         ))}
//                                     </ul>

//                                     <div
//                                         className="flex items-center gap-1.5 text-xs font-bold transition-all group-hover:gap-2.5"
//                                         style={{ color: p.accent }}
//                                     >
//                                         {p.cta}
//                                         {/* ✅ Custom SVG arrow */}
//                                         <svg
//                                             aria-hidden="true"
//                                             width="14"
//                                             height="14"
//                                             viewBox="0 0 14 14"
//                                             fill="none"
//                                         >
//                                             <path
//                                                 d="M2 7H12M8 3L12 7L8 11"
//                                                 stroke="currentColor"
//                                                 strokeWidth="1.5"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                             />
//                                         </svg>
//                                     </div>
//                                 </Link>
//                             </motion.div>
//                         ))}
//                     </div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }
// /* ═══════════════════════════════════════════════
//    CATEGORY BROWSE
// ═══════════════════════════════════════════════ */
// // ─── Shared SVG Decorators ───────────────────────────────────────────────────

// function GridPattern({ id = "grid", color = "#fd5000", opacity = 0.03 }) {
//     return (
//         <svg
//             aria-hidden="true"
//             style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, pointerEvents: "none" }}
//         >
//             <defs>
//                 <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
//                     <path d="M 40 0 L 0 0 0 40" fill="none" stroke={color} strokeWidth="1" />
//                 </pattern>
//             </defs>
//             <rect width="100%" height="100%" fill={`url(#${id})`} />
//         </svg>
//     );
// }

// function DashedEyebrow() {
//     return (
//         <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
//             <svg aria-hidden="true" width="24" height="1" viewBox="0 0 24 1">
//                 <line x1="0" y1="0.5" x2="24" y2="0.5" stroke="#fd5000" strokeWidth="1.5" strokeDasharray="4 3" />
//             </svg>
//             <slot />
//             <svg aria-hidden="true" width="24" height="1" viewBox="0 0 24 1">
//                 <line x1="0" y1="0.5" x2="24" y2="0.5" stroke="#fd5000" strokeWidth="1.5" strokeDasharray="4 3" />
//             </svg>
//         </div>
//     );
// }

// function StarIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
//     return (
//         <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
//             <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
//         </svg>
//     );
// }

// function FlameIcon({ size = 14 }: { size?: number }) {
//     return (
//         <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
//             <path d="M12 2C12 2 9 7 9 10.5C9 12.4 10.1 14 12 14C13.9 14 15 12.4 15 10.5C15 10.5 17 12 17 15C17 18.3 14.8 21 12 21C9.2 21 7 18.3 7 15C7 10 12 2 12 2Z" />
//             <path d="M12 14C10.1 14 9 12.4 9 10.5C9 10.5 10 13 12 13C14 13 15 10.5 15 10.5C15 12.4 13.9 14 12 14Z" fill="rgba(255,255,255,0.4)" />
//         </svg>
//     );
// }

// function ArrowSVG({ size = 14 }: { size?: number }) {
//     return (
//         <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
//             <path d="M2 7H12M8 3L12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//         </svg>
//     );
// }

// function CheckSVG({ color }: { color: string }) {
//     return (
//         <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
//             <circle cx="7" cy="7" r="6.5" stroke={color} strokeWidth="1" fill="rgba(253,80,0,0.06)" />
//             <polyline points="4,7 6,9 10,5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
//         </svg>
//     );
// }

// function CrosshairSVG({ color }: { color: string }) {
//     return (
//         <svg
//             aria-hidden="true"
//             width="20" height="20" viewBox="0 0 20 20" fill="none"
//             style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.12, pointerEvents: "none" }}
//         >
//             <circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.5" />
//             <line x1="10" y1="2" x2="10" y2="18" stroke={color} strokeWidth="1.5" />
//             <line x1="2" y1="10" x2="18" y2="10" stroke={color} strokeWidth="1.5" />
//         </svg>
//     );
// }

// function CardCornerBlob({
//     color = "var(--color-accent)",
//     size = 320,
//     opacity = 0.1,
//     rings = 3,
//     position = "top-right",
//     strokeWidth = 1.5,
// }: {
//     color?: string;
//     size?: number;
//     opacity?: number;
//     rings?: number;
//     position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
//     strokeWidth?: number;
// }) {
//     const positionStyles: Record<typeof position, React.CSSProperties> = {
//         "top-right": { top: 0, right: 0 },
//         "top-left": { top: 0, left: 0, transform: "scaleX(-1)" },
//         "bottom-right": { bottom: 0, right: 0, transform: "scaleY(-1)" },
//         "bottom-left": { bottom: 0, left: 0, transform: "scale(-1)" },
//     };

//     // Distribute ring radii evenly from size * 0.25 up to size * 0.625
//     const minR = size * 0.25;
//     const maxR = size * 0.625;
//     const radii = Array.from({ length: rings }, (_, i) =>
//         rings === 1 ? maxR : minR + ((maxR - minR) / (rings - 1)) * i
//     );

//     return (
//         <svg
//             aria-hidden
//             style={{
//                 position: "absolute",
//                 width: size,
//                 height: size,
//                 opacity,
//                 pointerEvents: "none",
//                 ...positionStyles[position],
//             }}
//             viewBox={`0 0 ${size} ${size}`}
//             fill="none"
//         >
//             {radii.map((r, i) => (
//                 <circle
//                     key={i}
//                     cx={size}
//                     cy={0}
//                     r={r}
//                     stroke={color}
//                     strokeWidth={strokeWidth}
//                 />
//             ))}
//         </svg>
//     );
// }

// function ConnectorArrowSVG() {
//     return (
//         <svg
//             aria-hidden="true"
//             style={{ position: "absolute", top: "50%", right: "-18px", transform: "translateY(-50%)", zIndex: 20 }}
//             width="20" height="20" viewBox="0 0 20 20" fill="none"
//         >
//             <circle cx="10" cy="10" r="9" fill="var(--color-bg)" stroke="var(--color-border)" strokeWidth="1" />
//             <path d="M7 10H13M10 7L13 10L10 13" stroke="#fd5000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//         </svg>
//     );
// }

// function LineSVG() {
//     return (
//         <svg aria-hidden="true" width="20" height="1" viewBox="0 0 20 1">
//             <line x1="0" y1="0.5" x2="20" y2="0.5" stroke="#fd5000" strokeWidth="2.5" />
//         </svg>)
// }
// // ─── CategoryBrowse ──────────────────────────────────────────────────────────
// function CategoryBrowse() {
//     const cats = [
//         { name: "Electronics", count: "2.4K+", icon: Zap },
//         { name: "Fashion", count: "5.1K+", icon: Tag },
//         { name: "Home & Living", count: "1.8K+", icon: Layers },
//         { name: "Health", count: "890+", icon: Heart },
//         { name: "Business", count: "1.2K+", icon: BarChart3 },
//         { name: "Local Vendors", count: "640+", icon: MapPin },
//     ];

//     return (
//         <section
//             className="py-20 sm:py-28"
//             style={{ background: "var(--color-bg)", position: "relative", overflow: "hidden" }}
//         >
//             <GridPattern id="cat-grid" />

//             {/* Decorative bottom-left blob */}
//             <svg aria-hidden="true" style={{ position: "absolute", bottom: "-60px", left: "-60px", opacity: 0.04, pointerEvents: "none" }} width="260" height="260" viewBox="0 0 260 260">
//                 <circle cx="130" cy="130" r="130" fill="#fd5000" />
//             </svg>

//             <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
//                 <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
//                     <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
//                         <div>
//                             {/* Dashed eyebrow */}
//                             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
//                                 <LineSVG />
//                                 <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)", margin: 0 }}>
//                                     Product categories
//                                 </p>
//                             </div>
//                             <h2
//                                 className="font-black tracking-tight"
//                                 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
//                             >
//                                 Browse by category
//                             </h2>
//                         </div>
//                         <Link
//                             href="/marketplace"
//                             className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0"
//                             style={{ color: "var(--color-accent)" }}
//                         >
//                             View all products
//                             {/* SVG chevron replaces Lucide ChevronRight */}
//                             <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
//                                 <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//                             </svg>
//                         </Link>
//                     </motion.div>

//                     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
//                         {cats.map((cat) => (
//                             <motion.div key={cat.name} variants={fadeUp}>
//                                 <Link
//                                     href={`/marketplace?category=${cat.name.toLowerCase().replace(/ /g, "-")}`}
//                                     className="group flex flex-col items-center text-center p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
//                                     style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", position: "relative", overflow: "hidden" }}
//                                     onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.3)")}
//                                     onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                                 >
//                                     <CardCornerBlob color="#fd5000" size={100} />
//                                     <CardCornerBlob color="#fd5000" size={100} position="bottom-left" />
//                                     <div
//                                         className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
//                                         style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)", position: "relative" }}
//                                     >
//                                         {/* Dashed hover ring around icon */}
//                                         <svg
//                                             aria-hidden="true"
//                                             style={{ position: "absolute", inset: "-4px", opacity: 0, transition: "opacity 250ms" }}
//                                             className="group-hover:opacity-100"
//                                             width="56" height="56" viewBox="0 0 56 56"
//                                         >
//                                             <rect x="1" y="1" width="54" height="54" rx="14" stroke="#fd5000" strokeWidth="1" strokeDasharray="5 4" fill="none" />
//                                         </svg>
//                                         <cat.icon className="h-5 w-5" />
//                                     </div>

//                                     <p className="text-xs font-bold mb-1 leading-tight" style={{ color: "var(--color-text-primary)" }}>
//                                         {cat.name}
//                                     </p>
//                                     <p className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
//                                         {cat.count} items
//                                     </p>
//                                 </Link>
//                             </motion.div>
//                         ))}
//                     </div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// // ─── AffiliateSpotlight ──────────────────────────────────────────────────────
// type AffiliateCampaign = {
//     id: string;
//     slug: string;
//     title: string;
//     campaign_type: string;   // product_type from DB ("digital", "physical", etc.)
//     commission: number;
//     price: number;
//     currency: string;
//     image: string | null;    // first image from images[]
//     is_featured: boolean;
// };

// type AffiliateStats = {
//     affiliateCount: number;
//     affiliateSkus: number;
//     totalProducts: number;
// };
// const DEFAULT_COMMISSION = 10;
// const AFFILIATE_FALLBACK: AffiliateCampaign[] = [
//     { id: "1", slug: "skincare", title: "Premium Skincare Bundle", campaign_type: "Physical", commission: 18, price: 48, currency: "USD", image: null, is_featured: false },
//     { id: "2", slug: "tech-acc", title: "Wireless Tech Accessories", campaign_type: "Digital", commission: 24, price: 129, currency: "USD", image: null, is_featured: true },
//     { id: "3", slug: "fashion", title: "Fashion Haul Collection", campaign_type: "Physical", commission: 12, price: 85, currency: "USD", image: null, is_featured: false },
//     { id: "4", slug: "home", title: "Home Decor Essentials", campaign_type: "Digital", commission: 15, price: 39, currency: "USD", image: null, is_featured: false },
// ];
// export function AffiliateSpotlight() {
//     const [cards, setCards] = useState<AffiliateCampaign[]>(AFFILIATE_FALLBACK);
//     const [affiliateStats, setAffiliateStats] = useState<AffiliateStats>({ affiliateCount: 0, affiliateSkus: 0, totalProducts: 0 });
//     const [maxRate, setMaxRate] = useState(0);

//     useEffect(() => {
//         async function fetchData() {
//             const db = createClient();
//             const { data, count, error } = await db
//                 .from("products")
//                 .select("id, slug, name, product_type, affiliate_commission_rate, price, currency, images, is_featured, status, is_active, affiliate_enabled", { count: "exact" })
//                 .eq("status", "active").eq("is_active", true).eq("affiliate_enabled", true);
//             if (error) { console.error("Supabase error:", error); return; }
//             const spotlight = data ?? [];
//             const fetchedMaxRate = spotlight.reduce((m: number, p: any) => Math.max(m, Number(p.affiliate_commission_rate ?? 0)), 0);
//             const displayCampaigns: AffiliateCampaign[] = spotlight.map((p: any) => ({
//                 id: p.id, slug: p.slug ?? p.id, title: p.name,
//                 campaign_type: p.product_type ? p.product_type.charAt(0).toUpperCase() + p.product_type.slice(1) : "Affiliate",
//                 commission: Number(p.affiliate_commission_rate ?? DEFAULT_COMMISSION),
//                 price: Number(p.price ?? 0), currency: p.currency ?? "USD",
//                 image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
//                 is_featured: !!p.is_featured,
//             }));
//             setMaxRate(fetchedMaxRate);
//             setAffiliateStats({ affiliateCount: spotlight.length, affiliateSkus: spotlight.length, totalProducts: count ?? spotlight.length });
//             if (displayCampaigns.length > 0) setCards(displayCampaigns);
//         }
//         fetchData();
//     }, []);

//     const heroRate = maxRate > 0 ? Math.round(maxRate) : DEFAULT_COMMISSION;
//     const statsGrid = [
//         { label: "Active Affiliates", value: affiliateStats.affiliateCount ? formatPlatformCount(affiliateStats.affiliateCount) : "—" },
//         { label: "Affiliate-ready SKUs", value: affiliateStats.affiliateSkus ? formatPlatformCount(affiliateStats.affiliateSkus) : "—" },
//         { label: "Top commission rate", value: maxRate > 0 ? `${Math.round(maxRate)}%` : `${heroRate}%` },
//         { label: "Live products", value: affiliateStats.totalProducts ? formatPlatformCount(affiliateStats.totalProducts) : "—" },
//     ];

//     return (
//         <section
//             className="py-20 sm:py-28"
//             style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", position: "relative", overflow: "hidden" }}
//         >
//             <GridPattern id="aff-grid" opacity={0.025} />

//             {/* Top-right decorative arc */}
//             <svg aria-hidden="true" style={{ position: "absolute", top: "-40px", right: "-40px", opacity: 0.05, pointerEvents: "none" }} width="300" height="300" viewBox="0 0 300 300">
//                 <circle cx="300" cy="0" r="180" stroke="#fd5000" strokeWidth="1.5" fill="none" />
//                 <circle cx="300" cy="0" r="120" stroke="#fd5000" strokeWidth="1" fill="none" />
//             </svg>

//             <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
//                 <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

//                     {/* Header */}
//                     <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mb-12">
//                         <div>
//                             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
//                                 <LineSVG />
//                                 <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)", margin: 0 }}>
//                                     Affiliate program
//                                 </p>
//                             </div>
//                             <h2 className="font-black tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}>
//                                 Earn commissions on<br />every product you share
//                             </h2>
//                             <p className="text-base max-w-lg" style={{ color: "var(--color-text-muted)" }}>
//                                 Get your unique affiliate link. Share anywhere. Earn up to{" "}
//                                 <strong style={{ color: "var(--color-accent)" }}>{heroRate}%</strong> on every purchase — automatically tracked and paid.
//                             </p>
//                         </div>

//                         {/* Stats sidebar */}
//                         <div
//                             className="flex flex-col gap-4 p-5 rounded-2xl shrink-0 w-full lg:w-56"
//                             style={{ background: "rgba(253,80,0,0.05)", border: "1px solid rgba(253,80,0,0.15)", position: "relative", overflow: "hidden" }}
//                         >
//                             <CardCornerBlob color="#fd5000" />
//                             {statsGrid.map((row) => (
//                                 <div key={row.label} className="flex items-center justify-between" style={{ position: "relative" }}>
//                                     <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
//                                     <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>{row.value}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </motion.div>

//                     <SwipeableCardGrid
//                         items={cards}
//                         cols={{ sm: 2, lg: 4 }}
//                         renderCard={(c) => (
//                             <motion.div key={c.id} variants={fadeUp} style={{ position: "relative" }}>

//                                 {/* ✅ SVG star badge replaces ⭐ emoji */}
//                                 {c.is_featured && (
//                                     <div
//                                         style={{
//                                             position: "absolute", top: "-12px", left: "16px", zIndex: 10,
//                                             display: "inline-flex", alignItems: "center", gap: "4px",
//                                             padding: "4px 10px 4px 8px", borderRadius: "999px",
//                                             background: "var(--color-accent)", color: "#fff",
//                                             fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em",
//                                             textTransform: "uppercase", boxShadow: "0 4px 14px rgba(253,80,0,0.45)",
//                                         }}
//                                     >
//                                         <StarIcon size={11} color="#fff" />
//                                         Featured
//                                     </div>
//                                 )}

//                                 <Link
//                                     href={`/marketplace/${c.slug}`}
//                                     className="group flex flex-col rounded-2xl h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
//                                     style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
//                                     onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.35)")}
//                                     onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                                 >
//                                     {/* Product image */}
//                                     <div
//                                         className="relative w-full overflow-hidden"
//                                         style={{ height: "160px", background: c.image ? "transparent" : "rgba(253,80,0,0.06)", borderBottom: "1px solid var(--color-border)" }}
//                                     >
//                                         {c.image ? (
//                                             <img src={c.image} alt={c.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
//                                         ) : (
//                                             <div className="w-full h-full flex items-center justify-center">
//                                                 {/* SVG package placeholder replaces Lucide Package */}
//                                                 <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
//                                                     <rect x="4" y="12" width="32" height="24" rx="3" stroke="rgba(253,80,0,0.3)" strokeWidth="1.5" fill="rgba(253,80,0,0.06)" />
//                                                     <path d="M4 18H36" stroke="rgba(253,80,0,0.2)" strokeWidth="1" />
//                                                     <path d="M14 12V6C14 5.4 14.4 5 15 5H25C25.6 5 26 5.4 26 6V12" stroke="rgba(253,80,0,0.3)" strokeWidth="1.5" strokeLinecap="round" />
//                                                     <path d="M16 22H24" stroke="rgba(253,80,0,0.3)" strokeWidth="1.5" strokeLinecap="round" />
//                                                 </svg>
//                                             </div>
//                                         )}

//                                         {/* Type pill */}
//                                         <div
//                                             className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
//                                             style={{ background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(4px)" }}
//                                         >
//                                             {c.campaign_type}
//                                         </div>

//                                         {/* Commission badge with SVG dollar icon */}
//                                         <div
//                                             className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black"
//                                             style={{ background: "var(--color-accent)", color: "#fff" }}
//                                         >
//                                             <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
//                                                 <path d="M5 1V9M3 3.5C3 2.7 3.9 2 5 2S7 2.7 7 3.5 6.1 5 5 5 3 5.7 3 6.5 3.9 8 5 8s2-.7 2-1.5" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
//                                             </svg>
//                                             {c.commission}% commission
//                                         </div>
//                                     </div>

//                                     {/* Card body */}
//                                     <div className="flex flex-col flex-1 p-4 gap-3">
//                                         <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "var(--color-text-primary)" }}>
//                                             {c.title}
//                                         </p>
//                                         <div className="flex items-center justify-between">
//                                             <span className="text-lg font-black" style={{ color: "var(--color-text-primary)" }}>
//                                                 {c.currency === "USD" ? "$" : c.currency}{c.price.toFixed(2)}
//                                             </span>
//                                             <span
//                                                 className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
//                                                 style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)", border: "1px solid rgba(253,80,0,0.18)" }}
//                                             >
//                                                 Affiliate enabled
//                                             </span>
//                                         </div>

//                                         {/* Earnings estimate */}
//                                         <div
//                                             className="flex items-center justify-between p-3 rounded-xl mt-auto"
//                                             style={{ background: "rgba(253,80,0,0.05)", border: "1px solid rgba(253,80,0,0.12)" }}
//                                         >
//                                             <div>
//                                                 <p className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>You earn per sale</p>
//                                                 <p className="text-base font-black" style={{ color: "var(--color-accent)" }}>
//                                                     {c.currency === "USD" ? "$" : c.currency}{((c.price * c.commission) / 100).toFixed(2)}
//                                                 </p>
//                                             </div>
//                                             <div
//                                                 className="flex items-center gap-1 text-xs font-bold transition-all group-hover:gap-2"
//                                                 style={{ color: "var(--color-accent)" }}
//                                             >
//                                                 Get link
//                                                 {/* SVG external link replaces Lucide ExternalLink */}
//                                                 <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
//                                                     <path d="M5 2H2C1.4 2 1 2.4 1 3V11C1 11.6 1.4 12 2 12H10C10.6 12 11 11.6 11 11V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
//                                                     <path d="M8 1H12M12 1V5M12 1L6 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//                                                 </svg>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </Link>
//                             </motion.div>
//                         )}
//                     />

//                     {/* CTA */}
//                     <motion.div variants={fadeUp} className="flex justify-center mt-9">
//                         <Link
//                             href="/affiliate"
//                             className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl text-sm font-bold text-white"
//                             style={{ background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
//                             onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                             onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
//                         >
//                             Browse all affiliate products <ArrowSVG size={16} />
//                         </Link>
//                     </motion.div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// // ─── HowItWorks ──────────────────────────────────────────────────────────────

// function HowItWorks() {
//     const steps = [
//         { num: "01", icon: Users, title: "Create your free account", desc: "Sign up in 60 seconds. No credit card required." },
//         { num: "02", icon: Search, title: "Pick your path", desc: "Sell products, become an affiliate, or join communities." },
//         { num: "03", icon: Store, title: "List or promote", desc: "Add your own products or share links to earn commissions." },
//         { num: "04", icon: Wallet, title: "Get paid", desc: "Withdraw earnings directly to your account, any time." },
//     ];

//     return (
//         <section
//             className="py-20 sm:py-28"
//             style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", position: "relative", overflow: "hidden" }}
//         >
//             <GridPattern id="how-grid" opacity={0.025} />

//             {/* Decorative center glow ring */}
//             <svg aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.04, pointerEvents: "none" }} width="600" height="300" viewBox="0 0 600 300">
//                 <ellipse cx="300" cy="150" rx="290" ry="120" stroke="#fd5000" strokeWidth="1.5" fill="none" />
//                 <ellipse cx="300" cy="150" rx="220" ry="85" stroke="#fd5000" strokeWidth="1" fill="none" />
//             </svg>

//             <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
//                 <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
//                     <motion.div variants={fadeUp} className="text-center mb-14">
//                         <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
//                             <LineSVG />
//                             <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)", margin: 0 }}>
//                                 Simple to start
//                             </p>
//                             <LineSVG />
//                         </div>
//                         <h2 className="font-black tracking-tight mb-3" style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}>
//                             From zero to earning<br />in 4 steps
//                         </h2>
//                         <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
//                             No experience needed. Built for anyone ready to grow online.
//                         </p>
//                     </motion.div>

//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
//                         {steps.map((step, i) => (
//                             <motion.div key={step.num} variants={fadeUp}>
//                                 <div
//                                     className="relative flex flex-col p-6 rounded-2xl h-full"
//                                     style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", overflow: "hidden" }}
//                                 >
//                                     <CardCornerBlob color="#fd5000" />
//                                     {/* <CrosshairSVG color="#fd5000" /> */}

//                                     {/* Large ghost step number */}
//                                     <div
//                                         className="absolute top-4 right-4 font-black leading-none select-none"
//                                         style={{ fontSize: "4.5rem", color: "rgba(253,80,0,0.06)", lineHeight: 1, pointerEvents: "none" }}
//                                     >
//                                         {step.num}
//                                     </div>

//                                     <div
//                                         className="h-12 w-12 rounded-xl flex items-center justify-center mb-5 z-10"
//                                         style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.15)", color: "var(--color-accent)", position: "relative" }}
//                                     >
//                                         {/* Step number badge on icon */}
//                                         <div style={{
//                                             position: "absolute", top: "-6px", left: "-6px",
//                                             width: "16px", height: "16px", borderRadius: "50%",
//                                             background: "#fd5000", color: "#fff",
//                                             fontSize: "8px", fontWeight: 900,
//                                             display: "flex", alignItems: "center", justifyContent: "center",
//                                         }}>
//                                             {i + 1}
//                                         </div>
//                                         <step.icon className="h-5 w-5" />
//                                     </div>

//                                     <p className="text-base font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{step.title}</p>
//                                     <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{step.desc}</p>

//                                     {/* ✅ SVG connector arrow replaces plain dot */}
//                                     {i < steps.length - 1 && (
//                                         <div className="hidden lg:block">
//                                             <ConnectorArrowSVG />
//                                         </div>
//                                     )}
//                                 </div>
//                             </motion.div>
//                         ))}
//                     </div>

//                     <motion.div variants={fadeUp} className="flex justify-center mt-10">
//                         <Link
//                             href="/register"
//                             className="inline-flex items-center gap-2.5 px-9 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
//                             style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
//                             onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                             onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
//                         >
//                             Get started free <ArrowSVG size={16} />
//                         </Link>
//                     </motion.div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// // ─── TrustSection ────────────────────────────────────────────────────────────

// function TrustSection({ stats: trustStats }: { stats?: HomepageRedesignProps["stats"] }) {
//     const s = trustStats ?? { users: "10K+", earned: "$1M+", secure: "99.9%", countries: "50+" };
//     const items = [
//         { value: s.users, label: "Active users", icon: Users, sub: "and growing daily" },
//         { value: s.earned, label: "Total paid out", icon: DollarSign, sub: "to creators & sellers" },
//         { value: s.secure, label: "Platform uptime", icon: Shield, sub: "always available" },
//         { value: s.countries, label: "Countries", icon: Globe, sub: "worldwide reach" },
//     ];

//     return (
//         <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)", position: "relative", overflow: "hidden" }}>
//             <GridPattern id="trust-grid" opacity={0.02} />

//             <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
//                 <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
//                     <motion.div variants={fadeUp} className="text-center mb-14">
//                         <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
//                             <LineSVG />
//                             <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)", margin: 0 }}>
//                                 By the numbers
//                             </p>
//                             <LineSVG />
//                         </div>
//                         <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}>
//                             Trusted by thousands globally
//                         </h2>
//                     </motion.div>

//                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//                         {items.map((item, i) => (
//                             <motion.div key={item.label} variants={fadeUp}>
//                                 <div
//                                     className="flex flex-col items-center text-center p-7 rounded-2xl"
//                                     style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", position: "relative", overflow: "hidden" }}
//                                 >
//                                     <CardCornerBlob color="#fd5000" />

//                                     {/* Decorative arc behind stat value */}
//                                     <svg aria-hidden="true" style={{ position: "absolute", top: "8px", left: "50%", transform: "translateX(-50%)", opacity: 0.05, pointerEvents: "none" }} width="120" height="60" viewBox="0 0 120 60">
//                                         <path d="M10 60 Q60 10 110 60" stroke="#fd5000" strokeWidth="1.5" fill="none" />
//                                     </svg>

//                                     <div
//                                         className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5"
//                                         style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.15)", color: "var(--color-accent)", position: "relative" }}
//                                     >
//                                         {/* Rank badge */}
//                                         <div style={{
//                                             position: "absolute", top: "-6px", right: "-6px",
//                                             width: "16px", height: "16px",
//                                         }}>
//                                             <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
//                                                 <circle cx="8" cy="8" r="7.5" fill="#fd5000" />
//                                                 <text x="8" y="11.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="white">{i + 1}</text>
//                                             </svg>
//                                         </div>
//                                         <item.icon className="h-5 w-5" />
//                                     </div>

//                                     <p className="font-black mb-1" style={{ fontSize: "clamp(2rem, 3vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
//                                         {item.value}
//                                     </p>
//                                     <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>{item.label}</p>
//                                     <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{item.sub}</p>
//                                 </div>
//                             </motion.div>
//                         ))}
//                     </div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// // ─── VendorBanner ────────────────────────────────────────────────────────────

// function VendorBanner() {
//     return (
//         <section
//             className="py-16 sm:py-20"
//             style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}
//         >
//             <div className="max-w-8xl mx-auto px-4 sm:px-6">
//                 <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
//                     <motion.div
//                         variants={fadeUp}
//                         className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
//                         style={{ background: "linear-gradient(135deg, #0d0600 0%, #1a0800 50%, #0d0600 100%)", border: "1px solid rgba(253,80,0,0.2)" }}
//                     >
//                         {/* Radial glow */}
//                         <div className="absolute top-0 right-0 w-[400px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(253,80,0,0.15) 0%, transparent 60%)" }} />

//                         {/* Grid overlay */}
//                         <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(253,80,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(253,80,0,0.6) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

//                         {/* Decorative SVG rings */}
//                         <svg aria-hidden="true" style={{ position: "absolute", bottom: "-60px", left: "30%", opacity: 0.06, pointerEvents: "none" }} width="300" height="300" viewBox="0 0 300 300">
//                             <circle cx="150" cy="150" r="140" stroke="#fd5000" strokeWidth="1.5" fill="none" />
//                             <circle cx="150" cy="150" r="100" stroke="#fd5000" strokeWidth="1" fill="none" />
//                             <circle cx="150" cy="150" r="60" stroke="#fd5000" strokeWidth="0.5" fill="none" />
//                         </svg>

//                         {/* Decorative top-left crosshair */}
//                         <svg aria-hidden="true" style={{ position: "absolute", top: "20px", left: "20px", opacity: 0.15, pointerEvents: "none" }} width="28" height="28" viewBox="0 0 28 28">
//                             <circle cx="14" cy="14" r="12" stroke="#fd5000" strokeWidth="1" fill="none" />
//                             <line x1="14" y1="2" x2="14" y2="26" stroke="#fd5000" strokeWidth="1" />
//                             <line x1="2" y1="14" x2="26" y2="14" stroke="#fd5000" strokeWidth="1" />
//                         </svg>

//                         <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
//                             <div>
//                                 <div className="flex items-center gap-2.5 mb-5">
//                                     {/* SVG award icon replaces Lucide Award */}
//                                     <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ color: "var(--color-accent)", flexShrink: 0 }}>
//                                         <circle cx="10" cy="8" r="5.5" stroke="#fd5000" strokeWidth="1.5" />
//                                         <path d="M6.5 12.5L5 18L10 15.5L15 18L13.5 12.5" stroke="#fd5000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//                                     </svg>
//                                     <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>
//                                         For vendors &amp; sellers
//                                     </span>
//                                 </div>
//                                 <h2 className="font-black text-white tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", letterSpacing: "-0.025em" }}>
//                                     Ready to reach your<br />
//                                     <span style={{ color: "var(--color-accent)" }}>first 1,000 customers?</span>
//                                 </h2>
//                                 <p className="text-white/60 text-base max-w-lg">
//                                     List your products for free. Access our global network of buyers, affiliates and communities ready to share your brand.
//                                 </p>
//                             </div>
//                             <div className="flex flex-col gap-3 shrink-0">
//                                 <Link
//                                     href="/vendor/register"
//                                     className="inline-flex items-center justify-center gap-2.5 px-8 rounded-2xl text-sm font-bold text-white transition-all"
//                                     style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.4)" }}
//                                     onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                                     onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
//                                 >
//                                     Open your store
//                                     {/* SVG store icon replaces Lucide Store */}
//                                     <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
//                                         <path d="M2 6.5L3.5 2H12.5L14 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//                                         <path d="M1.5 6.5H14.5V14H1.5V6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
//                                         <path d="M6 14V10H10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//                                     </svg>
//                                 </Link>
//                                 <Link
//                                     href="/marketplace"
//                                     className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-2xl text-sm font-semibold text-white/70 border border-white/10 hover:border-white/25 transition-all"
//                                 >
//                                     Browse marketplace
//                                 </Link>
//                             </div>
//                         </div>
//                     </motion.div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// // ─── FinalCTA ────────────────────────────────────────────────────────────────

// function FinalCTA() {
//     const trustItems = [
//         {
//             label: "No setup fees",
//             // SVG checkmark circle replaces Lucide CheckCircle
//             svg: (
//                 <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//                     <circle cx="7" cy="7" r="6.5" stroke="#fd5000" strokeWidth="1" fill="rgba(253,80,0,0.06)" />
//                     <polyline points="4,7 6,9 10,5" stroke="#fd5000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
//                 </svg>
//             ),
//         },
//         {
//             label: "Secure & private",
//             // SVG shield replaces Lucide Shield
//             svg: (
//                 <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//                     <path d="M7 1.5L2 3.5V7C2 9.8 4.2 12.2 7 13C9.8 12.2 12 9.8 12 7V3.5L7 1.5Z" stroke="#fd5000" strokeWidth="1" fill="rgba(253,80,0,0.06)" />
//                     <polyline points="4.5,7 6.5,9 9.5,5" stroke="#fd5000" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
//                 </svg>
//             ),
//         },
//         {
//             label: "Works globally",
//             // SVG globe replaces Lucide Globe
//             svg: (
//                 <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//                     <circle cx="7" cy="7" r="5.5" stroke="#fd5000" strokeWidth="1" fill="rgba(253,80,0,0.06)" />
//                     <path d="M7 1.5C7 1.5 5 4 5 7C5 10 7 12.5 7 12.5M7 1.5C7 1.5 9 4 9 7C9 10 7 12.5 7 12.5M1.5 7H12.5" stroke="#fd5000" strokeWidth="0.9" strokeLinecap="round" />
//                 </svg>
//             ),
//         },
//     ];

//     return (
//         <section className="py-24 sm:py-32" style={{ background: "var(--color-bg)", position: "relative", overflow: "hidden" }}>
//             <GridPattern id="cta-grid" opacity={0.02} />

//             {/* Decorative concentric rings behind heading */}
//             <svg aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.04, pointerEvents: "none" }} width="700" height="400" viewBox="0 0 700 400">
//                 <ellipse cx="350" cy="200" rx="340" ry="180" stroke="#fd5000" strokeWidth="1.5" fill="none" />
//                 <ellipse cx="350" cy="200" rx="260" ry="130" stroke="#fd5000" strokeWidth="1" fill="none" />
//                 <ellipse cx="350" cy="200" rx="180" ry="85" stroke="#fd5000" strokeWidth="0.75" fill="none" />
//             </svg>

//             <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center" style={{ position: "relative" }}>
//                 <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

//                     <motion.div variants={fadeUp}>
//                         <div
//                             className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 text-xs font-bold"
//                             style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.18)", color: "var(--color-accent)" }}
//                         >
//                             {/* SVG star replaces Lucide Star */}
//                             <StarIcon size={14} color="#fd5000" />
//                             Free forever — no credit card needed
//                         </div>
//                     </motion.div>

//                     <motion.h2
//                         variants={fadeUp}
//                         className="font-black tracking-tight mb-5"
//                         style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "var(--color-text-primary)", letterSpacing: "-0.035em", lineHeight: 1.05 }}
//                     >
//                         Your growth starts<br />
//                         <span style={{ color: "var(--color-accent)" }}>today.</span>
//                     </motion.h2>

//                     <motion.p variants={fadeUp} className="text-base leading-relaxed mb-10 max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
//                         Thousands of vendors and affiliates already growing on Jimvio. Join for free and see the difference.
//                     </motion.p>

//                     <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
//                         <Link
//                             href="/register"
//                             className="group inline-flex items-center justify-center gap-2.5 px-10 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97]"
//                             style={{ height: "56px", background: "var(--color-accent)", boxShadow: "0 10px 32px rgba(253,80,0,0.32)" }}
//                             onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                             onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
//                         >
//                             Create Free Account
//                             <ArrowSVG size={18} />
//                         </Link>
//                         <Link
//                             href="/marketplace"
//                             className="inline-flex items-center justify-center gap-2 px-8 rounded-2xl text-base font-semibold transition-all"
//                             style={{ height: "56px", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
//                             onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
//                             onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
//                         >
//                             Explore first
//                         </Link>
//                     </motion.div>

//                     <motion.div variants={fadeUp} className="flex items-center justify-center gap-6 mt-10 flex-wrap">
//                         {trustItems.map(({ svg, label }) => (
//                             <div key={label} className="flex items-center gap-1.5">
//                                 {svg}
//                                 <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
//                             </div>
//                         ))}
//                     </motion.div>

//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// /* ═══════════════════════════════════════════════
//    ROOT EXPORT
// ═══════════════════════════════════════════════ */
// export function HomepageRedesign({ campaigns = [], communities = [], stats }: HomepageRedesignProps) {
//     return (
//         <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
//             <Ticker />
//             <Hero />
//             <CorePillars />
//             <CategoryBrowse />
//             <UGCCampaigns campaigns={campaigns} />
//             <AffiliateSpotlight />
//             <CommunitiesSection
//                 communities={communities}
//                 heading="Top Communities"
//                 eyebrow="Discover"
//                 seeAllHref="/communities"
//                 limit={6}
//             />
//             <HowItWorks />
//             <TrustSection stats={stats} />
//             <VendorBanner />
//             <FinalCTA />
//         </div>
//     );
// }

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ShoppingBag,
    Users,
    DollarSign,
    ArrowRight,
    Star,
    Shield,
    Globe,
    Store,
    Zap,
    MapPin,
    Tag,
    BarChart3,
    Heart,
    Layers,
    Search,
    Wallet,
    Clapperboard,
} from "lucide-react";

import { Hero } from "./hero";
import { SharedCampaignCard, SharedCampaignRow } from "../ugc/campaign-card-shared";
import { formatPlatformCount } from "@/lib/platform-settings-shared";
import { createClient } from "@/lib/supabase/client";
import CommunitiesSection from "./communities-section";
import { SwipeableCardGrid } from "../ui/swipeable-card-grid";

import {
    GridPattern,
    CornerBlob,
    EdgeGlow,
    RingDecor,
    ConnectorArrow,
    Eyebrow,
    StarIcon,
    FlameIcon,
    ArrowSVG,
    CheckSVG,
    PackageSVG,
    DollarCircle,
    ExternalLinkSVG,
    StoreSVG,
    AwardSVG,
    IconWrapper,
} from "@/components/ui/decorator";

/* ─── Animation variants ─── */
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

/* ─── Types ─── */
interface Campaign {
    id: string;
    title: string;
    campaign_type?: string;
    rate_per_1k_views?: number;
    slug?: string;
}

interface Community {
    id: string;
    name: string;
    slug: string;
    tagline?: string;
    category?: string;
    member_count?: number;
    post_count?: number;
    is_free?: boolean;
    monthly_price?: number;
    currency?: string;
    cover_image?: string;
    avatar_url?: string;
    created_at?: string;
}

interface HomepageRedesignProps {
    campaigns?: SharedCampaignRow[];
    communities?: Community[];
    stats?: {
        users: string;
        earned: string;
        secure: string;
        countries: string;
    };
}

/* ═══════════════════════════════════════════════
   TICKER
═══════════════════════════════════════════════ */
function Ticker() {
    const items = [
        "✦ Global Marketplace",
        "✦ Verified Vendors",
        "✦ Earn Commissions",
        "✦ Join Communities",
        "✦ Free to Start",
        "✦ Instant Payouts",
        "✦ 50+ Countries",
        "✦ 10,000+ Creators",
    ];
    const doubled = [...items, ...items];

    return (
        <div
            className="overflow-hidden px-8 py-2.5"
            style={{
                background: "var(--color-accent)",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
        >
            <motion.div
                className="flex gap-8 whitespace-nowrap"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
            >
                {doubled.map((item, i) => (
                    <span
                        key={i}
                        className="text-white text-[11px] font-bold uppercase tracking-widest shrink-0"
                    >
                        {item}
                    </span>
                ))}
            </motion.div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   HERO PRODUCT CARDS
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
            {[1, 2, 3, 4, 5].map((s) => (
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
            <div
                className="relative flex items-center justify-center"
                style={{
                    background: p.bg,
                    height: 120,
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <span style={{ fontSize: 42, lineHeight: 1 }}>{p.emoji}</span>

                <div
                    className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide"
                    style={{ background: p.color, color: "#fff" }}
                >
                    {p.badge}
                </div>

                <button
                    onClick={() => setWishlisted((w) => !w)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center"
                    style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <Heart
                        className="h-3 w-3"
                        style={{
                            fill: wishlisted ? "#fd5000" : "none",
                            color: wishlisted ? "#fd5000" : "var(--color-text-muted)",
                        }}
                    />
                </button>
            </div>

            <div className="p-3 flex flex-col gap-1.5 flex-1">
                <p className="text-xs font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
                    {p.name}
                </p>
                <div className="flex items-center gap-1.5">
                    <StarRow rating={p.stars} />
                    <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>
                        ({p.reviews})
                    </span>
                </div>
                <div
                    className="flex items-center justify-between mt-auto pt-1.5"
                    style={{ borderTop: "1px solid var(--color-border)" }}
                >
                    <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>
                        {p.price}
                    </span>
                    <span className="text-[9px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
                        {p.sold}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════
   CORE PILLARS
═══════════════════════════════════════════════ */
export function CorePillars() {
    const pillars = [
        {
            icon: ShoppingBag,
            title: "Marketplace",
            tagline: "Buy & Sell Globally",
            desc: "Thousands of verified products from trusted vendors. Shop or list your own — reach customers across 50+ countries.",
            href: "/marketplace",
            cta: "Explore products",
            features: ["Verified vendors", "Secure checkout", "Global shipping"],
            badge: null,
        },
        {
            icon: DollarSign,
            title: "Earn (Affiliate)",
            tagline: "Earn While You Sleep",
            desc: "Promote any product and earn up to 30% commission on every sale. No inventory, no hassle — just share and earn.",
            href: "/affiliate",
            cta: "Start earning free",
            features: ["Up to 30% commission", "Real-time tracking", "Instant withdrawals"],
            badge: null,
        },
        {
            icon: Clapperboard,
            title: "Campaigns",
            tagline: "UGC & Clipping",
            desc: "Join brand campaigns, create short-form content, and get paid per view. No followers required — just create.",
            href: "/ugc",
            cta: "Join a campaign",
            features: ["Paid per 1K views", "Brand partnerships", "Any platform"],
            badge: "Hot",
        },
        {
            icon: Users,
            title: "Communities",
            tagline: "Connect & Grow",
            desc: "Find your niche. Join communities of buyers, sellers, and creators who share your interests and goals.",
            href: "/communities",
            cta: "Discover communities",
            features: ["Niche communities", "Peer networking", "Group deals"],
            badge: null,
        },
    ];

    const accent = "#fd5000";
    const accentBg = "rgba(253,80,0,0.06)";
    const accentBorder = "rgba(253,80,0,0.15)";

    return (
        <section
            className="py-20 sm:py-28"
            style={{
                background: "var(--color-surface)",
                borderTop: "1px solid var(--color-border)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <GridPattern id="pillars-grid" />
            <RingDecor top={-60} rx={240} ry={80} rings={2} opacity={0.07} />
            <EdgeGlow position="bottom-right" size={320} opacity={0.04} offset={-80} />

            <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <Eyebrow label="Built for growth" />
                        <h2
                            className="font-black tracking-tight mb-4"
                            style={{
                                fontSize: "clamp(2rem, 4vw, 3rem)",
                                color: "var(--color-text-primary)",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            Four ways to succeed on Jimvio
                        </h2>
                        <p
                            className="text-base max-w-xl mx-auto"
                            style={{ color: "var(--color-text-muted)" }}
                        >
                            Whether you're a buyer, seller, creator, or affiliate — the platform is built to maximize your results.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {pillars.map((p) => (
                            <motion.div key={p.title} variants={fadeUp} style={{ position: "relative" }}>
                                {p.badge && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: -12,
                                            left: 20,
                                            zIndex: 10,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            padding: "4px 10px 4px 8px",
                                            borderRadius: 999,
                                            background: accent,
                                            boxShadow: `0 4px 14px ${accent}50`,
                                            color: "#fff",
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: "0.05em",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        <FlameIcon size={12} />
                                        {p.badge}
                                    </div>
                                )}

                                <Link
                                    href={p.href}
                                    className="group flex flex-col h-full p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1"
                                    style={{
                                        background: "var(--color-bg)",
                                        border: "1px solid var(--color-border)",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = accentBorder)}
                                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <CornerBlob size={200} opacity={0.06} />

                                    <div className="mb-5">
                                        <IconWrapper icon={p.icon} size={48} rounded="2xl" />
                                    </div>

                                    <p
                                        className="text-[14px] font-semibold uppercase tracking-normal mb-1"
                                        style={{ color: accent }}
                                    >
                                        {p.tagline}
                                    </p>
                                    <h3
                                        className="text-lg font-black mb-2.5"
                                        style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
                                    >
                                        {p.title}
                                    </h3>
                                    <p
                                        className="text-xs leading-relaxed mb-5 flex-1"
                                        style={{ color: "var(--color-text-muted)" }}
                                    >
                                        {p.desc}
                                    </p>

                                    <ul className="space-y-1.5 mb-6">
                                        {p.features.map((f) => (
                                            <li key={f} className="flex items-center gap-2">
                                                <CheckSVG color={accent} />
                                                <span
                                                    className="text-xs font-medium"
                                                    style={{ color: "var(--color-text-secondary)" }}
                                                >
                                                    {f}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div
                                        className="flex items-center gap-1.5 text-xs font-bold transition-all group-hover:gap-2.5"
                                        style={{ color: accent }}
                                    >
                                        {p.cta}
                                        <ArrowSVG size={14} />
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
        { name: "Electronics", count: "2.4K+", icon: Zap },
        { name: "Fashion", count: "5.1K+", icon: Tag },
        { name: "Home & Living", count: "1.8K+", icon: Layers },
        { name: "Health", count: "890+", icon: Heart },
        { name: "Business", count: "1.2K+", icon: BarChart3 },
        { name: "Local Vendors", count: "640+", icon: MapPin },
    ];

    return (
        <section
            className="py-20 sm:py-28"
            style={{
                background: "var(--color-bg)",
                borderTop: "1px solid var(--color-border)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <GridPattern id="cat-grid" />
            <EdgeGlow position="bottom-left" size={260} opacity={0.04} offset={-60} />

            <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    <motion.div
                        variants={fadeUp}
                        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
                    >
                        <div>
                            <Eyebrow label="Product categories" lineW={16} />
                            <h2
                                className="font-black tracking-tight"
                                style={{
                                    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                                    color: "var(--color-text-primary)",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                Browse by category
                            </h2>
                        </div>
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0"
                            style={{ color: "var(--color-accent)" }}
                        >
                            View all products
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path
                                    d="M6 4L10 8L6 12"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </Link>
                    </motion.div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {cats.map((cat) => (
                            <motion.div key={cat.name} variants={fadeUp}>
                                <Link
                                    href={`/marketplace?category=${cat.name.toLowerCase().replace(/ /g, "-")}`}
                                    className="group flex flex-col items-center text-center p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                                    style={{
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.3)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <CornerBlob size={100} opacity={0.06} />
                                    <CornerBlob size={100} opacity={0.04} position="bottom-left" />

                                    <div className="mb-3">
                                        <IconWrapper icon={cat.icon} size={48} rounded="xl" />
                                    </div>

                                    <p
                                        className="text-xs font-bold mb-1 leading-tight"
                                        style={{ color: "var(--color-text-primary)" }}
                                    >
                                        {cat.name}
                                    </p>
                                    <p
                                        className="text-[10px] font-semibold"
                                        style={{ color: "var(--color-text-muted)" }}
                                    >
                                        {cat.count} items
                                    </p>
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
   UGC CAMPAIGNS
═══════════════════════════════════════════════ */
function UGCCampaigns({ campaigns = [] }: { campaigns: SharedCampaignRow[] }) {
    const demo: Campaign[] =
        campaigns.length > 0
            ? (campaigns as unknown as Campaign[])
            : [
                { id: "1", title: "Summer Skincare Review", campaign_type: "UGC", rate_per_1k_views: 8, slug: "skincare-review" },
                { id: "2", title: "Tech Unboxing Series", campaign_type: "Clipping", rate_per_1k_views: 12, slug: "tech-unbox" },
                { id: "3", title: "Fashion Haul Africa", campaign_type: "UGC", rate_per_1k_views: 6, slug: "fashion-haul" },
                { id: "4", title: "Fitness Transformation", campaign_type: "Clipping", rate_per_1k_views: 10, slug: "fitness" },
                { id: "5", title: "Home Setup Tour", campaign_type: "UGC", rate_per_1k_views: 7, slug: "home-setup" },
                { id: "6", title: "Food & Lifestyle Clips", campaign_type: "Clipping", rate_per_1k_views: 9, slug: "food-clips" },
            ];

    return (
        <section
            className="py-20 sm:py-28"
            style={{
                background: "var(--color-surface)",
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <GridPattern id="ugc-grid" />
            <EdgeGlow position="top-right" size={280} opacity={0.04} offset={-60} />

            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    <motion.div
                        variants={fadeUp}
                        className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mb-12"
                    >
                        <div>
                            <div
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-bold uppercase tracking-widest"
                                style={{
                                    background: "rgba(253,80,0,0.08)",
                                    border: "1px solid rgba(253,80,0,0.18)",
                                    color: "var(--color-accent)",
                                }}
                            >
                                <Clapperboard className="h-3 w-3" />
                                UGC &amp; Clipping campaigns
                            </div>
                            <h2
                                className="font-black tracking-tight mb-4"
                                style={{
                                    fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
                                    color: "var(--color-text-primary)",
                                    letterSpacing: "-0.025em",
                                }}
                            >
                                Get paid to create content.
                                <br />
                                <span style={{ color: "var(--color-accent)" }}>No followers needed.</span>
                            </h2>
                            <p className="text-base max-w-lg" style={{ color: "var(--color-text-muted)" }}>
                                Join a brand campaign, film or clip content, and earn per 1,000 views — on any
                                platform. It's that simple.
                            </p>
                        </div>

                        <div
                            className="flex flex-col gap-4 p-5 rounded-2xl shrink-0 w-full lg:w-56"
                            style={{
                                background: "rgba(253,80,0,0.05)",
                                border: "1px solid rgba(253,80,0,0.15)",
                                position: "relative",
                                overflow: "hidden",
                            }}
                        >
                            <CornerBlob size={120} opacity={0.06} />
                            {[
                                { label: "Avg. per 1K views", value: "$8" },
                                { label: "Active campaigns", value: "120+" },
                                { label: "Platforms accepted", value: "Any" },
                            ].map((row) => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                        {row.label}
                                    </span>
                                    <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <SwipeableCardGrid
                        items={demo}
                        cols={{ sm: 2, lg: 4 }}
                        renderCard={(c) => (
                            <motion.div key={c.id} variants={fadeUp}>
                                <SharedCampaignCard c={c as any} />
                            </motion.div>
                        )}
                    />

                    <motion.div variants={fadeUp} className="flex justify-center mt-9">
                        <Link
                            href="/ugc"
                            className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl text-sm font-bold text-white"
                            style={{ background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Browse all campaigns <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   AFFILIATE SPOTLIGHT
═══════════════════════════════════════════════ */
type AffiliateCampaign = {
    id: string;
    slug: string;
    title: string;
    campaign_type: string;
    commission: number;
    price: number;
    currency: string;
    image: string | null;
    is_featured: boolean;
};

type AffiliateStats = {
    affiliateCount: number;
    affiliateSkus: number;
    totalProducts: number;
};

const DEFAULT_COMMISSION = 10;

const AFFILIATE_FALLBACK: AffiliateCampaign[] = [
    { id: "1", slug: "skincare", title: "Premium Skincare Bundle", campaign_type: "Physical", commission: 18, price: 48, currency: "USD", image: null, is_featured: false },
    { id: "2", slug: "tech-acc", title: "Wireless Tech Accessories", campaign_type: "Digital", commission: 24, price: 129, currency: "USD", image: null, is_featured: true },
    { id: "3", slug: "fashion", title: "Fashion Haul Collection", campaign_type: "Physical", commission: 12, price: 85, currency: "USD", image: null, is_featured: false },
    { id: "4", slug: "home", title: "Home Decor Essentials", campaign_type: "Digital", commission: 15, price: 39, currency: "USD", image: null, is_featured: false },
];

export function AffiliateSpotlight() {
    const [cards, setCards] = useState<AffiliateCampaign[]>(AFFILIATE_FALLBACK);
    const [affiliateStats, setAffiliateStats] = useState<AffiliateStats>({
        affiliateCount: 0,
        affiliateSkus: 0,
        totalProducts: 0,
    });
    const [maxRate, setMaxRate] = useState(0);

    useEffect(() => {
        async function fetchData() {
            const db = createClient();
            const { data, count, error } = await db
                .from("products")
                .select(
                    "id, slug, name, product_type, affiliate_commission_rate, price, currency, images, is_featured, status, is_active, affiliate_enabled",
                    { count: "exact" }
                )
                .eq("status", "active")
                .eq("is_active", true)
                .eq("affiliate_enabled", true);

            if (error) { console.error("Supabase error:", error); return; }

            const spotlight = data ?? [];
            const fetchedMaxRate = spotlight.reduce(
                (m: number, p: any) => Math.max(m, Number(p.affiliate_commission_rate ?? 0)),
                0
            );
            const displayCampaigns: AffiliateCampaign[] = spotlight.map((p: any) => ({
                id: p.id,
                slug: p.slug ?? p.id,
                title: p.name,
                campaign_type: p.product_type
                    ? p.product_type.charAt(0).toUpperCase() + p.product_type.slice(1)
                    : "Affiliate",
                commission: Number(p.affiliate_commission_rate ?? DEFAULT_COMMISSION),
                price: Number(p.price ?? 0),
                currency: p.currency ?? "USD",
                image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
                is_featured: !!p.is_featured,
            }));

            setMaxRate(fetchedMaxRate);
            setAffiliateStats({
                affiliateCount: spotlight.length,
                affiliateSkus: spotlight.length,
                totalProducts: count ?? spotlight.length,
            });
            if (displayCampaigns.length > 0) setCards(displayCampaigns);
        }
        fetchData();
    }, []);

    const heroRate = maxRate > 0 ? Math.round(maxRate) : DEFAULT_COMMISSION;

    const statsGrid = [
        { label: "Active Affiliates", value: affiliateStats.affiliateCount ? formatPlatformCount(affiliateStats.affiliateCount) : "—" },
        { label: "Affiliate-ready SKUs", value: affiliateStats.affiliateSkus ? formatPlatformCount(affiliateStats.affiliateSkus) : "—" },
        { label: "Top commission rate", value: maxRate > 0 ? `${Math.round(maxRate)}%` : `${heroRate}%` },
        { label: "Live products", value: affiliateStats.totalProducts ? formatPlatformCount(affiliateStats.totalProducts) : "—" },
    ];

    return (
        <section
            className="py-20 sm:py-28"
            style={{
                background: "var(--color-bg)",
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <GridPattern id="aff-grid" opacity={0.025} />
            <CornerBlob size={300} opacity={0.05} position="top-right" />

            <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    <motion.div
                        variants={fadeUp}
                        className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mb-12"
                    >
                        <div>
                            <Eyebrow label="Affiliate program" lineW={16} />
                            <h2
                                className="font-black tracking-tight mb-4"
                                style={{
                                    fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
                                    color: "var(--color-text-primary)",
                                    letterSpacing: "-0.025em",
                                }}
                            >
                                Earn commissions on
                                <br />
                                every product you share
                            </h2>
                            <p className="text-base max-w-lg" style={{ color: "var(--color-text-muted)" }}>
                                Get your unique affiliate link. Share anywhere. Earn up to{" "}
                                <strong style={{ color: "var(--color-accent)" }}>{heroRate}%</strong> on every
                                purchase — automatically tracked and paid.
                            </p>
                        </div>

                        <div
                            className="flex flex-col gap-4 p-5 rounded-2xl shrink-0 w-full lg:w-56"
                            style={{
                                background: "rgba(253,80,0,0.05)",
                                border: "1px solid rgba(253,80,0,0.15)",
                                position: "relative",
                                overflow: "hidden",
                            }}
                        >
                            <CornerBlob size={120} opacity={0.06} />
                            {statsGrid.map((row) => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                        {row.label}
                                    </span>
                                    <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <SwipeableCardGrid
                        items={cards}
                        cols={{ sm: 2, lg: 4 }}
                        renderCard={(c) => (
                            <motion.div key={c.id} variants={fadeUp} style={{ position: "relative" }}>
                                {c.is_featured && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: -12,
                                            left: 16,
                                            zIndex: 10,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            padding: "4px 10px 4px 8px",
                                            borderRadius: 999,
                                            background: "var(--color-accent)",
                                            color: "#fff",
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: "0.05em",
                                            textTransform: "uppercase",
                                            boxShadow: "0 4px 14px rgba(253,80,0,0.45)",
                                        }}
                                    >
                                        <StarIcon size={11} color="#fff" />
                                        Featured
                                    </div>
                                )}

                                <Link
                                    href={`/marketplace/${c.slug}`}
                                    className="group flex flex-col rounded-2xl h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                                    style={{
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.35)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <div
                                        className="relative w-full overflow-hidden"
                                        style={{
                                            height: 160,
                                            background: c.image ? "transparent" : "rgba(253,80,0,0.06)",
                                            borderBottom: "1px solid var(--color-border)",
                                        }}
                                    >
                                        {c.image ? (
                                            <img
                                                src={c.image}
                                                alt={c.title}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <PackageSVG size={40} />
                                            </div>
                                        )}

                                        <div
                                            className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                                            style={{
                                                background: "rgba(0,0,0,0.55)",
                                                color: "#fff",
                                                backdropFilter: "blur(4px)",
                                            }}
                                        >
                                            {c.campaign_type}
                                        </div>

                                        <div
                                            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black"
                                            style={{ background: "var(--color-accent)", color: "#fff" }}
                                        >
                                            <DollarCircle size={10} />
                                            {c.commission}% commission
                                        </div>
                                    </div>

                                    <div className="flex flex-col flex-1 p-4 gap-3">
                                        <p
                                            className="text-sm font-bold leading-snug line-clamp-2"
                                            style={{ color: "var(--color-text-primary)" }}
                                        >
                                            {c.title}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-black" style={{ color: "var(--color-text-primary)" }}>
                                                {c.currency === "USD" ? "$" : c.currency}
                                                {c.price.toFixed(2)}
                                            </span>
                                            <span
                                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                                style={{
                                                    background: "rgba(253,80,0,0.08)",
                                                    color: "var(--color-accent)",
                                                    border: "1px solid rgba(253,80,0,0.18)",
                                                }}
                                            >
                                                Affiliate enabled
                                            </span>
                                        </div>

                                        <div
                                            className="flex items-center justify-between p-3 rounded-xl mt-auto"
                                            style={{
                                                background: "rgba(253,80,0,0.05)",
                                                border: "1px solid rgba(253,80,0,0.12)",
                                            }}
                                        >
                                            <div>
                                                <p className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                                                    You earn per sale
                                                </p>
                                                <p className="text-base font-black" style={{ color: "var(--color-accent)" }}>
                                                    {c.currency === "USD" ? "$" : c.currency}
                                                    {((c.price * c.commission) / 100).toFixed(2)}
                                                </p>
                                            </div>
                                            <div
                                                className="flex items-center gap-1 text-xs font-bold transition-all group-hover:gap-2"
                                                style={{ color: "var(--color-accent)" }}
                                            >
                                                Get link
                                                <ExternalLinkSVG size={13} />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        )}
                    />

                    <motion.div variants={fadeUp} className="flex justify-center mt-9">
                        <Link
                            href="/affiliate"
                            className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl text-sm font-bold text-white"
                            style={{ background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Browse all affiliate products <ArrowSVG size={16} />
                        </Link>
                    </motion.div>
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
        { num: 1, icon: Users, title: "Create your free account", desc: "Sign up in 60 seconds. No credit card required." },
        { num: 2, icon: Search, title: "Pick your path", desc: "Sell products, become an affiliate, or join communities." },
        { num: 3, icon: Store, title: "List or promote", desc: "Add your own products or share links to earn commissions." },
        { num: 4, icon: Wallet, title: "Get paid", desc: "Withdraw earnings directly to your account, any time." },
    ];

    return (
        <section
            className="py-20 sm:py-28"
            style={{
                background: "var(--color-bg)",
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <GridPattern id="how-grid" opacity={0.025} />
            <RingDecor top={-40} rx={290} ry={120} rings={2} opacity={0.04} />

            <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <Eyebrow label="Simple to start" />
                        <h2
                            className="font-black tracking-tight mb-3"
                            style={{
                                fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
                                color: "var(--color-text-primary)",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            From zero to earning
                            <br />
                            in 4 steps
                        </h2>
                        <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
                            No experience needed. Built for anyone ready to grow online.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {steps.map((step, i) => (
                            <motion.div key={step.num} variants={fadeUp}>
                                <div
                                    className="relative flex flex-col p-6 rounded-2xl h-full group"
                                    style={{
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        overflow: "hidden",
                                    }}
                                >
                                    <CornerBlob size={160} opacity={0.06} />

                                    <div
                                        aria-hidden="true"
                                        className="absolute top-4 right-4 font-black select-none"
                                        style={{
                                            fontSize: "4.5rem",
                                            lineHeight: 1,
                                            color: "rgba(253,80,0,0.05)",
                                            pointerEvents: "none",
                                        }}
                                    >
                                        {String(step.num).padStart(2, "0")}
                                    </div>

                                    <div className="mb-5 z-10">
                                        <IconWrapper
                                            icon={step.icon}
                                            badge={step.num}
                                            badgePos="top-left"
                                            size={48}
                                        />
                                    </div>

                                    <p className="text-base font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
                                        {step.title}
                                    </p>
                                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                                        {step.desc}
                                    </p>

                                    {i < steps.length - 1 && (
                                        <div className="hidden lg:block">
                                            <ConnectorArrow />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div variants={fadeUp} className="flex justify-center mt-10">
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2.5 px-9 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                            style={{
                                height: 50,
                                background: "var(--color-accent)",
                                boxShadow: "0 6px 20px rgba(253,80,0,0.28)",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Get started free <ArrowSVG size={16} />
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   TRUST SECTION
═══════════════════════════════════════════════ */
function TrustSection({ stats: trustStats }: { stats?: HomepageRedesignProps["stats"] }) {
    const s = trustStats ?? { users: "10K+", earned: "$1M+", secure: "99.9%", countries: "50+" };

    const items = [
        { value: s.users, label: "Active users", icon: Users, sub: "and growing daily", rank: 1 },
        { value: s.earned, label: "Total paid out", icon: DollarSign, sub: "to creators & sellers", rank: 2 },
        { value: s.secure, label: "Platform uptime", icon: Shield, sub: "always available", rank: 3 },
        { value: s.countries, label: "Countries", icon: Globe, sub: "worldwide reach", rank: 4 },
    ];

    return (
        <section
            className="py-20 sm:py-28"
            style={{
                background: "var(--color-surface)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <GridPattern id="trust-grid" opacity={0.02} />
            <EdgeGlow position="bottom-right" size={300} opacity={0.04} offset={-80} />

            <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <Eyebrow label="By the numbers" />
                        <h2
                            className="font-black tracking-tight"
                            style={{
                                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                                color: "var(--color-text-primary)",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            Trusted by thousands globally
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {items.map((item) => (
                            <motion.div key={item.label} variants={fadeUp}>
                                <div
                                    className="flex flex-col items-center text-center p-7 rounded-2xl"
                                    style={{
                                        background: "var(--color-bg)",
                                        border: "1px solid var(--color-border)",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    <CornerBlob size={120} opacity={0.06} />

                                    <div className="mb-5">
                                        <IconWrapper
                                            icon={item.icon}
                                            badge={item.rank}
                                            badgePos="top-right"
                                            size={48}
                                        />
                                    </div>

                                    <p
                                        className="font-black mb-1"
                                        style={{
                                            fontSize: "clamp(2rem, 3vw, 2.75rem)",
                                            color: "var(--color-text-primary)",
                                            letterSpacing: "-0.03em",
                                        }}
                                    >
                                        {item.value}
                                    </p>
                                    <p
                                        className="text-sm font-semibold mb-1"
                                        style={{ color: "var(--color-text-secondary)" }}
                                    >
                                        {item.label}
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                        {item.sub}
                                    </p>
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
        <section
            className="py-16 sm:py-20"
            style={{
                background: "var(--color-bg)",
                borderTop: "1px solid var(--color-border)",
            }}
        >
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    <motion.div
                        variants={fadeUp}
                        className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
                        style={{
                            background: "linear-gradient(135deg, #0d0600 0%, #1a0800 50%, #0d0600 100%)",
                            border: "1px solid rgba(253,80,0,0.2)",
                        }}
                    >
                        {/* radial glow */}
                        <div
                            className="absolute top-0 right-0 w-[400px] h-[300px] pointer-events-none"
                            style={{
                                background:
                                    "radial-gradient(ellipse at top right, rgba(253,80,0,0.15) 0%, transparent 60%)",
                            }}
                        />
                        {/* grid overlay */}
                        <div
                            className="absolute inset-0 opacity-5 pointer-events-none"
                            style={{
                                backgroundImage:
                                    "linear-gradient(rgba(253,80,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(253,80,0,0.6) 1px, transparent 1px)",
                                backgroundSize: "40px 40px",
                            }}
                        />

                        {/* decorative rings */}
                        <CornerBlob
                            color="#fd5000"
                            size={300}
                            opacity={0.06}
                            rings={3}
                            position="bottom-left"
                        />

                        {/* top-left crosshair */}
                        <svg
                            aria-hidden="true"
                            style={{ position: "absolute", top: 20, left: 20, opacity: 0.15, pointerEvents: "none" }}
                            width="28"
                            height="28"
                            viewBox="0 0 28 28"
                        >
                            <circle cx="14" cy="14" r="12" stroke="#fd5000" strokeWidth="1" fill="none" />
                            <line x1="14" y1="2" x2="14" y2="26" stroke="#fd5000" strokeWidth="1" />
                            <line x1="2" y1="14" x2="26" y2="14" stroke="#fd5000" strokeWidth="1" />
                        </svg>

                        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
                            <div>
                                <div className="flex items-center gap-2.5 mb-5">
                                    <AwardSVG size={20} />
                                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>
                                        For vendors &amp; sellers
                                    </span>
                                </div>
                                <h2
                                    className="font-black text-white tracking-tight mb-4"
                                    style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", letterSpacing: "-0.025em" }}
                                >
                                    Ready to reach your
                                    <br />
                                    <span style={{ color: "var(--color-accent)" }}>first 1,000 customers?</span>
                                </h2>
                                <p className="text-white/60 text-base max-w-lg">
                                    List your products for free. Access our global network of buyers, affiliates and
                                    communities ready to share your brand.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 shrink-0">
                                <Link
                                    href="/vendor/register"
                                    className="inline-flex items-center justify-center gap-2.5 px-8 rounded-2xl text-sm font-bold text-white transition-all"
                                    style={{
                                        height: 50,
                                        background: "var(--color-accent)",
                                        boxShadow: "0 6px 20px rgba(253,80,0,0.4)",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
                                >
                                    Open your store
                                    <StoreSVG size={16} />
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
    const trustItems = [
        { label: "No setup fees", svg: <CheckSVG /> },
        { label: "Secure & private", svg: <CheckSVG /> },
        { label: "Works globally", svg: <CheckSVG /> },
    ];

    return (
        <section
            className="py-24 sm:py-32"
            style={{
                background: "var(--color-surface)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <GridPattern id="cta-grid" opacity={0.02} />
            <RingDecor top={-20} rx={340} ry={180} rings={3} opacity={0.04} />

            <div
                className="max-w-2xl mx-auto px-4 sm:px-6 text-center"
                style={{ position: "relative" }}
            >
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp}>
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 text-xs font-bold"
                            style={{
                                background: "rgba(253,80,0,0.08)",
                                border: "1px solid rgba(253,80,0,0.18)",
                                color: "var(--color-accent)",
                            }}
                        >
                            <StarIcon size={14} color="#fd5000" />
                            Free forever — no credit card needed
                        </div>
                    </motion.div>

                    <motion.h2
                        variants={fadeUp}
                        className="font-black tracking-tight mb-5"
                        style={{
                            fontSize: "clamp(2.5rem, 5vw, 4rem)",
                            color: "var(--color-text-primary)",
                            letterSpacing: "-0.035em",
                            lineHeight: 1.05,
                        }}
                    >
                        Your growth starts
                        <br />
                        <span style={{ color: "var(--color-accent)" }}>today.</span>
                    </motion.h2>

                    <motion.p
                        variants={fadeUp}
                        className="text-base leading-relaxed mb-10 max-w-sm mx-auto"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        Thousands of vendors and affiliates already growing on Jimvio. Join for free and see
                        the difference.
                    </motion.p>

                    <motion.div
                        variants={fadeUp}
                        className="flex flex-col sm:flex-row gap-3 justify-center"
                    >
                        <Link
                            href="/register"
                            className="group inline-flex items-center justify-center gap-2.5 px-10 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97]"
                            style={{
                                height: 56,
                                background: "var(--color-accent)",
                                boxShadow: "0 10px 32px rgba(253,80,0,0.32)",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Create Free Account
                            <ArrowSVG size={18} />
                        </Link>
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center justify-center gap-2 px-8 rounded-2xl text-base font-semibold transition-all"
                            style={{
                                height: 56,
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-secondary)",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "var(--color-border-strong)";
                                e.currentTarget.style.color = "var(--color-text-primary)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--color-border)";
                                e.currentTarget.style.color = "var(--color-text-secondary)";
                            }}
                        >
                            Explore first
                        </Link>
                    </motion.div>

                    <motion.div
                        variants={fadeUp}
                        className="flex items-center justify-center gap-6 mt-10 flex-wrap"
                    >
                        {trustItems.map(({ svg, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                {svg}
                                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                                    {label}
                                </span>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

export function HomepageRedesign({
    campaigns = [],
    communities = [],
    stats,
}: HomepageRedesignProps) {
    return (
        <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
            <Ticker />
            <Hero />
            <CorePillars />
            <CategoryBrowse />
            <UGCCampaigns campaigns={campaigns} />
            <AffiliateSpotlight />
            <CommunitiesSection
                communities={communities}
                heading="Top Communities"
                eyebrow="Discover"
                seeAllHref="/communities"
                limit={6}
            />
            <HowItWorks />
            <TrustSection stats={stats} />
            <VendorBanner />
            <FinalCTA />
        </div>
    );
}
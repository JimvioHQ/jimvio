// "use client";

// import Link from "next/link";
// import { ChevronRight, Users } from "lucide-react";
// import { motion } from "framer-motion";
// import { Swiper, SwiperSlide } from "swiper/react";
// import { FreeMode } from "swiper/modules";
// import "swiper/css";

// // ─── types ────────────────────────────────────────────────────────────────────

// export interface Community {
//     id: string;
//     name: string;
//     member_count?: number | null;
//     slug?: string | null;
//     /** optional: override the auto-generated avatar color */
//     color?: string;
// }

// interface CommunitiesSectionProps {
//     communities?: Community[];
//     /** section heading */
//     heading?: string;
//     /** eyebrow label above heading */
//     eyebrow?: string;
//     /** href for "see all" link */
//     seeAllHref?: string;
//     /** max cards to render */
//     limit?: number;
// }

// // ─── animation variants ───────────────────────────────────────────────────────

// const stagger = {
//     hidden: {},
//     show: { transition: { staggerChildren: 0.07 } },
// };

// const fadeUp = {
//     hidden: { opacity: 0, y: 16 },
//     show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
// };

// const AVATAR_COLORS = [
//     "#fd5000",
//     "#0ea5e9",
//     "#8b5cf6",
//     "#10b981",
//     "#f59e0b",
//     "#ec4899",
// ];

// function avatarColor(i: number, override?: string) {
//     return override ?? AVATAR_COLORS[i % AVATAR_COLORS.length];
// }

// function CommunityCard({
//     community,
//     index,
// }: {
//     community: Community;
//     index: number;
// }) {
//     const bg = avatarColor(index, community.color);
//     const initial = community.name[0]?.toUpperCase() ?? "?";
//     const href = `/communities/${community.slug ?? community.id}`;

//     return (
//         <Link
//             href={href}
//             className="
//         group flex items-center gap-3.5 p-4 rounded-2xl
//         transition-all duration-200
//         hover:-translate-y-0.5 hover:shadow-md
//         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/60
//       "
//             style={{
//                 background: "var(--color-surface)",
//                 border: "1px solid var(--color-border)",
//             }}
//             onMouseEnter={(e) =>
//                 (e.currentTarget.style.borderColor = "rgba(253,80,0,0.28)")
//             }
//             onMouseLeave={(e) =>
//                 (e.currentTarget.style.borderColor = "var(--color-border)")
//             }
//         >
//             {/* Avatar */}
//             <div
//                 className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0 shadow-sm"
//                 style={{ background: bg }}
//                 aria-hidden
//             >
//                 {initial}
//             </div>

//             {/* Name + member count */}
//             <div className="flex-1 min-w-0">
//                 <p
//                     className="text-sm font-semibold truncate leading-tight mb-0.5"
//                     style={{ color: "var(--color-text-primary)" }}
//                 >
//                     {community.name}
//                 </p>
//                 <div className="flex items-center gap-1.5">
//                     <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
//                     <span
//                         className="text-xs tabular-nums"
//                         style={{ color: "var(--color-text-muted)" }}
//                     >
//                         {(community.member_count ?? 0).toLocaleString()} members
//                     </span>
//                 </div>
//             </div>

//             {/* Join pill */}
//             <span
//                 className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors duration-150 group-hover:bg-[var(--color-accent)] group-hover:text-white group-hover:border-transparent"
//                 style={{
//                     background: "rgba(253,80,0,0.07)",
//                     color: "var(--color-accent)",
//                     border: "1px solid rgba(253,80,0,0.16)",
//                 }}
//             >
//                 Join
//             </span>
//         </Link>
//     );
// }

// // ─── mobile swiper strip ──────────────────────────────────────────────────────

// function MobileSwiper({ communities }: { communities: Community[] }) {
//     return (
//         // negative margin lets cards bleed to screen edge for that "native" feel
//         <div className="-mx-4">
//             <Swiper
//                 modules={[FreeMode]}
//                 freeMode={{ enabled: true, momentum: true, momentumRatio: 0.6 }}
//                 slidesPerView="auto"
//                 spaceBetween={12}
//                 // offset so first/last card peek naturally
//                 slidesOffsetBefore={16}
//                 slidesOffsetAfter={16}
//                 className="!overflow-visible"
//             >
//                 {communities.map((c, i) => (
//                     <SwiperSlide
//                         key={c.id}
//                         // fixed width so cards don't stretch
//                         style={{ width: "clamp(260px, 72vw, 320px)" }}
//                     >
//                         <CommunityCard community={c} index={i} />
//                     </SwiperSlide>
//                 ))}

//                 {/* "See all" ghost slide */}
//                 <SwiperSlide style={{ width: "auto" }}>
//                     <Link
//                         href="/communities"
//                         className="flex items-center justify-center gap-2 h-full px-6 rounded-2xl text-sm font-semibold transition-colors"
//                         style={{
//                             color: "var(--color-accent)",
//                             border: "1px dashed rgba(253,80,0,0.35)",
//                             minHeight: "72px",
//                             background: "rgba(253,80,0,0.03)",
//                         }}
//                     >
//                         See all
//                         <ChevronRight className="h-4 w-4" />
//                     </Link>
//                 </SwiperSlide>
//             </Swiper>

//             {/* subtle fade-right hint */}
//             <div
//                 className="pointer-events-none absolute inset-y-0 right-0 w-10"
//                 style={{
//                     background:
//                         "linear-gradient(to left, var(--color-bg), transparent)",
//                 }}
//             />
//         </div>
//     );
// }

// // ─── desktop grid ─────────────────────────────────────────────────────────────

// function DesktopGrid({ communities }: { communities: Community[] }) {
//     return (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
//             {communities.map((c, i) => (
//                 <motion.div key={c.id} variants={fadeUp}>
//                     <CommunityCard community={c} index={i} />
//                 </motion.div>
//             ))}
//         </div>
//     );
// }

// // ─── main export ──────────────────────────────────────────────────────────────

// const DEMO_COMMUNITIES: Community[] = [
//     { id: "1", name: "African Fashion Creators", member_count: 8420, slug: "african-fashion" },
//     { id: "2", name: "Tech & Gadgets RW", member_count: 12300, slug: "tech-gadgets" },
//     { id: "3", name: "Business & Ecom Hub", member_count: 5670, slug: "business-hub" },
//     { id: "4", name: "Fitness & Wellness", member_count: 3200, slug: "fitness" },
//     { id: "5", name: "Food & Recipes Africa", member_count: 7100, slug: "food" },
//     { id: "6", name: "Freelancers Network", member_count: 4400, slug: "freelancers" },
// ];

// export function CommunitiesSection({
//     communities = [],
//     heading = "Popular Communities",
//     eyebrow = "Find your people",
//     seeAllHref = "/communities",
//     limit = 9,
// }: CommunitiesSectionProps) {
//     const data = (communities.length > 0 ? communities : DEMO_COMMUNITIES).slice(
//         0,
//         limit
//     );

//     return (
//         <section
//             className="py-20 sm:py-28 relative"
//             style={{ background: "var(--color-bg)" }}
//         >
//             <div className="max-w-7xl mx-auto px-4 sm:px-6">
//                 <motion.div
//                     initial="hidden"
//                     whileInView="show"
//                     viewport={{ once: true, margin: "-80px" }}
//                     variants={stagger}
//                 >
//                     {/* Header row */}
//                     <motion.div
//                         variants={fadeUp}
//                         className="flex items-end justify-between gap-4 mb-8"
//                     >
//                         <div>
//                             <p
//                                 className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2"
//                                 style={{ color: "var(--color-accent)" }}
//                             >
//                                 {eyebrow}
//                             </p>
//                             <h2
//                                 className="font-bold tracking-tight"
//                                 style={{
//                                     fontSize: "clamp(1.65rem, 3vw, 2.25rem)",
//                                     color: "var(--color-text-primary)",
//                                     letterSpacing: "-0.025em",
//                                     lineHeight: 1.1,
//                                 }}
//                             >
//                                 {heading}
//                             </h2>
//                         </div>

//                         {/* "See all" only visible on desktop — swiper has its own */}
//                         <Link
//                             href={seeAllHref}
//                             className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold shrink-0 hover:gap-2 transition-all duration-150"
//                             style={{ color: "var(--color-accent)" }}
//                         >
//                             See all <ChevronRight className="h-4 w-4" />
//                         </Link>
//                     </motion.div>

//                     {/* 
//             Mobile  (<sm): Swiper horizontal scroll 
//             Desktop (sm+):  3-column grid 
//           */}
//                     <div className="sm:hidden relative">
//                         <MobileSwiper communities={data} />
//                     </div>

//                     <div className="hidden sm:block">
//                         <DesktopGrid communities={data} />
//                     </div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// export default CommunitiesSection;


"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SwipeableCardGrid } from "@/components/ui/swipeable-card-grid";
import { CommunityCard, type CommunityRow } from "@/components/cards";
import {
    GridPattern,
    CornerBlob,
    EdgeGlow,
    Eyebrow,
} from "@/components/ui/decorator";

interface CommunitiesSectionProps {
    communities?: CommunityRow[];
    heading?: string;
    eyebrow?: string;
    seeAllHref?: string;
    seeAllLabel?: string;
    limit?: number;
    showRanks?: boolean;
    showQuickActions?: boolean;
    accent?: string;
}

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
};

const stagger = {
    show: { transition: { staggerChildren: 0.08 } },
};

const DEMO: CommunityRow[] = [
    { id: "1", name: "African Fashion Creators", member_count: 8420, post_count: 3100, slug: "african-fashion", category: "Fashion", is_free: true, tagline: "Style, culture, and creativity across the continent." },
    { id: "2", name: "Tech & Gadgets RW", member_count: 12300, post_count: 5600, slug: "tech-gadgets", category: "Tech", is_free: false, monthly_price: 2000, tagline: "The go-to hub for tech lovers in Rwanda and beyond." },
    { id: "3", name: "Business & Ecom Hub", member_count: 5670, post_count: 2200, slug: "business-hub", category: "Business", is_free: false, monthly_price: 5000, tagline: "Build, scale, and connect with serious entrepreneurs." },
    { id: "4", name: "Fitness & Wellness", member_count: 3200, post_count: 980, slug: "fitness", category: "Health", is_free: true, tagline: "Transform your body and mind with proven programmes." },
    { id: "5", name: "Food & Recipes Africa", member_count: 7100, post_count: 4100, slug: "food", category: "Food", is_free: true, tagline: "Authentic African recipes and modern culinary ideas." },
    { id: "6", name: "Freelancers Network", member_count: 4400, post_count: 1700, slug: "freelancers", category: "Work", is_free: false, monthly_price: 1500, tagline: "Find clients, build skills, grow your freelance career." },
];

export function CommunitiesSection({
    communities = [],
    heading = "Popular Communities",
    eyebrow = "Find your people",
    seeAllHref = "/communities",
    seeAllLabel = "See all",
    limit = 9,
    showRanks = true,
    showQuickActions = true,
    accent = "#fd5000",
}: CommunitiesSectionProps) {
    const data = (communities.length > 0 ? communities : DEMO).slice(0, limit);

    return (
        <section
            className="py-20 sm:py-28"
            style={{
                /* surface — sits between AffiliateSpotlight (bg) and HowItWorks (bg) */
                background: "var(--color-surface)",
                borderTop: "1px solid var(--color-border)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* ── decorators ── */}
            <GridPattern id="communities-grid" color={accent} opacity={0.025} />
            <EdgeGlow position="bottom-right" color={accent} size={280} opacity={0.04} offset={-70} />
            <CornerBlob color={accent} size={200} opacity={0.05} position="top-left" />

            <div className="max-w-8xl mx-auto px-4 sm:px-6" style={{ position: "relative" }}>
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    {/* ── header row ── */}
                    <motion.div
                        variants={fadeUp}
                        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
                    >
                        <div>
                            {/* ✅ uses the eyebrow prop — was hardcoded "Find your people" before */}
                            <Eyebrow label={eyebrow} color={accent} lineW={16} />
                            <h2
                                className="font-black tracking-tight"
                                style={{
                                    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                                    color: "var(--color-text-primary)",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                {/* ✅ uses the heading prop — was hardcoded "Popular Communities" before */}
                                {heading}
                            </h2>
                        </div>

                        <Link
                            href={seeAllHref}
                            className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0"
                            style={{ color: accent }}
                        >
                            {/* ✅ uses seeAllLabel prop */}
                            {seeAllLabel}
                            {/* SVG chevron — no Lucide import needed */}
                            <svg
                                aria-hidden="true"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                            >
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

                    {/* ── grid ── */}
                    <motion.div variants={fadeUp}>
                        <SwipeableCardGrid<CommunityRow>
                            items={data}
                            renderCard={(c, i) => (
                                <CommunityCard
                                    c={c}
                                    rank={showRanks ? i + 1 : undefined}
                                    showQuickActions={showQuickActions}
                                    accent={accent}
                                />
                            )}
                            seeAllHref={seeAllHref}
                            cols={{ sm: 2, lg: 4 }}
                            mobileSlideWidth="clamp(260px, 74vw, 300px)"
                            accent={accent}
                        />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

export default CommunitiesSection;
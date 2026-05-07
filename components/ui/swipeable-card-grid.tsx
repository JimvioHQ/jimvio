"use client";

/**
 * SwipeableCardGrid<T>
 *
 * On mobile  (<sm): horizontal free-scroll Swiper — each card is a native slide.
 * On desktop (sm+): CSS grid with configurable columns.
 *
 * Usage:
 *   <SwipeableCardGrid
 *     items={communities}
 *     renderCard={(item, index) => <CommunityCard c={item} rank={index + 1} />}
 *     seeAllHref="/communities"
 *     cols={{ sm: 2, lg: 3 }}
 *   />
 */

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { cn } from "@/lib/utils";
import "swiper/css";

// ─── types ────────────────────────────────────────────────────────────────────

interface ColConfig {
    /** number of columns at the sm breakpoint (≥640px) */
    sm?: 1 | 2 | 3 | 4;
    /** number of columns at the lg breakpoint (≥1024px) */
    lg?: 1 | 2 | 3 | 4;
}

interface SwipeableCardGridProps<T> {
    items: T[];
    renderCard: (item: T, index: number) => React.ReactNode;

    /** Show a "See all" ghost slide on mobile and/or link on desktop */
    seeAllHref?: string;
    seeAllLabel?: string;

    /** Desktop column config */
    cols?: ColConfig;

    /** Width of each mobile slide (CSS value). Default "clamp(260px, 72vw, 300px)" */
    mobileSlideWidth?: string;

    /** Gap between items on desktop (Tailwind gap class). Default "gap-4" */
    desktopGap?: string;

    /** Extra classes on the desktop grid wrapper */
    gridClassName?: string;

    /** Accent color forwarded to the "See all" ghost slide */
    accent?: string;
}

// ─── framer variants ──────────────────────────────────────────────────────────

const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

// ─── column class map ─────────────────────────────────────────────────────────

const smCols: Record<number, string> = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
};
const lgCols: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
};

// ─── mobile swiper ────────────────────────────────────────────────────────────

function MobileSwiper<T>({
    items,
    renderCard,
    seeAllHref,
    seeAllLabel = "See all",
    mobileSlideWidth,
    accent = "#fd5000",
}: Pick<
    SwipeableCardGridProps<T>,
    "items" | "renderCard" | "seeAllHref" | "seeAllLabel" | "mobileSlideWidth" | "accent"
>) {
    const slideW = mobileSlideWidth ?? "clamp(260px, 72vw, 300px)";

    return (
        /* bleed to screen edge for native feel */
        <div className="relative -mx-4">
            <Swiper
                modules={[FreeMode]}
                freeMode={{ enabled: true, momentum: true, momentumRatio: 0.55 }}
                slidesPerView="auto"
                spaceBetween={12}
                slidesOffsetBefore={16}
                slidesOffsetAfter={16}
                // important: let the swiper wrapper grow past container
                className="!overflow-visible"
            >
                {items.map((item, i) => (
                    <SwiperSlide key={i} style={{ width: slideW, height: "auto" }}>
                        <div className="h-full">{renderCard(item, i)}</div>
                    </SwiperSlide>
                ))}

                {/* Trailing "See all" ghost slide */}
                {seeAllHref && (
                    <SwiperSlide style={{ width: "auto", height: "auto" }}>
                        <Link
                            href={seeAllHref}
                            className="flex flex-col items-center justify-center gap-2 px-7 h-full min-h-[80px] rounded-[20px] text-sm font-semibold transition-colors"
                            style={{
                                color: accent,
                                border: `1px dashed ${accent}59`,
                                background: `${accent}08`,
                            }}
                        >
                            {seeAllLabel}
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </SwiperSlide>
                )}
            </Swiper>

            {/* Right edge fade — suggests more content */}
            <div
                className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
                style={{
                    background: "linear-gradient(to left, var(--color-bg, white), transparent)",
                }}
            />
        </div>
    );
}

// ─── desktop grid ─────────────────────────────────────────────────────────────

function DesktopGrid<T>({
    items,
    renderCard,
    cols = { sm: 2, lg: 3 },
    desktopGap = "gap-4",
    gridClassName,
}: Pick<
    SwipeableCardGridProps<T>,
    "items" | "renderCard" | "cols" | "desktopGap" | "gridClassName"
>) {
    return (
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className={cn(
                "grid grid-cols-1",
                smCols[cols.sm ?? 2],
                lgCols[cols.lg ?? 3],
                desktopGap,
                gridClassName,
            )}
        >
            {items.map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="h-full">
                    {renderCard(item, i)}
                </motion.div>
            ))}
        </motion.div>
    );
}

// ─── main export ──────────────────────────────────────────────────────────────

export function SwipeableCardGrid<T>({
    items,
    renderCard,
    seeAllHref,
    seeAllLabel = "See all",
    cols = { sm: 2, lg: 3 },
    mobileSlideWidth,
    desktopGap = "gap-4",
    gridClassName,
    accent = "#fd5000",
}: SwipeableCardGridProps<T>) {
    return (
        <>
            {/* ── Mobile: horizontal swiper ── */}
            <div className="sm:hidden">
                <MobileSwiper
                    items={items}
                    renderCard={renderCard}
                    seeAllHref={seeAllHref}
                    seeAllLabel={seeAllLabel}
                    mobileSlideWidth={mobileSlideWidth}
                    accent={accent}
                />
            </div>

            {/* ── Desktop: animated grid ── */}
            <div className="hidden sm:block">
                <DesktopGrid
                    items={items}
                    renderCard={renderCard}
                    cols={cols}
                    desktopGap={desktopGap}
                    gridClassName={gridClassName}
                />
            </div>
        </>
    );
}
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getCategoryImageSrc } from "@/lib/marketplace/category-images";
import {
  AFFILIATE_CARD,
  AFFILIATE_SHELL,
  AffiliateSectionHeading,
  fadeUp,
  staggerContainer,
} from "./shared";
import { cn } from "@/lib/utils";

/** Category browse tiles — rates are not claimed as fixed; products carry real rates. */
const CATEGORIES = [
  {
    name: "Electronics",
    image: getCategoryImageSrc("Electronics", "electronics"),
    href: "/marketplace?category=electronics",
  },
  {
    name: "Beauty",
    image: getCategoryImageSrc("Beauty", "health-beauty"),
    href: "/marketplace?category=beauty",
  },
  {
    name: "Home",
    image: getCategoryImageSrc("Home", "home-living"),
    href: "/marketplace?category=home",
  },
  {
    name: "Fitness",
    image: getCategoryImageSrc("Fitness", "sports-outdoors"),
    href: "/marketplace?category=fitness",
  },
  {
    name: "Education",
    image: getCategoryImageSrc("Education", "toys-kids"),
    href: "/marketplace?category=education",
  },
  {
    name: "Digital Products",
    image: getCategoryImageSrc("Digital", "office-equipment"),
    href: "/marketplace/digital",
  },
] as const;

export function AffiliateCategories() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const scrollBy = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({
      left: dir * 220,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <section className={`${AFFILIATE_SHELL} pt-10 sm:pt-12`} id="offers">
      <AffiliateSectionHeading
        title="Explore Top Categories"
        subtitle="Each product has its own commission rate — browse categories to find offers that fit your audience."
      />

      <motion.div
        className="relative"
        initial={reduceMotion ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        variants={staggerContainer}
      >
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label="Top affiliate categories"
        >
          {CATEGORIES.map((cat) => (
            <motion.div key={cat.name} variants={fadeUp} role="listitem" className="snap-start">
              <Link
                href={cat.href}
                className={cn(
                  AFFILIATE_CARD,
                  "group flex w-[148px] shrink-0 flex-col items-center px-3 pb-4 pt-4 sm:w-[156px]",
                  "transition-all duration-200 ease-out will-change-transform",
                  "hover:-translate-y-1 hover:scale-[1.02] hover:border-[#FF5A1F]/30",
                  "hover:shadow-[0_12px_28px_rgba(17,24,39,0.1)]",
                  "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35 focus-visible:ring-offset-2",
                  "motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
                )}
              >
                <div className="relative mb-3 h-[88px] w-[88px]">
                  <Image
                    src={cat.image}
                    alt=""
                    fill
                    loading="lazy"
                    className="object-contain transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    sizes="88px"
                  />
                </div>
                <p className="text-center text-[13.5px] font-bold text-[#111827]">
                  {cat.name}
                </p>
                <p className="mt-1 text-center text-[12px] text-[#6B7280]">
                  Variable commissions
                </p>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-8 bg-gradient-to-r from-[#F7F8FA] to-transparent md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-[#F7F8FA] to-transparent md:block" />

        <button
          type="button"
          aria-label="Scroll categories left"
          onClick={() => scrollBy(-1)}
          className="absolute -left-1 top-1/2 z-[1] hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#E5E7EB] bg-white/95 text-[#6B7280] shadow-[0_4px_12px_rgba(17,24,39,0.08)] backdrop-blur-sm transition-all duration-200 hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35 md:grid"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Scroll categories right"
          onClick={() => scrollBy(1)}
          className="absolute -right-1 top-1/2 z-[1] hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#E5E7EB] bg-white/95 text-[#6B7280] shadow-[0_4px_12px_rgba(17,24,39,0.08)] backdrop-blur-sm transition-all duration-200 hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35 md:grid"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </motion.div>
    </section>
  );
}

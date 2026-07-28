"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { getCategoryImageSrc } from "@/lib/marketplace/category-images";
import { AFFILIATE_CARD, AFFILIATE_SHELL, AffiliateSectionHeading } from "./shared";

const CATEGORIES = [
  {
    name: "Electronics",
    commission: 15,
    image: getCategoryImageSrc("Electronics", "electronics"),
    href: "/marketplace?category=electronics",
  },
  {
    name: "Beauty",
    commission: 20,
    image: getCategoryImageSrc("Beauty", "health-beauty"),
    href: "/marketplace?category=beauty",
  },
  {
    name: "Home",
    commission: 12,
    image: getCategoryImageSrc("Home", "home-living"),
    href: "/marketplace?category=home",
  },
  {
    name: "Fitness",
    commission: 18,
    image: getCategoryImageSrc("Fitness", "sports-outdoors"),
    href: "/marketplace?category=fitness",
  },
  {
    name: "Education",
    commission: 25,
    image: getCategoryImageSrc("Education", "toys-kids"),
    href: "/marketplace?category=education",
  },
  {
    name: "Digital Products",
    commission: 30,
    image: getCategoryImageSrc("Digital", "office-equipment"),
    href: "/marketplace/digital",
  },
] as const;

export function AffiliateCategories() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <section className={`${AFFILIATE_SHELL} pt-10 sm:pt-12`} id="offers">
      <AffiliateSectionHeading
        title="Explore Top Categories"
        subtitle="Promote high-converting categories with competitive commissions."
      />

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-3.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className={`${AFFILIATE_CARD} group flex w-[148px] shrink-0 flex-col items-center px-3 pb-4 pt-4 transition-all hover:-translate-y-0.5 hover:border-[#fd5000]/25 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] sm:w-[156px]`}
            >
              <div className="relative mb-3 h-[88px] w-[88px]">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  sizes="88px"
                />
              </div>
              <p className="text-center text-[13.5px] font-bold text-[#111827]">
                {cat.name}
              </p>
              <p className="mt-1 text-center text-[12px] text-[#6B7280]">
                Up to{" "}
                <span className="font-semibold text-[#fd5000]">
                  {cat.commission}%
                </span>{" "}
                Commission
              </p>
            </Link>
          ))}
        </div>

        <button
          type="button"
          aria-label="Scroll categories"
          onClick={() => {
            scrollerRef.current?.scrollBy({ left: 200, behavior: "smooth" });
          }}
          className="absolute -right-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-[0_4px_12px_rgba(17,24,39,0.08)] transition-colors hover:text-[#fd5000] md:grid"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

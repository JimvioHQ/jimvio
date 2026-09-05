"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { UGCPremiumCampaignCard } from "./UGCPremiumCampaignCard";

export function UGCFeaturedCarousel({
  campaigns,
  savedIds,
  onToggleSave,
}: {
  campaigns: UGCCampaign[];
  savedIds?: Set<string>;
  onToggleSave?: (campaignId: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (!campaigns.length) return null;

  function scrollByCard(direction: -1 | 1) {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = Math.min(280, Math.max(220, Math.floor(node.clientWidth * 0.72)));
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <section aria-label="Featured campaigns" className="mb-5 sm:mb-6">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-tight text-[#111827] sm:text-[18px]">
          Featured
        </h2>
        <div className="flex items-center gap-2">
          <a
            href="#all-campaigns"
            className="text-[12px] font-semibold text-[#6B7280] hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:underline"
          >
            View all
          </a>
          {campaigns.length > 2 ? (
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                aria-label="Scroll featured campaigns left"
                className="grid h-8 w-8 place-items-center rounded-full border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                aria-label="Scroll featured campaigns right"
                className="grid h-8 w-8 place-items-center rounded-full border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [scrollbar-width:thin]"
      >
        {campaigns.map((c, i) => (
          <div key={c.id} className="w-[228px] shrink-0 snap-start sm:w-[240px] lg:w-[248px]">
            <UGCPremiumCampaignCard
              campaign={c}
              index={i}
              featured
              saved={savedIds?.has(c.id)}
              onToggleSave={onToggleSave}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

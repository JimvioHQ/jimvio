"use client";

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
  if (!campaigns.length) return null;

  return (
    <section aria-label="Featured campaigns" className="mb-7">
      <h2 className="mb-3 text-[18px] font-semibold tracking-tight text-[#111827]">Featured</h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory [scrollbar-width:thin]">
        {campaigns.map((c, i) => (
          <div key={c.id} className="w-[252px] shrink-0 snap-start sm:w-[280px] lg:w-[300px]">
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

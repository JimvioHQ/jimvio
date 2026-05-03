"use client";

import React from "react";
import Link from "next/link";
import { Megaphone, ChevronRight } from "lucide-react";
import { SharedCampaignCard } from "../ugc/campaign-card-shared";

interface CampaignScrollRowProps {
  campaigns: any[];
}

export function CampaignScrollRow({ campaigns }: CampaignScrollRowProps) {
  if (!campaigns?.length) return null;

  return (
    <section className="scroll-mt-32">
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex flex-col gap-1">
          {/* Eyebrow pill */}
          <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30 text-[10px] font-semibold text-[#fd5000] tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-[#fd5000] animate-pulse" />
            Live Now
          </span>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#11181c] dark:text-[#ededed] tracking-tight leading-tight">
            UGC Missions
          </h2>
          <p className="text-[12px] text-[#889096] dark:text-[#6a6a6a] font-medium">
            Promote products &amp; earn on every conversion.
          </p>
        </div>
        <Link
          href="/ugc"
          className="flex items-center gap-1 text-[12px] font-semibold text-[#fd5000] hover:text-orange-700 transition-colors shrink-0 ml-4"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-nowrap gap-3 sm:gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {campaigns.map((c) => (
          <div key={c.id} className="w-[220px] sm:w-[260px] md:w-[280px] shrink-0">
            <SharedCampaignCard c={c} />
          </div>
        ))}
      </div>
    </section>
  );
}

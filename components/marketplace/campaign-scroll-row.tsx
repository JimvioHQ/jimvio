"use client";

import React from "react";
import Link from 'next/link';
import { Megaphone } from "lucide-react";
import { SharedCampaignCard } from "../ugc/campaign-card-shared";

interface CampaignScrollRowProps {
  campaigns: any[];
}

export function CampaignScrollRow({ campaigns }: CampaignScrollRowProps) {
  if (!campaigns?.length) return null;

  return (
    <section className="scroll-mt-32">
       <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-orange-500" /> Live UGC Missions
          </h2>
          <p className="text-xs font-bold text-slate-400">Apply to promote trending products & earn instantly.</p>
        </div>
        <Link href="/ugc" className="text-xs font-black text-orange-600 hover:text-orange-700 transition-colors">
          View all Missions →
        </Link>
      </div>

      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {campaigns.map((c) => (
          <div key={c.id} className="w-[165px] md:w-[280px] shrink-0">
            <SharedCampaignCard c={c} />
          </div>
        ))}
      </div>
    </section>
  );
}

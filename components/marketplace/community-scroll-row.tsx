"use client";

import React from "react";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { SharedCommunityCard } from "../community/community-card-shared";

interface CommunityScrollRowProps {
  communities: any[];
}

export function CommunityScrollRow({ communities }: CommunityScrollRowProps) {
  if (!communities?.length) return null;

  return (
    <section className="scroll-mt-32">
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex flex-col gap-1">
          {/* Eyebrow pill */}
          <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide">
            <Users className="h-3 w-3" />
            Communities
          </span>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#11181c] dark:text-[#ededed] tracking-tight leading-tight">
            Trending Groups
          </h2>
          <p className="text-[12px] text-[#889096] dark:text-[#6a6a6a] font-medium">
            Join elite groups to learn, share &amp; scale.
          </p>
        </div>
        <Link
          href="/communities"
          className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors shrink-0 ml-4"
        >
          Discover <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-nowrap gap-4 sm:gap-5 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {communities.map((comm) => (
          <div key={comm.id} className="w-[260px] sm:w-[280px] md:w-[320px] shrink-0">
            <SharedCommunityCard c={comm} showQuickActions={false} />
          </div>
        ))}
      </div>
    </section>
  );
}

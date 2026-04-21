"use client";

import React from "react";
import Link from 'next/link';
import { Users } from "lucide-react";
import { SharedCommunityCard } from "../community/community-card-shared";

interface CommunityScrollRowProps {
  communities: any[];
}

export function CommunityScrollRow({ communities }: CommunityScrollRowProps) {
  if (!communities?.length) return null;

  return (
    <section className="scroll-mt-32">
       <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" /> Trending Communities
          </h2>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Join elite groups to learn, share, & scale together.</p>
        </div>
        <Link href="/communities" className="text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors">
          Discovery â†’
        </Link>
      </div>

      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {communities.map((comm) => (
          <div key={comm.id} className="w-[165px] md:w-[280px] shrink-0">
            <SharedCommunityCard c={comm} showQuickActions={false} />
          </div>
        ))}
      </div>
    </section>
  );
}


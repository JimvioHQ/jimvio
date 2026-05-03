"use client";

import React from "react";
import Link from "next/link";
import { UserPlus, ChevronRight, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type Creator = {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_earnings?: number;
  total_conversions?: number;
  total_clicks?: number;
  total_views?: number;
};

interface TopCreatorsSectionProps {
  creators: Creator[];
  className?: string;
}

function formatFollowers(conversions: number, clicks: number, clipViews?: number): string {
  let base = conversions * 120 + Math.floor(clicks * 0.8);
  if (clipViews && clipViews > 0) base = Math.max(base, Math.floor(clipViews * 0.015));
  if (base >= 1000000) return (base / 1000000).toFixed(1) + "M";
  if (base >= 1000) return (base / 1000).toFixed(1) + "K";
  return String(base || "—");
}

export function TopCreatorsSection({ creators, className }: TopCreatorsSectionProps) {
  if (!creators?.length) return null;

  return (
    <section className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/30 text-[10px] font-semibold text-pink-600 dark:text-pink-400 tracking-wide">
            <TrendingUp className="h-3 w-3" />
            Top Earners
          </span>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#11181c] dark:text-[#ededed] tracking-tight leading-tight">
            Creators to follow
          </h2>
          <p className="text-[12px] text-[#889096] dark:text-[#6a6a6a] font-medium">
            Trending influencers sharing products right now.
          </p>
        </div>
        <Link
          href="/influencers/browse"
          className="flex items-center gap-1 text-[12px] font-semibold text-[#fd5000] hover:text-orange-700 transition-colors shrink-0 ml-4"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Grid — 2 cols on mobile, 3 on sm, 6 on lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {creators.map((c) => {
          const followers = formatFollowers(c.total_conversions ?? 0, c.total_clicks ?? 0, c.total_views);
          const profileUrl = `/influencers/u/${c.user_id}`;
          return (
            <div
              key={c.id}
              className="group flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111] border border-stone-100 dark:border-white/6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
            >
              <Link href={profileUrl} className="flex flex-col items-center flex-1 min-w-0 w-full gap-2">
                {/* Avatar with glow ring on hover */}
                <div className="relative mb-1">
                  <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-white dark:ring-[#111] group-hover:ring-[#fd5000]/20 transition-all duration-300 shadow-sm">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-[#fd5000] to-orange-600 text-white font-bold text-lg">
                      {c.full_name?.[0] ?? "C"}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online dot */}
                  <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111]" />
                </div>

                <div className="w-full">
                  <h3 className="text-[12px] sm:text-[13px] font-semibold text-[#11181c] dark:text-[#ededed] truncate">
                    {c.full_name ?? "Creator"}
                  </h3>
                  <p className="text-[10px] text-[#889096] font-medium mt-0.5">
                    {followers} followers
                  </p>
                </div>
              </Link>

              {/* Follow CTA */}
              <Link href={profileUrl} className="w-full mt-3">
                <button className="w-full h-9 rounded-full text-[11px] font-semibold bg-[#fd5000] hover:bg-[#e04700] text-white transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(253,80,0,0.25)]">
                  <UserPlus className="h-3.5 w-3.5" />
                  Follow
                </button>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { UserPlus, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Creator = {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_earnings?: number;
  total_conversions?: number;
  total_clicks?: number;
  /** Clip views (influencer leaderboards). */
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
  return String(base);
}

export function TopCreatorsSection({ creators, className }: TopCreatorsSectionProps) {
  if (!creators?.length) return null;

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] sm:text-[22px] font-extrabold text-text-primary flex items-center gap-2.5 tracking-tight">
            Influencers to follow
          </h2>
          <p className="text-[12px] text-[#6b7280] font-medium mt-0.5">Trending creators sharing products</p>
        </div>
        <Link
          href="/influencers"
          className="text-[11px] font-bold text-[#f97316] capitalize tracking-widest flex items-center gap-1.5 hover:gap-2.5 transition-all shrink-0"
        >
          View All <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {creators.map((c) => {
          const followers = formatFollowers(c.total_conversions ?? 0, c.total_clicks ?? 0, c.total_views);
          const profileUrl = `/influencers/u/${c.user_id}`;
          return (
            <div
              key={c.id}
              className="group flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-[#f0f0f0] shadow-sm hover:shadow-lg hover:border-[#f97316]/20 transition-all duration-300"
            >
              <Link href={profileUrl} className="flex flex-col items-center flex-1 min-w-0 w-full">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-[#fff7ed] group-hover:border-[#f97316]/30 transition-colors mb-3">
                  <AvatarImage src={c.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-[#f97316] text-white font-black text-lg">
                    {c.full_name?.[0] ?? "C"}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-[13px] font-black text-text-primary truncate w-full mb-0.5">
                  {c.full_name ?? "Creator"}
                </h3>
                <p className="text-[11px] text-[#6b7280] font-bold mb-3">
                  {followers} followers
                </p>
                <p className="text-[10px] text-[#9ca3af] line-clamp-2 mb-4 flex-1 min-h-[2.5rem]">
                  B2B creator · Verified
                </p>
              </Link>
              <Link href={profileUrl} className="w-full">
                <Button
                  size="sm"
                  className="w-full rounded-xl h-9 text-[11px] font-black bg-[#f97316] hover:bg-[#ea580c] text-white border-0"
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Follow
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

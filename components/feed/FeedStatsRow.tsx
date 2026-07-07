"use client";

import { ChevronRight, Mic, Users } from "lucide-react";
import { CreatorChallengeCard } from "@/components/feed/CreatorChallengeCard";
import { FeedSearchBar } from "@/components/feed/FeedSearchBar";
import { FEED_STATS } from "@/lib/feed/mock-data";

type StatItemProps = {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  delta: string;
  showChevron?: boolean;
  isLast?: boolean;
};

function StatItem({ icon, iconBg, value, label, delta, showChevron, isLast }: StatItemProps) {
  return (
    <div
      className={`flex min-w-[150px] flex-1 items-center gap-3 px-5 py-2 sm:min-w-0 ${
        !isLast ? "border-r border-gray-100" : ""
      }`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[22px] font-bold tabular-nums leading-none text-[#1A1A1A] font-mono">{value}</p>
        <p className="mt-1 text-xs text-[#6B7280] font-medium">{label}</p>
        <p className="mt-0.5 text-[11px] font-medium text-[#2D8A4E]">{delta}</p>
      </div>
      {showChevron && (
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
      )}
    </div>
  );
}

function OnlineIcon() {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <span className="absolute h-4 w-4 rounded-full border-2 border-green-500/40" />
      <span className="h-2 w-2 rounded-full bg-green-500" />
    </span>
  );
}

function LiveIcon() {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <span className="absolute h-4 w-4 rounded-full border-2 border-red-400/60" />
      <span className="h-2 w-2 rounded-full bg-red-500" />
    </span>
  );
}

export function FeedStatsRow() {
  return (
    <div className="space-y-3">
      <FeedSearchBar />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm scrollbar-hide">
          <StatItem
            icon={<OnlineIcon />}
            iconBg="bg-green-50"
            value={FEED_STATS.onlineNow.value}
            label="Online now"
            delta={FEED_STATS.onlineNow.delta}
            showChevron
          />
          <StatItem
            icon={<LiveIcon />}
            iconBg="bg-red-50"
            value={FEED_STATS.liveSessions.value}
            label="Live sessions"
            delta={FEED_STATS.liveSessions.delta}
          />
          <StatItem
            icon={<Mic className="h-4 w-4 text-violet-500" strokeWidth={2} />}
            iconBg="bg-violet-50"
            value={FEED_STATS.voiceRooms.value}
            label="Voice rooms"
            delta={FEED_STATS.voiceRooms.delta}
          />
          <StatItem
            icon={<Users className="h-4 w-4 text-gray-600" strokeWidth={2} />}
            iconBg="bg-gray-100"
            value={FEED_STATS.activeCommunities.value}
            label="Active communities"
            delta={FEED_STATS.activeCommunities.delta}
            isLast
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { AIAssistantPanel } from "@/components/feed/AIAssistantPanel";
import { ActivityFeedCard } from "@/components/feed/ActivityFeedCard";
import { FeedDiscoverRail } from "@/components/feed/FeedDiscoverRail";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { FeedStatsRow } from "@/components/feed/FeedStatsRow";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { LiveNowCard } from "@/components/feed/LiveNowCard";
import { MiniLivePlayerBar } from "@/components/feed/MiniLivePlayerBar";
import { PostComposer } from "@/components/feed/PostComposer";
import { StoriesRail } from "@/components/feed/StoriesRail";
import { TopMissionsList } from "@/components/feed/TopMissionsList";
import { UpcomingLiveSessions } from "@/components/feed/UpcomingLiveSessions";

function FeedRightRailTop() {
  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <LiveNowCard />
        <AIAssistantPanel />
      </div>
      <div className="min-w-0 space-y-4">
        <UpcomingLiveSessions />
        <ActivityFeedCard />
        <TopMissionsList />
      </div>
    </div>
  );
}

export function FeedPageContent() {
  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] bg-gradient-to-b from-[#FFF8F5]/80 via-gray-50/80 to-gray-50/80 p-4 lg:p-6">
        <div className="mb-4">
          <h1 className="text-[22px] font-black tracking-tight text-[#111827] sm:text-[26px]">
            Creator OS Feed
          </h1>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            Posts, launches, campaigns, trending creators, and live energy — personalized for you.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 space-y-5 pb-20 lg:col-span-8 xl:col-span-9 2xl:col-span-7">
            <FeedStatsRow />
            <StoriesRail />
            <PostComposer />
            <FeedDiscoverRail />
            <div className="space-y-0">
              <FeedTabs />
              <FeedPostCard />
            </div>
          </div>
          <aside className="scrollbar-hide hidden lg:col-span-4 lg:block lg:sticky lg:top-4 lg:z-10 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain xl:col-span-3 2xl:col-span-5">
            <FeedRightRailTop />
          </aside>
        </div>
      </div>
      <MiniLivePlayerBar />
    </>
  );
}

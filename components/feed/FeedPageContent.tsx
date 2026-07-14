"use client";

import { AIAssistantPanel } from "@/components/feed/AIAssistantPanel";
import { ActivityFeedCard } from "@/components/feed/ActivityFeedCard";
import { FeedFloatingBar } from "@/components/feed/FeedFloatingBar";
import { CreateQuickLaunch } from "@/components/feed/CreateQuickLaunch";
import { CreatorChallengeCard } from "@/components/feed/CreatorChallengeCard";
import { CreatorInsightsCard } from "@/components/feed/CreatorInsightsCard";
import { EarningsOverviewCard } from "@/components/feed/EarningsOverviewCard";
import { FeedPostCard } from "@/components/feed/FeedPostCard";

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
        <CreateQuickLaunch />
        <LiveNowCard />
        <EarningsOverviewCard />
        <AIAssistantPanel />
      </div>
      <div className="min-w-0 space-y-4">
        <CreatorInsightsCard />
        <UpcomingLiveSessions />
        <ActivityFeedCard />
        <TopMissionsList />
        <CreatorChallengeCard />
      </div>
    </div>
  );
}

export function FeedPageContent() {
  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] bg-gray-50 p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 space-y-4 pb-20 lg:col-span-8 xl:col-span-9 2xl:col-span-7">
            <StoriesRail />
            <PostComposer />
            <FeedTabs />
            <FeedPostCard />
          </div>
          <aside className="scrollbar-hide hidden lg:col-span-4 lg:block lg:sticky lg:top-4 lg:z-10 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain xl:col-span-3 2xl:col-span-5">
            <FeedRightRailTop />
          </aside>
        </div>
      </div>
      <MiniLivePlayerBar />
      <FeedFloatingBar />
    </>
  );
}

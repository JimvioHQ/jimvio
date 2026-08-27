"use client";

import { useState } from "react";
import { AIAssistantPanel } from "@/components/feed/AIAssistantPanel";
import { ActivityFeedCard } from "@/components/feed/ActivityFeedCard";
import { FeedDiscoverRail } from "@/components/feed/FeedDiscoverRail";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { LiveNowCard } from "@/components/feed/LiveNowCard";
import { MiniLivePlayerBar } from "@/components/feed/MiniLivePlayerBar";
import { PostComposer } from "@/components/feed/PostComposer";
import { StoriesRail } from "@/components/feed/StoriesRail";
import { TopMissionsList } from "@/components/feed/TopMissionsList";
import { UpcomingLiveSessions } from "@/components/feed/UpcomingLiveSessions";
import type { FeedTab } from "@/lib/feed/mock-data";
import type { TrendingCommunity } from "@/components/feed/FeedDiscoverRail";

/** Single narrow intelligence rail — never multi-column. */
function FeedRightRail() {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <LiveNowCard />
      <AIAssistantPanel />
      <UpcomingLiveSessions />
      <ActivityFeedCard />
      <TopMissionsList />
    </div>
  );
}

export function FeedPageContent({
  initialCommunities = [],
}: {
  initialCommunities?: TrendingCommunity[];
}) {
  const [feedTab, setFeedTab] = useState<FeedTab>("For You");

  return (
    <>
      <div className="mx-auto w-full max-w-[1440px] bg-gradient-to-b from-[#FFF8F5]/80 via-gray-50/80 to-gray-50/80 p-4 lg:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-5">
          {/* Main feed — dominant */}
          <div className="min-w-0 flex-1 space-y-5 pb-8 lg:pb-20">
            <StoriesRail />
            <PostComposer />
            <FeedDiscoverRail initialCommunities={initialCommunities} />
            <div className="space-y-0">
              <FeedTabs value={feedTab} onChange={setFeedTab} />
              <FeedPostCard tab={feedTab} />
            </div>
          </div>

          {/* Compact intelligence rail — stacked under feed on mobile */}
          <aside className="w-full shrink-0 pb-16 lg:sticky lg:top-4 lg:z-10 lg:w-[300px] lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pb-4 xl:w-[320px]">
            <FeedRightRail />
          </aside>
        </div>
      </div>
      <MiniLivePlayerBar />
    </>
  );
}

"use client";

import { useState } from "react";
import { AIAssistantPanel } from "@/components/feed/AIAssistantPanel";
import { ActivityFeedCard } from "@/components/feed/ActivityFeedCard";
import { FeedDiscoverRail } from "@/components/feed/FeedDiscoverRail";
import { FeedPostCard, type ApiPost } from "@/components/feed/FeedPostCard";
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
  initialPosts = [],
  initialNextCursor = null,
}: {
  initialCommunities?: TrendingCommunity[];
  initialPosts?: ApiPost[];
  initialNextCursor?: string | null;
}) {
  const [feedTab, setFeedTab] = useState<FeedTab>("For You");

  return (
    <>
      <div className="mx-auto w-full min-w-0 max-w-[1440px] overflow-x-hidden bg-[var(--color-bg)] p-3 sm:p-4 lg:p-5">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:gap-5">
          {/* Main feed — dominant */}
          <div className="min-w-0 flex-1 space-y-4 sm:space-y-5 pb-4 lg:pb-20">
            <StoriesRail />
            <PostComposer />
            <FeedDiscoverRail initialCommunities={initialCommunities} />
            <div className="space-y-0">
              <FeedTabs value={feedTab} onChange={setFeedTab} />
              <FeedPostCard
                tab={feedTab}
                initialPosts={feedTab === "For You" ? initialPosts : []}
                initialNextCursor={feedTab === "For You" ? initialNextCursor : null}
              />
            </div>
          </div>

          {/* Compact intelligence rail — stacked under feed on mobile */}
          <aside className="w-full shrink-0 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:sticky lg:top-4 lg:z-10 lg:w-[300px] lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pb-4 xl:w-[320px]">
            <FeedRightRail />
          </aside>
        </div>
      </div>
      <MiniLivePlayerBar />
    </>
  );
}

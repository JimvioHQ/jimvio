"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CREATOR_PROFILE_TABS, type CreatorProfilePayload, type CreatorProfileTab } from "@/lib/creator-profile";
import { buildCreatorCommerceGraph } from "@/lib/commerce-graph";
import { buildCreatorBusinessGraph } from "@/lib/business-graph";
import { CommerceGraphDiscovery, CommerceGraphPanel } from "@/components/commerce-graph";
import {
  BusinessCollaborationPanel,
  BusinessGraphDiscovery,
  BusinessProfileRelations,
} from "@/components/business-graph";
import { CreatorProfileHeader } from "./CreatorProfileHeader";
import { CreatorProfileActions } from "./CreatorProfileActions";
import { CreatorProfileAISection } from "./CreatorProfileAISection";
import {
  CreatorProfileAboutTab,
  CreatorProfileCampaignsTab,
  CreatorProfileCommunitiesTab,
  CreatorProfileCoursesTab,
  CreatorProfilePostsTab,
  CreatorProfileProductsTab,
  CreatorProfileReviewsTab,
  CreatorProfileVideosTab,
} from "./CreatorProfileTabs";

export function CreatorProfilePage({ payload }: { payload: CreatorProfilePayload }) {
  const [activeTab, setActiveTab] = useState<CreatorProfileTab>("products");
  const cartSet = useMemo(() => new Set(payload.cartProductIds), [payload.cartProductIds]);
  const primaryCommunity = payload.communities[0];

  const tabCounts: Partial<Record<CreatorProfileTab, number>> = {
    products: payload.products.length,
    courses: payload.courses.length,
    communities: payload.communities.length,
    ugc: payload.ugcCampaigns.length,
    affiliate: payload.affiliateCampaigns.length,
    videos: payload.videos.length,
    posts: payload.posts.length,
    reviews: payload.reviews.length,
  };

  const commerceGraph = useMemo(() => buildCreatorCommerceGraph(payload), [payload]);
  const businessGraph = useMemo(() => buildCreatorBusinessGraph(payload), [payload]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <CreatorProfileHeader
        identity={payload.profile.identity}
        stats={payload.profile.stats}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CreatorProfileActions
            identity={payload.profile.identity}
            isFollowing={payload.isFollowing}
            primaryCommunityHref={
              primaryCommunity ? `/communities/${primaryCommunity.slug}` : undefined
            }
          />
        </div>

        <div className="mb-6">
          <CreatorProfileAISection identity={payload.profile.identity} />
        </div>

        <div className="mb-6">
          <CommerceGraphDiscovery graph={commerceGraph} showPath />
        </div>

        <div className="mb-6 hidden xl:block">
          <CommerceGraphPanel graph={commerceGraph} title="Creator commerce connections" />
        </div>

        <div className="mb-6">
          <BusinessProfileRelations graph={businessGraph} />
        </div>

        <div className="mb-6 grid gap-5 xl:grid-cols-[1fr_320px]">
          <BusinessGraphDiscovery graph={businessGraph} maxSections={5} showSearch={false} />
          <BusinessCollaborationPanel graph={businessGraph} title="Partnership opportunities" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <div
            className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Creator profile sections"
          >
            {CREATOR_PROFILE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold transition-[transform,background-color,color] duration-200",
                  activeTab === tab.id
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                )}
                style={{ willChange: "transform" }}
              >
                {tab.label}
                {tabCounts[tab.id] != null && tabCounts[tab.id]! > 0 ? (
                  <span className="ml-1 opacity-80">({tabCounts[tab.id]})</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6" role="tabpanel">
            {activeTab === "products" && (
              <CreatorProfileProductsTab products={payload.products} cartProductIds={cartSet} />
            )}
            {activeTab === "courses" && <CreatorProfileCoursesTab courses={payload.courses} />}
            {activeTab === "communities" && (
              <CreatorProfileCommunitiesTab communities={payload.communities} />
            )}
            {activeTab === "ugc" && (
              <CreatorProfileCampaignsTab campaigns={payload.ugcCampaigns} type="ugc" />
            )}
            {activeTab === "affiliate" && (
              <CreatorProfileCampaignsTab campaigns={payload.affiliateCampaigns} type="affiliate" />
            )}
            {activeTab === "videos" && <CreatorProfileVideosTab videos={payload.videos} />}
            {activeTab === "posts" && <CreatorProfilePostsTab posts={payload.posts} />}
            {activeTab === "reviews" && (
              <CreatorProfileReviewsTab
                reviews={payload.reviews}
                stats={{
                  rating: payload.profile.stats.rating,
                  reviewCount: payload.profile.stats.reviewCount,
                  responseTime: payload.profile.stats.responseTime,
                }}
              />
            )}
            {activeTab === "about" && (
              <CreatorProfileAboutTab
                identity={payload.profile.identity}
                stats={payload.profile.stats}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

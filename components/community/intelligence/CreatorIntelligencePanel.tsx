"use client";

import {
  buildIntelligenceSnapshot,
  type IntelligenceRecommendation,
} from "@/lib/community/intelligence";
import {
  IntelligenceDashboard,
  RecommendationRail,
  UnifiedAnalyticsStrip,
} from "@/components/community/intelligence";
import type { CreatorProfilePayload } from "@/lib/creator-profile";

/**
 * Creator profile intelligence — derives insights from profile payload + stores.
 */
export function CreatorIntelligencePanel({
  payload,
}: {
  payload: CreatorProfilePayload;
}) {
  const communityId =
    payload.communities[0]?.id ?? `creator-${payload.profile.identity.id}`;
  const snapshot = buildIntelligenceSnapshot({
    communityId,
    communityName: payload.profile.identity.displayName,
    memberCount: payload.profile.stats.followers,
    coursesCount: payload.courses.length,
    commerceItems: payload.products.slice(0, 6).map((p) => ({
      kind: "product" as const,
      id: p.id,
      title: p.name,
      price: p.price,
      href: `/marketplace/${p.slug}`,
      communityId,
      featured: !!p.isFeatured,
      createdAt: p.createdAt ?? new Date().toISOString(),
      createdBy: payload.profile.identity.userId ?? null,
    })),
  });

  const creatorRecs: IntelligenceRecommendation[] = [
    {
      id: "cr-products",
      kind: "product",
      domain: "commerce",
      title: `${payload.profile.stats.productsCount} products`,
      reason: "Creator store inventory ready for live shopping and chat embeds.",
      href: payload.profile.identity.storeHref ?? undefined,
      score: 80,
      source: "overview",
    },
    {
      id: "cr-courses",
      kind: "course",
      domain: "learning",
      title: `${payload.courses.length} courses`,
      reason: "Recommend learning paths from this creator’s courses.",
      score: 76,
      source: "overview",
    },
    {
      id: "cr-communities",
      kind: "community",
      domain: "community",
      title: `${payload.profile.stats.communitiesCount} communities`,
      reason: "Cross-promote communities where this creator teaches and sells.",
      score: 72,
      source: "overview",
    },
    ...snapshot.recommendations.slice(0, 4),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          Creator Intelligence
        </h3>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Growth, engagement, knowledge, commerce, and trust — connected across
          Jimvio, not a separate chatbot.
        </p>
      </div>
      <UnifiedAnalyticsStrip
        analytics={[
          {
            metric: "growth",
            label: "Followers",
            value: payload.profile.stats.followers,
            unit: "people",
            trend: "up",
            note: "Creator following",
          },
          {
            metric: "commerce",
            label: "Sales",
            value: payload.profile.stats.totalSales,
            unit: "orders",
            trend: "up",
            note: "Lifetime sales signal",
          },
          {
            metric: "learning",
            label: "Courses",
            value: payload.courses.length,
            unit: "courses",
            trend: payload.courses.length > 0 ? "up" : "flat",
            note: "Teaching inventory",
          },
          {
            metric: "trust",
            label: "Rating",
            value: Math.round(payload.profile.stats.rating * 10),
            unit: "/50",
            trend: "flat",
            note: "Trust score proxy",
          },
          {
            metric: "contribution",
            label: "Communities",
            value: payload.profile.stats.communitiesCount,
            unit: "hubs",
            trend: "flat",
            note: "Community footprint",
          },
          {
            metric: "engagement",
            label: "Reviews",
            value: payload.profile.stats.reviewCount,
            unit: "reviews",
            trend: "flat",
            note: "Social proof",
          },
          {
            metric: "knowledge",
            label: "Products",
            value: payload.profile.stats.productsCount,
            unit: "SKUs",
            trend: "up",
            note: "Catalog depth",
          },
        ]}
      />
      <section className="space-y-2">
        <h4 className="text-[12px] font-bold uppercase text-[var(--color-text-muted)]">
          Recommendations
        </h4>
        <RecommendationRail recommendations={creatorRecs} />
      </section>
      <IntelligenceDashboard
        snapshot={{
          ...snapshot,
          recommendations: creatorRecs,
        }}
        compact
      />
    </div>
  );
}

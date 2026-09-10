import type { SharedCampaignRow } from "@/components/ugc/campaign-card-shared";
import { Hero } from "./hero";
import { WhatToDoToday } from "./action-hub";
import { ChooseYourJourney } from "./choose-your-journey";
import {
  TrustedStrip,
  PlatformOverviewBar,
  TrendingProductsRow,
} from "./homepage-sections";
import {
  HowJimvioWorks,
  FeaturedUGCCampaigns,
  FeaturedCommunities,
  OnePlatformOpportunities,
  GrowthStack,
  WhyChooseJimvio,
  GlobalNetworkStats,
  TopCreatorsEarnings,
  First30Minutes,
  FAQSection,
  TrustedBrands,
  TakeJimvioEverywhere,
} from "./homepage-sections-lazy";
import { HomeMotionSection } from "@/components/motion/home-motion-section";

interface Community {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  category?: string;
  member_count?: number;
  post_count?: number;
  is_free?: boolean;
  monthly_price?: number;
  currency?: string;
  cover_image?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface HomepageRedesignProps {
  campaigns?: SharedCampaignRow[];
  communities?: Community[];
  communitiesLoadError?: boolean;
  products?: unknown[];
  flashDeals?: unknown[];
  productsLoadError?: boolean;
  trendingProductsTotal?: number;
  creators?: unknown[];
  platform?: {
    totalUsers: number;
    totalProducts: number;
    totalEarnings: number;
    totalVendors: number;
    totalCommunities: number;
  };
  stats?: {
    users: string;
    earned: string;
    secure: string;
    countries: string;
  };
  totalUsers?: number;
}

/**
 * Server Component shell — client islands live in section files.
 * Keep this file free of "use client" so static sections stay lean.
 */
export function HomepageRedesign({
  campaigns = [],
  communities = [],
  communitiesLoadError = false,
  products = [],
  flashDeals = [],
  productsLoadError = false,
  trendingProductsTotal,
  creators = [],
  platform,
}: HomepageRedesignProps) {
  return (
    <div
      className="min-h-screen w-full max-w-[100dvw] overflow-x-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      <Hero />
      <WhatToDoToday />
      <TrustedStrip />
      <ChooseYourJourney />
      <TrendingProductsRow
        products={products as never}
        flashDeals={flashDeals as never}
        total={trendingProductsTotal}
        loadError={productsLoadError}
      />
      <FeaturedUGCCampaigns campaigns={campaigns} />
      <FeaturedCommunities
        communities={communities}
        loadError={communitiesLoadError}
      />
      <PlatformOverviewBar />
      <HowJimvioWorks />
      <HomeMotionSection>
        <OnePlatformOpportunities />
      </HomeMotionSection>
      <HomeMotionSection>
        <GrowthStack />
      </HomeMotionSection>
      <HomeMotionSection>
        <WhyChooseJimvio />
      </HomeMotionSection>
      <HomeMotionSection>
        <GlobalNetworkStats platform={platform} />
      </HomeMotionSection>
      <HomeMotionSection>
        <TopCreatorsEarnings creators={creators as never} />
      </HomeMotionSection>
      <HomeMotionSection>
        <First30Minutes />
      </HomeMotionSection>
      <HomeMotionSection>
        <FAQSection />
      </HomeMotionSection>
      <HomeMotionSection>
        <TrustedBrands />
      </HomeMotionSection>
      <HomeMotionSection>
        <TakeJimvioEverywhere />
      </HomeMotionSection>
    </div>
  );
}

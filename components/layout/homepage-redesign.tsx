import type { SharedCampaignRow } from "@/components/ugc/campaign-card-shared";
import { Hero } from "./hero";
import { WhatToDoToday } from "./action-hub";
import { ChooseYourJourney } from "./choose-your-journey";
import { HomeCanvas } from "./home-canvas";
import { TrustedStrip, TrendingProductsRow } from "./homepage-sections";
import {
  HowJimvioWorks,
  FeaturedUGCCampaigns,
  FeaturedCommunities,
  GrowthStack,
  WhyChooseJimvio,
  GlobalNetworkSection,
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
 *
 * Final Home order:
 * 1. What do you want to build today?
 * 2. Why people stick with Jimvio
 * 3. Choose Your Journey
 * 4. Global Network + Top Earner
 * 5. How Jimvio Works
 * 6. Your first 30 minutes on Jimvio
 * 7. Take Jimvio Everywhere
 * 8. Remaining approved sections
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
    <HomeCanvas>
      <Hero />
      <WhatToDoToday />
      <TrustedStrip />

      <HomeMotionSection>
        <WhyChooseJimvio />
      </HomeMotionSection>

      <ChooseYourJourney />

      <HomeMotionSection>
        <GlobalNetworkSection creators={creators as never} platform={platform} />
      </HomeMotionSection>

      <HowJimvioWorks />

      <HomeMotionSection>
        <First30Minutes />
      </HomeMotionSection>

      <HomeMotionSection>
        <TakeJimvioEverywhere />
      </HomeMotionSection>

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
      <HomeMotionSection>
        <GrowthStack />
      </HomeMotionSection>
      <HomeMotionSection>
        <FAQSection />
      </HomeMotionSection>
      <HomeMotionSection>
        <TrustedBrands />
      </HomeMotionSection>
    </HomeCanvas>
  );
}

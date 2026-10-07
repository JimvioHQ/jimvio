"use client";

import dynamic from "next/dynamic";

const loading = () => (
  <div
    aria-hidden
    className="mx-auto w-full max-w-8xl px-4 py-12 sm:px-6 sm:py-16"
    style={{ minHeight: 120 }}
  />
);

export const HowJimvioWorks = dynamic(
  () => import("./how-jimvio-works").then((m) => ({ default: m.HowJimvioWorks })),
  { loading },
);

export const FeaturedUGCCampaigns = dynamic(
  () => import("./homepage-sections").then((m) => ({ default: m.FeaturedUGCCampaigns })),
  { loading },
);

export const FeaturedCommunities = dynamic(
  () => import("./featured-communities").then((m) => ({ default: m.FeaturedCommunities })),
  { loading },
);

export const GrowthStack = dynamic(
  () => import("./homepage-sections").then((m) => ({ default: m.GrowthStack })),
  { loading },
);

export const WhyChooseJimvio = dynamic(
  () => import("./homepage-sections").then((m) => ({ default: m.WhyChooseJimvio })),
  { loading },
);

export const GlobalNetworkSection = dynamic(
  () =>
    import("./global-network-section").then((m) => ({
      default: m.GlobalNetworkSection,
    })),
  { loading },
);

export const First30Minutes = dynamic(
  () => import("./first-30-minutes").then((m) => ({ default: m.First30Minutes })),
  { loading },
);

export const FAQSection = dynamic(
  () => import("./homepage-sections").then((m) => ({ default: m.FAQSection })),
  { loading },
);

export const TrustedBrands = dynamic(
  () => import("./homepage-sections").then((m) => ({ default: m.TrustedBrands })),
  { loading },
);

export const TakeJimvioEverywhere = dynamic(
  () => import("./homepage-sections").then((m) => ({ default: m.TakeJimvioEverywhere })),
  { loading },
);

import { Hero, type HeroLiveStats } from "./hero";
import { getPlatformStats } from "@/services/platform";
import { WhatToDoToday } from "./action-hub";
import { ChooseYourJourney } from "./choose-your-journey";
import { HomeCanvas } from "./home-canvas";
import { WhyChooseJimvio } from "./why-choose-jimvio";
import { TakeJimvioEverywhere } from "./take-jimvio-everywhere";
import {
  HowJimvioWorks,
  First30Minutes,
  FAQSection,
} from "./homepage-sections-lazy";

/**
 * Server Component shell — client islands live in section files.
 *
 * Final Home order:
 * 1. Hero
 * 2. What do you want to build today?
 * 3. Why people stick with Jimvio
 * 4. Choose Your Journey
 * 5. How Jimvio Works
 * 6. Your first 30 minutes on Jimvio
 * 7. Take Jimvio Everywhere
 * 8. Common questions
 */
/**
 * Live profile, vendor, and product totals. Countries stay on the configured
 * platform value. Unavailable or empty queries keep the published fallback.
 * Counts are not incremented on a timer.
 */
async function loadHeroLiveStats(): Promise<HeroLiveStats | null> {
  try {
    const stats = await Promise.race([
      getPlatformStats(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 2500);
      }),
    ]);
    if (!stats) return null;
    const users = stats.totalUsers;
    const businesses = stats.totalVendors;
    const products = stats.totalProducts;
    if (users <= 0 && businesses <= 0 && products <= 0) return null;
    return { users, businesses, products };
  } catch {
    return null;
  }
}

export async function HomepageRedesign() {
  const liveStats = await loadHeroLiveStats();

  return (
    <HomeCanvas>
      <Hero liveStats={liveStats} />
      <WhatToDoToday />
      <WhyChooseJimvio />
      <ChooseYourJourney />
      <HowJimvioWorks />
      <First30Minutes />
      <TakeJimvioEverywhere />
      <FAQSection />
    </HomeCanvas>
  );
}

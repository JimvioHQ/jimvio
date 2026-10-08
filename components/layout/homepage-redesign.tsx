import { Hero } from "./hero";
import { WhatToDoToday } from "./action-hub";
import { ChooseYourJourney } from "./choose-your-journey";
import { HomeCanvas } from "./home-canvas";
import {
  HowJimvioWorks,
  WhyChooseJimvio,
  First30Minutes,
  FAQSection,
  TakeJimvioEverywhere,
} from "./homepage-sections-lazy";
import { HomeMotionSection } from "@/components/motion/home-motion-section";

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
 * 7. Common questions
 * 8. Take Jimvio Everywhere
 */
export function HomepageRedesign() {
  return (
    <HomeCanvas>
      <Hero />
      <WhatToDoToday />

      <HomeMotionSection>
        <WhyChooseJimvio />
      </HomeMotionSection>

      <ChooseYourJourney />
      <HowJimvioWorks />

      <HomeMotionSection>
        <First30Minutes />
      </HomeMotionSection>

      <HomeMotionSection>
        <FAQSection />
      </HomeMotionSection>

      <HomeMotionSection>
        <TakeJimvioEverywhere />
      </HomeMotionSection>
    </HomeCanvas>
  );
}

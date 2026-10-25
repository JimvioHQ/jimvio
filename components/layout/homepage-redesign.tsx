import { Hero } from "./hero";
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
 * 4. How Jimvio Works
 * 5. Your first 30 minutes on Jimvio
 * 6. Choose Your Journey
 * 7. Take Jimvio Everywhere
 * 8. Common questions
 */
export async function HomepageRedesign() {
  return (
    <HomeCanvas>
      <Hero />
      <WhatToDoToday />
      <WhyChooseJimvio />
      <HowJimvioWorks />
      <First30Minutes />
      <ChooseYourJourney />
      <TakeJimvioEverywhere />
      <FAQSection />
    </HomeCanvas>
  );
}

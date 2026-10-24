import { Hero } from "./hero";
import { WhatJimvioIs } from "./what-jimvio-is";
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
 * 2. What Jimvio is
 * 3. What do you want to build today?
 * 4. Why people stick with Jimvio
 * 5. Choose Your Journey
 * 6. How Jimvio Works
 * 7. Your first 30 minutes on Jimvio
 * 8. Take Jimvio Everywhere
 * 9. Common questions
 */
export async function HomepageRedesign() {
  return (
    <HomeCanvas>
      <Hero />
      <WhatJimvioIs />
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

"use client";

import dynamic from "next/dynamic";

const loading = () => (
  <div aria-hidden className="jimvio-home-section mx-auto w-full max-w-8xl px-4 sm:px-6" />
);

export const HowJimvioWorks = dynamic(
  () => import("./how-jimvio-works").then((m) => ({ default: m.HowJimvioWorks })),
  { loading },
);

export const First30Minutes = dynamic(
  () => import("./first-30-minutes").then((m) => ({ default: m.First30Minutes })),
  { loading },
);

export const FAQSection = dynamic(
  () => import("./common-questions").then((m) => ({ default: m.FAQSection })),
  { loading },
);

"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";
import { JourneyStack, JOURNEY_STACK_CSS } from "./journey-stack";
import { MobileStoryStack } from "./mobile-story-stack";
import {
  BuyProductsVisual,
  EarnCommissionsVisual,
  CreateCampaignsVisual,
} from "./journey-visuals";

const ORANGE = "#FF5A1F";
const GREEN = "#16a34a";
const BLUE = "#2563eb";
const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

type Step = {
  step: string;
  title: string;
  desc: string;
  detail: string;
  color: string;
  visual: ReactNode;
};

/** Preserve existing Home step content — visual redesign only. */
const STEPS: readonly Step[] = [
  {
    step: "01",
    title: "Look around",
    desc: "Check products, open campaigns, and skim communities before you pick a lane.",
    detail: "Marketplace, UGC, and groups live in one app.",
    color: ORANGE,
    visual: <BuyProductsVisual accent={ORANGE} />,
  },
  {
    step: "02",
    title: "Promote & earn",
    desc: "List stock, drop affiliate links, or ship content for a live brief.",
    detail: "Payouts hit your Jimvio wallet.",
    color: GREEN,
    visual: <EarnCommissionsVisual accent={GREEN} />,
  },
  {
    step: "03",
    title: "See what sticks",
    desc: "Watch which links and posts actually convert, then do more of that.",
    detail: "Sales and clicks in one dashboard.",
    color: BLUE,
    visual: <CreateCampaignsVisual accent={BLUE} />,
  },
];

function HowStepCard({ step, index }: { step: Step; index: number }) {
  return (
    <RevealItem index={index + 2} as="article" className="h-full">
      <JourneyStack
        accent={step.color}
        className="h-full"
        density="compact"
        style={{ ["--how-accent" as string]: step.color } as CSSProperties}
      >
        <div className="relative flex h-full min-h-[280px] flex-col sm:min-h-[300px]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(160deg, color-mix(in srgb, ${step.color} 9%, #ffffff) 0%, #ffffff 46%)`,
            }}
          />

          <div className="relative flex h-[132px] items-center justify-center px-4 pt-5 sm:h-[148px]">
            <span
              className="absolute left-4 top-4 rounded-full px-2.5 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-bold tracking-[0.14em] sm:left-5 sm:top-5"
              style={{ background: `${step.color}14`, color: step.color }}
            >
              {step.step}
            </span>
            <div
              className={cn(
                "jimvio-card-visual relative h-[118px] w-[132px] sm:h-[128px] sm:w-[144px]",
                "drop-shadow-[0_16px_28px_rgba(17,24,39,0.12)]",
                "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "group-hover/stack:-translate-y-2 group-hover/stack:scale-[1.04]",
                "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:scale-100",
              )}
            >
              {step.visual}
            </div>
          </div>

          <div
            className={cn(
              "jimvio-card-panel relative z-[2] mx-3 mb-3 mt-auto rounded-[18px] border border-[rgba(17,24,39,0.05)]",
              "bg-white/95 p-4 shadow-[0_10px_28px_rgba(17,24,39,0.06)] sm:mx-4 sm:mb-4 sm:p-[18px]",
              "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "group-hover/stack:-translate-y-1",
              "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0",
            )}
          >
            <h3 className="text-[16px] font-bold tracking-[-0.02em] text-[#111827] sm:text-[17px]">
              {step.title}
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#6B7280] sm:text-[13px]">
              {step.desc}
            </p>
            <p
              className="mt-3 border-t pt-3 text-[11.5px] font-semibold leading-snug sm:text-[12px]"
              style={{ borderColor: `${step.color}22`, color: step.color }}
            >
              {step.detail}
            </p>
          </div>
        </div>
      </JourneyStack>
    </RevealItem>
  );
}

export function HowJimvioWorks() {
  return (
    <SectionReveal
      id="jimvio-how-it-works"
      className="jimvio-how-works relative overflow-x-clip py-12 sm:py-14 lg:py-16"
      aria-labelledby="jimvio-how-title"
      threshold={0.08}
    >
      <style>{`${JOURNEY_STACK_CSS}${HOW_CSS}`}</style>

      <div className={shell}>
        <div className="mb-8 text-center sm:mb-10">
          <RevealItem
            index={0}
            as="h2"
            id="jimvio-how-title"
            className="text-[clamp(1.65rem,3.6vw,2.35rem)] font-black tracking-[-0.035em] text-[#111827]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            How Jimvio <span className="text-[#FF5A1F]">works</span>
          </RevealItem>
          <RevealItem
            index={1}
            as="p"
            className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#6B7280] sm:text-[15px]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Roughly how it goes — explore, promote, and double down on what converts.
          </RevealItem>
        </div>

        <div className="relative">
          {/* Desktop connector rail sits behind the three cards */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[16%] right-[16%] top-[42%] hidden h-px md:block"
            style={{
              background: `linear-gradient(90deg, ${ORANGE}, ${GREEN}, ${BLUE})`,
              opacity: 0.55,
            }}
          />
          <MobileStoryStack desktopClassName="md:grid md:grid-cols-3 md:gap-6 lg:gap-7">
            {STEPS.map((step, index) => (
              <HowStepCard key={step.step} step={step} index={index} />
            ))}
          </MobileStoryStack>
        </div>
      </div>
    </SectionReveal>
  );
}

const HOW_CSS = `
.jimvio-how-works .jimvio-journey-stack:hover .jimvio-stack-face {
  border-color: color-mix(in srgb, var(--stack-accent) 22%, rgba(255,255,255,0.9));
}
@media (min-width: 768px) {
  .jimvio-how-works .jimvio-story-stack {
    display: grid;
  }
}
`;

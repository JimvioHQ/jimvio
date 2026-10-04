"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";
import { JourneyStack, JOURNEY_STACK_CSS } from "./journey-stack";
import { MobileStoryStack } from "./mobile-story-stack";
import {
  BuyProductsVisual,
  SellProductsVisual,
  EarnCommissionsVisual,
  CreateCampaignsVisual,
  JoinCampaignsVisual,
  BuildCommunitiesVisual,
} from "./journey-visuals";

const ORANGE = "#FF5A1F";
const GREEN = "#16a34a";
const VIOLET = "#7c3aed";
const BLUE = "#2563eb";
const AMBER = "#d97706";

const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

type ActionGroup = "commerce" | "earn" | "creator" | "community";

type ActionItem = {
  title: string;
  desc: string;
  cta: string;
  href: string;
  accent: string;
  group: ActionGroup;
  visual: ReactNode;
};

const ACTIONS: ActionItem[] = [
  {
    title: "Buy Products",
    desc: "Browse what's selling, discover great products, and shop the Jimvio marketplace.",
    cta: "Explore Marketplace",
    href: "/marketplace",
    accent: ORANGE,
    group: "commerce",
    visual: <BuyProductsVisual accent={ORANGE} />,
  },
  {
    title: "Sell Products",
    desc: "Launch your products, manage inventory, and grow your store with Jimvio.",
    cta: "Open Seller Hub",
    href: "/seller/products",
    accent: ORANGE,
    group: "commerce",
    visual: <SellProductsVisual accent={ORANGE} />,
  },
  {
    title: "Earn Commissions",
    desc: "Share products you love and earn commissions whenever your audience converts.",
    cta: "Start Earning",
    href: "/affiliates",
    accent: GREEN,
    group: "earn",
    visual: <EarnCommissionsVisual accent={GREEN} />,
  },
  {
    title: "Create Campaigns",
    desc: "Launch creator campaigns, define your brief, and recruit creators for your brand.",
    cta: "Create Campaign",
    href: "/ugc/campaign-center/campaigns/new",
    accent: VIOLET,
    group: "creator",
    visual: <CreateCampaignsVisual accent={VIOLET} />,
  },
  {
    title: "Join Campaigns",
    desc: "Discover brand opportunities, create authentic content, and earn from your work.",
    cta: "Discover Campaigns",
    href: "/ugc",
    accent: BLUE,
    group: "creator",
    visual: <JoinCampaignsVisual accent={BLUE} />,
  },
  {
    title: "Build Communities",
    desc: "Create a community around your niche, grow your audience, and build lasting relationships.",
    cta: "Build Community",
    href: "/communities",
    accent: AMBER,
    group: "community",
    visual: <BuildCommunitiesVisual accent={AMBER} />,
  },
];

function ActionHubCard({ action, index }: { action: ActionItem; index: number }) {
  return (
    <RevealItem index={index + 2} as="div" className="h-full">
      <Link
        href={action.href}
        className={cn(
          "jimvio-action-hub-card block h-full rounded-[22px]",
          "focus-visible:outline-none",
          "active:scale-[0.995] motion-reduce:active:scale-100",
        )}
        style={{ ["--hub-accent" as string]: action.accent } as CSSProperties}
        aria-label={`${action.title}. ${action.cta}`}
      >
        <JourneyStack accent={action.accent} className="h-full" density="compact">
          <div className="relative flex h-full min-h-[208px] flex-col sm:min-h-[216px]">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(165deg, color-mix(in srgb, ${action.accent} 7%, #ffffff) 0%, #ffffff 48%)`,
              }}
            />

            <div className="relative flex h-[86px] items-center justify-center overflow-visible px-3 pt-3 sm:h-[94px] sm:pt-3.5">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-10 top-5 h-14 rounded-full opacity-50 blur-2xl"
                style={{
                  background: `radial-gradient(ellipse at center, color-mix(in srgb, ${action.accent} 22%, transparent), transparent 72%)`,
                }}
              />
              <div
                className={cn(
                  "jimvio-card-visual relative z-[1] h-[78px] w-[88px] sm:h-[84px] sm:w-[94px]",
                  "drop-shadow-[0_10px_18px_rgba(17,24,39,0.1)]",
                  "transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "group-hover/stack:-translate-y-1",
                  "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0",
                )}
              >
                {action.visual}
              </div>
            </div>

            <div
              className={cn(
                "jimvio-card-panel relative z-[2] mx-2.5 mb-2.5 mt-auto rounded-[14px] border border-[rgba(17,24,39,0.05)]",
                "bg-white px-3.5 py-3 shadow-[0_6px_16px_rgba(17,24,39,0.045)]",
                "sm:mx-3 sm:mb-3 sm:px-3.5 sm:py-3.5",
                "transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "group-hover/stack:-translate-y-0.5",
                "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0",
              )}
            >
              <h3 className="text-[15px] font-bold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[16px]">
                {action.title}
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6B7280] sm:text-[12.5px]">
                {action.desc}
              </p>
              <span
                className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 text-[12.5px] font-bold tracking-[-0.01em] sm:text-[13px]"
                style={{ color: action.accent }}
              >
                {action.cta}
                <ArrowRight
                  className="size-3.5 transition-transform duration-250 ease-out group-hover/stack:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover/stack:translate-x-0"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </span>
            </div>
          </div>
        </JourneyStack>
      </Link>
    </RevealItem>
  );
}

export function WhatToDoToday() {
  return (
    <SectionReveal
      className="jimvio-action-hub relative overflow-x-clip pt-10 pb-10 sm:pt-12 sm:pb-12 lg:pt-14 lg:pb-14"
      aria-labelledby="jimvio-action-hub-title"
      threshold={0.08}
    >
      <style>{`${JOURNEY_STACK_CSS}${ACTION_HUB_CSS}`}</style>

      <div className={shell}>
        <header className="mx-auto mb-6 max-w-2xl text-center sm:mb-7 lg:mb-8">
          <RevealItem
            index={0}
            as="h2"
            id="jimvio-action-hub-title"
            className="text-[clamp(1.65rem,3.6vw,2.35rem)] font-black leading-[1.12] tracking-[-0.035em] text-[#111827]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            What do you want to{" "}
            <span className="text-[#FF5A1F]">build today?</span>
          </RevealItem>
          <RevealItem
            index={1}
            as="p"
            className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-[#6B7280] sm:mt-3.5 sm:text-[15px]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Create, earn, sell and grow — all in one place.
          </RevealItem>
        </header>

        <MobileStoryStack desktopClassName="md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {ACTIONS.map((action, index) => (
            <ActionHubCard key={action.href + action.title} action={action} index={index} />
          ))}
        </MobileStoryStack>
      </div>
    </SectionReveal>
  );
}

const ACTION_HUB_CSS = `
.jimvio-action-hub-card:hover .jimvio-stack-face {
  border-color: color-mix(in srgb, var(--hub-accent) 22%, rgba(255,255,255,0.92));
}
@media (min-width: 768px) {
  .jimvio-action-hub .jimvio-story-stack {
    display: grid;
  }
}
`;

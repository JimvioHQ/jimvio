"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";
import { JourneyStack, JOURNEY_STACK_CSS } from "./journey-stack";
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
    href: "/",
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
    <RevealItem index={index + 3} as="div" className="h-full">
      <Link
        href={action.href}
        className={cn(
          "jimvio-action-hub-card block h-full rounded-[28px]",
          "focus-visible:outline-none",
          "active:scale-[0.995] motion-reduce:active:scale-100",
        )}
        style={{ ["--hub-accent" as string]: action.accent } as CSSProperties}
        aria-label={`${action.title}. ${action.cta}`}
      >
        <JourneyStack accent={action.accent} className="h-full" density="hero">
          <div className="relative flex h-full min-h-[308px] flex-col sm:min-h-[332px]">
            {/* Soft stage wash */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(165deg, color-mix(in srgb, ${action.accent} 8%, #ffffff) 0%, #ffffff 42%, #ffffff 100%)`,
              }}
            />

            {/* Brand accent chip */}
            <span
              aria-hidden
              className={cn(
                "absolute right-4 top-4 z-[3] grid size-8 place-items-center rounded-[10px] sm:right-5 sm:top-5 sm:size-9",
                "shadow-[0_8px_20px_rgba(17,24,39,0.12)]",
                "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "group-hover/stack:-translate-y-1 group-hover/stack:rotate-6",
                "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:rotate-0",
              )}
              style={{ background: action.accent }}
            >
              <Sparkles className="size-3.5 text-white sm:size-4" strokeWidth={2.4} />
            </span>

            {/* Visual stage */}
            <div className="relative flex h-[176px] items-center justify-center overflow-visible px-4 pt-6 sm:h-[196px] sm:pt-7">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-8 h-28 rounded-full opacity-70 blur-2xl"
                style={{
                  background: `radial-gradient(ellipse at center, color-mix(in srgb, ${action.accent} 30%, transparent), transparent 72%)`,
                }}
              />
              <div
                className={cn(
                  "relative z-[1] h-[148px] w-[164px] sm:h-[164px] sm:w-[176px]",
                  "drop-shadow-[0_20px_32px_rgba(17,24,39,0.14)]",
                  "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "group-hover/stack:-translate-y-3 group-hover/stack:scale-[1.06]",
                  "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:scale-100",
                )}
              >
                {action.visual}
              </div>
            </div>

            {/* Floating info panel */}
            <div
              className={cn(
                "relative z-[2] mx-3 mb-3 mt-auto rounded-[20px] border border-[rgba(17,24,39,0.05)]",
                "bg-white/95 px-4 py-4 shadow-[0_10px_28px_rgba(17,24,39,0.06)] backdrop-blur-md",
                "sm:mx-4 sm:mb-4 sm:px-5 sm:py-[18px]",
                "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "group-hover/stack:-translate-y-1",
                "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0",
              )}
            >
              <h3 className="text-[16px] font-bold leading-tight tracking-[-0.025em] text-[#111827] sm:text-[17px]">
                {action.title}
              </h3>
              <p className="mt-1.5 max-w-[36ch] text-[12.5px] leading-relaxed text-[#6B7280] sm:text-[13px] sm:leading-[1.55]">
                {action.desc}
              </p>
              <span
                className="mt-3.5 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold tracking-[-0.01em] sm:text-[13.5px]"
                style={{ color: action.accent }}
              >
                {action.cta}
                <ArrowRight
                  className="size-3.5 transition-transform duration-300 ease-out group-hover/stack:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover/stack:translate-x-0"
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
      className="jimvio-action-hub relative overflow-x-clip bg-[#F8FAFC] pt-16 pb-14 sm:pt-[4.5rem] sm:pb-16 lg:pt-20 lg:pb-[4.5rem]"
      aria-labelledby="jimvio-action-hub-title"
      threshold={0.1}
    >
      <style>{`${JOURNEY_STACK_CSS}${ACTION_HUB_CSS}`}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF5A1F]/25 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[8%] top-[4%] h-[320px] w-[320px] rounded-full opacity-70 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(255,90,31,0.11) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[6%] top-[14%] h-[280px] w-[280px] rounded-full opacity-55 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[8%] left-[40%] h-[200px] w-[240px] rounded-full opacity-40 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)",
        }}
      />

      <div className={shell}>
        <header className="mx-auto mb-12 max-w-3xl text-center sm:mb-14 lg:mb-16">
          <RevealItem
            index={0}
            as="p"
            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#FF5A1F]/15 bg-[#FFF7F3] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF5A1F] sm:mb-6 sm:text-[11.5px] sm:tracking-[0.2em]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full bg-[#FF5A1F] shadow-[0_0_0_3px_rgba(255,90,31,0.18)]"
            />
            Your Jimvio Journey
          </RevealItem>
          <RevealItem
            index={1}
            as="h2"
            id="jimvio-action-hub-title"
            className="text-[clamp(1.85rem,4.4vw,3rem)] font-black leading-[1.1] tracking-[-0.04em] text-[#111827]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            What do you want to{" "}
            <span className="text-[#FF5A1F]">build today?</span>
          </RevealItem>
          <RevealItem
            index={2}
            as="p"
            className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#6B7280] sm:mt-5 sm:text-[16px] sm:leading-[1.55]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Create, earn, sell and grow — all in one place.
          </RevealItem>
        </header>

        <div className="grid grid-cols-1 gap-6 overflow-visible sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8">
          {ACTIONS.map((action, index) => (
            <ActionHubCard key={action.href + action.title} action={action} index={index} />
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}

const ACTION_HUB_CSS = `
.jimvio-action-hub-card:hover .jimvio-stack-face {
  border-color: color-mix(in srgb, var(--hub-accent) 24%, rgba(255,255,255,0.9));
}
`;

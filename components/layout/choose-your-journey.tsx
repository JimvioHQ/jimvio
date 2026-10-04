"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";
import { JourneyStack, JOURNEY_STACK_CSS } from "./journey-stack";
import { MobileStoryStack } from "./mobile-story-stack";
import {
  BuyerBagVisual,
  SellerStoreVisual,
  AffiliateCoinsVisual,
  BrandMegaphoneVisual,
  CreatorMediaVisual,
  CommunityPeopleVisual,
} from "./journey-visuals";

const ORANGE = "#FF5A1F";
const GREEN = "#16a34a";
const BLUE = "#2563eb";
const INDIGO = "#4f46e5";
const PURPLE = "#7c3aed";
const AMBER = "#d97706";
const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

type Journey = {
  role: string;
  color: string;
  metric: string;
  tagline: string;
  items: readonly [string, string, string];
  cta: string;
  href: string;
  visual: ReactNode;
};

const JOURNEYS: readonly Journey[] = [
  {
    role: "Buyer",
    color: ORANGE,
    metric: "Protected checkout",
    tagline: "Browse verified suppliers and track every order in one place.",
    items: ["Verified sellers", "Order tracking", "Buyer protection"],
    cta: "Browse marketplace",
    href: "/marketplace/physical",
    visual: <BuyerBagVisual accent={ORANGE} />,
  },
  {
    role: "Seller",
    color: BLUE,
    metric: "Your own storefront",
    tagline: "List products, manage orders, and get paid without a separate tool stack.",
    items: ["Store dashboard", "Inventory & orders", "Fast payouts"],
    cta: "Open your store",
    href: "/seller/products",
    visual: <SellerStoreVisual accent={BLUE} />,
  },
  {
    role: "Affiliate",
    color: GREEN,
    metric: "Up to 30% commission",
    tagline: "Share referral links and earn when your audience buys.",
    items: ["Custom links", "Real-time stats", "Wallet withdrawals"],
    cta: "Start earning",
    href: "/affiliates",
    visual: <AffiliateCoinsVisual accent={GREEN} />,
  },
  {
    role: "Brand",
    color: INDIGO,
    metric: "UGC at scale",
    tagline: "Launch campaigns, brief creators, and track performance from one hub.",
    items: ["Campaign builder", "Creator matching", "ROI tracking"],
    cta: "Launch a campaign",
    href: "/ugc/campaign-center/campaigns/new",
    visual: <BrandMegaphoneVisual accent={INDIGO} />,
  },
  {
    role: "Creator",
    color: PURPLE,
    metric: "Paid per campaign",
    tagline: "Join brand briefs, publish content, and get paid for results.",
    items: ["Campaign marketplace", "Per-view payouts", "Creator dashboard"],
    cta: "Find campaigns",
    href: "/ugc",
    visual: <CreatorMediaVisual accent={PURPLE} />,
  },
  {
    role: "Community Owner",
    color: AMBER,
    metric: "Recurring revenue",
    tagline: "Run memberships, live sessions, and paid spaces for your audience.",
    items: ["Public or private", "Subscriptions", "Live & courses"],
    cta: "Build community",
    href: "/communities",
    visual: <CommunityPeopleVisual accent={AMBER} />,
  },
];

function JourneyCard({ journey, index }: { journey: Journey; index: number }) {
  return (
    <RevealItem index={index + 2} as="div" className="h-full">
      <Link
        href={journey.href}
        className={cn(
          "jimvio-journey-card block h-full rounded-[22px]",
          "focus-visible:outline-none",
          "active:scale-[0.995] motion-reduce:active:scale-100",
        )}
        style={{ ["--journey-accent" as string]: journey.color } as CSSProperties}
        aria-label={`${journey.role}. ${journey.cta}`}
      >
        <JourneyStack accent={journey.color} className="h-full" density="compact">
          <div className="relative flex h-full min-h-[220px] flex-col overflow-hidden sm:min-h-[200px] sm:flex-row sm:items-stretch">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${journey.color} 7%, #ffffff) 0%, #ffffff 50%)`,
              }}
            />

            <div
              className={cn(
                "jimvio-card-visual relative z-[2] flex shrink-0 items-center justify-center",
                "mx-auto mt-3 h-[84px] w-[94px]",
                "sm:mx-0 sm:mt-0 sm:h-auto sm:w-[34%] sm:max-w-[118px] sm:self-stretch",
                "transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "group-hover/stack:-translate-y-1",
                "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:translate-x-0",
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-5 rounded-full opacity-55 blur-2xl sm:inset-6"
                style={{
                  background: `radial-gradient(circle, color-mix(in srgb, ${journey.color} 24%, transparent), transparent 70%)`,
                }}
              />
              <div className="relative z-[1] h-full w-full drop-shadow-[0_12px_22px_rgba(17,24,39,0.11)]">
                {journey.visual}
              </div>
            </div>

            <div
              className={cn(
                "jimvio-card-panel relative z-[3] mx-2.5 mb-2.5 mt-1 flex flex-1 flex-col rounded-[14px] border border-[rgba(17,24,39,0.05)]",
                "bg-white p-3 shadow-[0_6px_16px_rgba(17,24,39,0.045)]",
                "sm:mx-0 sm:mb-2.5 sm:mr-2.5 sm:mt-2.5 sm:p-3.5",
                "transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "group-hover/stack:-translate-y-0.5",
                "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-1.5">
                <h3 className="text-[15px] font-bold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[16px]">
                  {journey.role}
                </h3>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide sm:text-[9.5px]"
                  style={{ background: `${journey.color}12`, color: journey.color }}
                >
                  {journey.metric}
                </span>
              </div>

              <p className="mt-1.5 text-[12px] leading-relaxed text-[#6B7280] sm:text-[12.5px]">
                {journey.tagline}
              </p>

              <ul className="mt-2.5 space-y-1">
                {journey.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-1.5 text-[11.5px] text-[#4B5563] sm:text-[12px]"
                  >
                    <Check
                      className="size-3 shrink-0"
                      style={{ color: journey.color }}
                      strokeWidth={2.6}
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <span
                className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-2.5 text-[12.5px] font-bold sm:text-[13px]"
                style={{ color: journey.color }}
              >
                {journey.cta}
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

export function ChooseYourJourney() {
  return (
    <SectionReveal
      className="jimvio-journey-hub relative overflow-x-clip py-10 sm:py-12 lg:py-14"
      aria-labelledby="jimvio-journey-title"
      threshold={0.08}
    >
      <style>{`${JOURNEY_STACK_CSS}${JOURNEY_CSS}`}</style>

      <div className={shell}>
        <div className="mb-6 text-center sm:mb-7">
          <RevealItem
            index={0}
            as="h2"
            id="jimvio-journey-title"
            className="text-[clamp(1.6rem,3.4vw,2.25rem)] font-black tracking-[-0.035em] text-[#111827]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Choose Your <span className="text-[#FF5A1F]">Journey</span>
          </RevealItem>
          <RevealItem
            index={1}
            as="p"
            className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#6B7280] sm:text-[15px]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            One account — sell, earn, create, or buy depending on what you need right now.
          </RevealItem>
        </div>

        <MobileStoryStack desktopClassName="md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {JOURNEYS.map((journey, index) => (
            <JourneyCard key={journey.role} journey={journey} index={index} />
          ))}
        </MobileStoryStack>
      </div>
    </SectionReveal>
  );
}

const JOURNEY_CSS = `
.jimvio-journey-card:hover .jimvio-stack-face {
  border-color: color-mix(in srgb, var(--journey-accent) 22%, rgba(255,255,255,0.92));
}
@media (min-width: 768px) {
  .jimvio-journey-hub .jimvio-story-stack {
    display: grid;
  }
}
`;

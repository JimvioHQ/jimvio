"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";
import { JourneyStack, JOURNEY_STACK_CSS } from "./journey-stack";
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
    href: "/",
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
    <RevealItem index={index + 3} as="div" className="h-full">
      <Link
        href={journey.href}
        className={cn(
          "jimvio-journey-card block h-full rounded-[28px]",
          "focus-visible:outline-none",
          "active:scale-[0.995] motion-reduce:active:scale-100",
        )}
        style={{ ["--journey-accent" as string]: journey.color } as CSSProperties}
        aria-label={`${journey.role}. ${journey.cta}`}
      >
        <JourneyStack accent={journey.color} className="h-full" density="compact">
          <div className="relative flex h-full min-h-[300px] flex-col overflow-hidden sm:min-h-[268px] sm:flex-row sm:items-stretch">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${journey.color} 8%, #ffffff) 0%, #ffffff 48%)`,
              }}
            />

            {/* Visual column */}
            <div
              className={cn(
                "relative z-[2] flex shrink-0 items-center justify-center",
                "mx-auto mt-5 h-[124px] w-[136px]",
                "sm:mx-0 sm:mt-0 sm:h-auto sm:w-[42%] sm:max-w-[168px] sm:self-stretch",
                "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "group-hover/stack:-translate-y-1.5 sm:group-hover/stack:translate-x-0.5 sm:group-hover/stack:rotate-[-2deg]",
                "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:translate-x-0 motion-reduce:group-hover/stack:rotate-0",
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-4 rounded-full opacity-65 blur-2xl sm:inset-6"
                style={{
                  background: `radial-gradient(circle, color-mix(in srgb, ${journey.color} 28%, transparent), transparent 70%)`,
                }}
              />
              <div className="relative z-[1] h-full w-full drop-shadow-[0_16px_28px_rgba(17,24,39,0.12)]">
                {journey.visual}
              </div>
            </div>

            {/* Floating info card */}
            <div
              className={cn(
                "relative z-[3] mx-3 mb-3 mt-2 flex flex-1 flex-col rounded-[20px] border border-[rgba(17,24,39,0.05)]",
                "bg-white/95 p-4 shadow-[0_10px_28px_rgba(17,24,39,0.06)] backdrop-blur-md",
                "sm:mx-0 sm:mb-3 sm:mr-3 sm:mt-3 sm:p-[18px]",
                "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "group-hover/stack:-translate-y-1",
                "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-[16px] font-bold leading-tight tracking-[-0.025em] text-[#111827] sm:text-[17px]">
                  {journey.role}
                </h3>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-wide sm:text-[10px]"
                  style={{ background: `${journey.color}12`, color: journey.color }}
                >
                  {journey.metric}
                </span>
              </div>

              <p className="mt-2 text-[12.5px] leading-relaxed text-[#6B7280] sm:text-[13px]">
                {journey.tagline}
              </p>

              <ul className="mt-3 space-y-1.5">
                {journey.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-[12px] text-[#4B5563] sm:text-[12.5px]"
                  >
                    <Check
                      className="size-3.5 shrink-0"
                      style={{ color: journey.color }}
                      strokeWidth={2.6}
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <span
                className="mt-auto pt-3.5 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold sm:text-[13.5px]"
                style={{ color: journey.color }}
              >
                {journey.cta}
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

export function ChooseYourJourney() {
  return (
    <SectionReveal
      className="jimvio-journey-hub relative overflow-x-clip bg-white py-14 sm:py-16 lg:py-20"
      aria-labelledby="jimvio-journey-title"
      threshold={0.1}
    >
      <style>{`${JOURNEY_STACK_CSS}${JOURNEY_CSS}`}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute left-[6%] top-[10%] h-[280px] w-[280px] rounded-full opacity-55 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(255,90,31,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-[18%] h-[240px] w-[240px] rounded-full opacity-45 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[12%] left-[35%] h-[220px] w-[220px] rounded-full opacity-35 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(22,163,74,0.05) 0%, transparent 70%)",
        }}
      />

      <div className={shell}>
        <div className="mb-12 text-center sm:mb-14">
          <RevealItem
            index={0}
            as="p"
            className="mb-4 inline-flex items-center rounded-full border border-[#FF5A1F]/12 bg-[#FFF7F3] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF5A1F] sm:mb-5"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Your Jimvio Journey
          </RevealItem>
          <RevealItem
            index={1}
            as="h2"
            id="jimvio-journey-title"
            className="text-[clamp(1.75rem,3.8vw,2.5rem)] font-black tracking-[-0.035em] text-[#111827]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Choose Your <span className="text-[#FF5A1F]">Journey</span>
          </RevealItem>
          <RevealItem
            index={2}
            as="p"
            className="mx-auto mt-3.5 max-w-xl text-[14px] leading-relaxed text-[#6B7280] sm:mt-4 sm:text-[15px]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            One account — sell, earn, create, or buy depending on what you need right now.
          </RevealItem>
        </div>

        <div className="grid grid-cols-1 gap-6 overflow-visible sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8">
          {JOURNEYS.map((journey, index) => (
            <JourneyCard key={journey.role} journey={journey} index={index} />
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}

const JOURNEY_CSS = `
.jimvio-journey-card:hover .jimvio-stack-face {
  border-color: color-mix(in srgb, var(--journey-accent) 24%, rgba(255,255,255,0.9));
}
`;

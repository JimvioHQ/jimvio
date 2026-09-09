"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Check,
  Clapperboard,
  DollarSign,
  ShoppingBag,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";

const ORANGE = "#FF5A1F";
const GREEN = "#16a34a";
const BLUE = "#2563eb";
const INDIGO = "#4f46e5";
const PURPLE = "#7c3aed";
const AMBER = "#d97706";
const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

type Journey = {
  role: string;
  icon: LucideIcon;
  color: string;
  metric: string;
  tagline: string;
  items: readonly [string, string, string];
  cta: string;
  href: string;
};

const JOURNEYS: readonly Journey[] = [
  {
    role: "Buyer",
    icon: ShoppingBag,
    color: ORANGE,
    metric: "Protected checkout",
    tagline: "Browse verified suppliers and track every order in one place.",
    items: ["Verified sellers", "Order tracking", "Buyer protection"],
    cta: "Browse marketplace",
    href: "/marketplace",
  },
  {
    role: "Seller",
    icon: Store,
    color: BLUE,
    metric: "Your own storefront",
    tagline: "List products, manage orders, and get paid without a separate tool stack.",
    items: ["Store dashboard", "Inventory & orders", "Fast payouts"],
    cta: "Open your store",
    href: "/",
  },
  {
    role: "Affiliate",
    icon: DollarSign,
    color: GREEN,
    metric: "Up to 30% commission",
    tagline: "Share referral links and earn when your audience buys.",
    items: ["Custom links", "Real-time stats", "Wallet withdrawals"],
    cta: "Start earning",
    href: "/affiliates",
  },
  {
    role: "Brand",
    icon: Award,
    color: INDIGO,
    metric: "UGC at scale",
    tagline: "Launch campaigns, brief creators, and track performance from one hub.",
    items: ["Campaign builder", "Creator matching", "ROI tracking"],
    cta: "Launch a campaign",
    href: "/ugc/campaign-center/campaigns/new",
  },
  {
    role: "Creator",
    icon: Clapperboard,
    color: PURPLE,
    metric: "Paid per campaign",
    tagline: "Join brand briefs, publish content, and get paid for results.",
    items: ["Campaign marketplace", "Per-view payouts", "Creator dashboard"],
    cta: "Find campaigns",
    href: "/ugc",
  },
  {
    role: "Community Owner",
    icon: Users,
    color: AMBER,
    metric: "Recurring revenue",
    tagline: "Run memberships, live sessions, and paid spaces for your audience.",
    items: ["Public or private", "Subscriptions", "Live & courses"],
    cta: "Build community",
    href: "/communities",
  },
];

function JourneyCard({ journey, index }: { journey: Journey; index: number }) {
  const Icon = journey.icon;

  return (
    <RevealItem index={index + 2} as="div" className="h-full">
      <Link
        href={journey.href}
        className={cn(
          "jimvio-journey-card group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-[24px] p-5 sm:min-h-[292px] sm:p-6",
          "border border-[var(--color-border)] bg-white",
          "shadow-[0_2px_10px_rgba(17,24,39,0.04),0_1px_2px_rgba(17,24,39,0.03)]",
          "transition-[transform,border-color] duration-200 ease-out",
          "hover:-translate-y-[2px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
          "active:translate-y-0 active:scale-[0.995]",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        )}
        style={
          {
            ["--journey-accent" as string]: journey.color,
            background: `linear-gradient(165deg, color-mix(in srgb, ${journey.color} 5.5%, #ffffff) 0%, #ffffff 42%)`,
          } as CSSProperties
        }
      >
        <span
          aria-hidden
          className="absolute bottom-0 left-0 top-0 w-[2px] rounded-r-full opacity-45 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
          style={{ background: journey.color }}
        />
        <Icon
          className="pointer-events-none absolute -bottom-5 -right-4 size-[100px] opacity-[0.05] sm:size-[112px]"
          style={{ color: journey.color }}
          strokeWidth={1.15}
          aria-hidden
        />

        <div className="relative flex items-start gap-3 pl-1">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-2xl transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            style={{
              background: `${journey.color}12`,
              color: journey.color,
            }}
          >
            <Icon
              className="size-5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0 sm:size-[22px]"
              strokeWidth={1.85}
            />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-[#111827] dark:text-[var(--color-text-primary)] sm:text-[18px]">
              {journey.role}
            </h3>
            <p
              className="mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide sm:text-[11px]"
              style={{ background: `${journey.color}12`, color: journey.color }}
            >
              {journey.metric}
            </p>
          </div>
        </div>

        <p className="relative mt-3.5 pl-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)] sm:text-[14px]">
          {journey.tagline}
        </p>

        <ul className="relative mt-4 space-y-2 pl-1">
          {journey.items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)] sm:text-[13px]"
            >
              <Check className="size-3.5 shrink-0" style={{ color: journey.color }} strokeWidth={2.6} />
              {item}
            </li>
          ))}
        </ul>

        <span
          className="relative mt-auto inline-flex min-h-11 items-center gap-1.5 pt-5 text-[13px] font-bold sm:text-[14px]"
          style={{ color: journey.color }}
        >
          {journey.cta}
          <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </span>
      </Link>
    </RevealItem>
  );
}

export function ChooseYourJourney() {
  return (
    <SectionReveal
      className="jimvio-journey-hub relative bg-white py-12 sm:py-16 lg:py-[4.5rem]"
      aria-labelledby="jimvio-journey-title"
      threshold={0.1}
    >
      <style>{JOURNEY_CSS}</style>
      <div className={shell}>
        <div className="mb-10 text-center sm:mb-12">
          <RevealItem
            index={0}
            as="h2"
            id="jimvio-journey-title"
            className="text-[clamp(1.625rem,3.6vw,2.125rem)] font-black tracking-[-0.03em] text-[#111827] dark:text-[var(--color-text-primary)]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Choose Your Journey
          </RevealItem>
          <RevealItem
            index={1}
            as="p"
            className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-muted)] sm:text-[15px]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            One account — sell, earn, create, or buy depending on what you need right now.
          </RevealItem>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {JOURNEYS.map((journey, index) => (
            <JourneyCard key={journey.role} journey={journey} index={index} />
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}

const JOURNEY_CSS = `
.jimvio-journey-card:hover {
  border-color: color-mix(in srgb, var(--journey-accent) 28%, var(--color-border));
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-journey-card:hover {
    transform: none;
  }
}
`;

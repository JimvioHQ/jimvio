"use client";

import { useLayoutEffect, useRef } from "react";
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
    href: "/dashboard",
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
    href: "/dashboard/vendor/campaigns/new",
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
    <Link
      href={journey.href}
      className={cn(
        "jimvio-journey-card group relative flex h-full min-h-[268px] flex-col overflow-hidden rounded-[22px] p-5 sm:p-6",
        "border border-[var(--color-border)] bg-[var(--color-surface)]",
        "shadow-[0_2px_10px_rgba(17,24,39,0.04)]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        "hover:-translate-y-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
        "active:translate-y-0 active:scale-[0.995]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
      style={{
        ["--journey-i" as string]: index,
        ["--journey-accent" as string]: journey.color,
        background: `linear-gradient(180deg, color-mix(in srgb, ${journey.color} 6%, var(--color-surface)) 0%, var(--color-surface) 46%)`,
      }}
    >
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-[2px] rounded-r-full opacity-50 transition-all duration-200 group-hover:w-1 group-hover:opacity-100 motion-reduce:transition-none"
        style={{ background: journey.color }}
      />
      <Icon
        className="pointer-events-none absolute -bottom-6 -right-5 size-[104px] opacity-[0.06] transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:size-[118px]"
        style={{ color: journey.color }}
        strokeWidth={1.15}
        aria-hidden
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
        style={{
          background: `radial-gradient(90% 70% at 0% 0%, color-mix(in srgb, ${journey.color} 10%, transparent), transparent 58%)`,
        }}
      />

      <div className="relative flex items-start gap-3 pl-1">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl transition-transform duration-200 ease-out group-hover:scale-[1.06] group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          style={{
            background: `${journey.color}14`,
            color: journey.color,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5)`,
          }}
        >
          <Icon className="size-5 sm:size-[22px]" strokeWidth={1.85} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-[#111827] dark:text-[var(--color-text-primary)] sm:text-[18px]">
            {journey.role}
          </h3>
          <p
            className="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide sm:text-[11px]"
            style={{ background: `${journey.color}14`, color: journey.color }}
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
        <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </span>
    </Link>
  );
}

export function ChooseYourJourney() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    section.dataset.motion = "ready";
    const play = () => {
      section.dataset.motion = "in";
    };

    if (typeof IntersectionObserver === "undefined") {
      play();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        play();
        observer.disconnect();
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="jimvio-journey-hub border-t border-[var(--color-border)] bg-[var(--color-surface)] py-10 sm:py-14"
      aria-labelledby="jimvio-journey-title"
    >
      <style>{JOURNEY_CSS}</style>
      <div className={shell}>
        <div className="mb-8 text-center sm:mb-10">
          <h2
            id="jimvio-journey-title"
            className="text-[26px] font-black tracking-tight text-[var(--color-text-primary)] sm:text-[30px]"
          >
            Choose Your Journey
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--color-text-muted)]">
            One account — sell, earn, create, or buy depending on what you need right now.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {JOURNEYS.map((journey, index) => (
            <JourneyCard key={journey.role} journey={journey} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

const JOURNEY_CSS = `
@keyframes jimvio-journey-enter {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.jimvio-journey-hub[data-motion="ready"] .jimvio-journey-card {
  opacity: 0;
  transform: translateY(16px);
}
.jimvio-journey-hub[data-motion="in"] .jimvio-journey-card {
  animation: jimvio-journey-enter 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--journey-i, 0) * 55ms);
}
.jimvio-journey-card:hover {
  border-color: color-mix(in srgb, var(--journey-accent) 30%, var(--color-border));
  box-shadow:
    0 14px 34px rgba(17, 24, 39, 0.08),
    0 2px 8px color-mix(in srgb, var(--journey-accent) 10%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-journey-hub[data-motion="ready"] .jimvio-journey-card,
  .jimvio-journey-hub[data-motion="in"] .jimvio-journey-card {
    animation: none !important;
    opacity: 1;
    transform: none;
  }
}
`;

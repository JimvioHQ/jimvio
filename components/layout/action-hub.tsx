"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Coins,
  Handshake,
  Megaphone,
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
const VIOLET = "#7c3aed";
const BLUE = "#2563eb";
const AMBER = "#d97706";

const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

type ActionGroup = "commerce" | "earn" | "creator" | "community";

type ActionItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
  cta: string;
  href: string;
  accent: string;
  group: ActionGroup;
};

const ACTIONS: ActionItem[] = [
  {
    icon: ShoppingBag,
    title: "Buy Products",
    desc: "Browse what's selling, discover great products, and shop the Jimvio marketplace.",
    cta: "Explore Marketplace",
    href: "/marketplace",
    accent: ORANGE,
    group: "commerce",
  },
  {
    icon: Store,
    title: "Sell Products",
    desc: "Launch your products, manage inventory, and grow your store with Jimvio.",
    cta: "Open Seller Hub",
    href: "/",
    accent: ORANGE,
    group: "commerce",
  },
  {
    icon: Coins,
    title: "Earn Commissions",
    desc: "Share products you love and earn commissions whenever your audience converts.",
    cta: "Start Earning",
    href: "/affiliates",
    accent: GREEN,
    group: "earn",
  },
  {
    icon: Megaphone,
    title: "Create Campaigns",
    desc: "Launch creator campaigns, define your brief, and recruit creators for your brand.",
    cta: "Create Campaign",
    href: "/ugc/campaign-center/campaigns/new",
    accent: VIOLET,
    group: "creator",
  },
  {
    icon: Handshake,
    title: "Join Campaigns",
    desc: "Discover brand opportunities, create authentic content, and earn from your work.",
    cta: "Discover Campaigns",
    href: "/ugc",
    accent: BLUE,
    group: "creator",
  },
  {
    icon: Users,
    title: "Build Communities",
    desc: "Create a community around your niche, grow your audience, and build lasting relationships.",
    cta: "Build Community",
    href: "/communities",
    accent: AMBER,
    group: "community",
  },
];

function ActionHubCard({ action, index }: { action: ActionItem; index: number }) {
  const Icon = action.icon;

  return (
    <RevealItem index={index + 3} as="div" className="h-full">
      <Link
        href={action.href}
        className={cn(
          "jimvio-action-hub-card group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-[24px] p-6 sm:min-h-[248px] sm:p-7",
          "border border-[var(--color-border)] bg-[var(--color-surface)]",
          "shadow-[0_2px_10px_rgba(17,24,39,0.04),0_1px_2px_rgba(17,24,39,0.03)]",
          "transition-[transform,border-color] duration-200 ease-out",
          "hover:-translate-y-[2px]",
          "active:translate-y-0 active:scale-[0.995]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        )}
        style={
          {
            ["--hub-accent" as string]: action.accent,
            background: `linear-gradient(180deg, color-mix(in srgb, ${action.accent} 5%, #ffffff) 0%, #ffffff 48%)`,
          } as CSSProperties
        }
      >
        <span
          aria-hidden
          className="absolute bottom-0 left-0 top-0 w-[2px] rounded-r-full opacity-40 transition-opacity duration-200 group-hover:opacity-90 motion-reduce:transition-none"
          style={{ background: action.accent }}
        />

        <span className="relative mb-5 inline-flex size-12 items-center justify-center sm:mb-6 sm:size-[52px]">
          <span
            className={cn(
              "relative grid size-full place-items-center rounded-2xl",
              "transition-transform duration-200 ease-out",
              "group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            )}
            style={{
              background: `${action.accent}12`,
              color: action.accent,
            }}
          >
            <Icon
              className="relative size-5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 sm:size-[22px]"
              strokeWidth={1.75}
              aria-hidden
            />
          </span>
        </span>

        <h3 className="relative text-[17px] font-bold leading-tight tracking-[-0.02em] text-[#111827] dark:text-[var(--color-text-primary)] sm:text-[18px]">
          {action.title}
        </h3>
        <p className="relative mt-2 max-w-[34ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)] sm:text-[14px]">
          {action.desc}
        </p>
        <span
          className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-5 text-[13px] font-bold tracking-[-0.01em] sm:text-[14px]"
          style={{ color: action.accent }}
        >
          {action.cta}
          <ArrowRight
            className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 sm:size-4"
            strokeWidth={2}
            aria-hidden
          />
        </span>
      </Link>
    </RevealItem>
  );
}

export function WhatToDoToday() {
  return (
    <SectionReveal
      className="jimvio-action-hub relative overflow-hidden bg-[#F8FAFC] pt-14 pb-12 sm:pt-16 sm:pb-14 lg:pt-[4.5rem] lg:pb-16"
      aria-labelledby="jimvio-action-hub-title"
      threshold={0.1}
    >
      <style>{ACTION_HUB_CSS}</style>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF5A1F]/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[220px] w-[min(560px,88vw)] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,90,31,0.05) 0%, transparent 70%)",
        }}
      />

      <div className={shell}>
        <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <RevealItem
            index={0}
            as="p"
            className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF5A1F] sm:mb-5 sm:text-[12px] sm:tracking-[0.24em]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Your Jimvio Journey
          </RevealItem>
          <RevealItem
            index={1}
            as="h2"
            id="jimvio-action-hub-title"
            className="text-[clamp(1.75rem,4.2vw,2.75rem)] font-black leading-[1.12] tracking-[-0.035em] text-[#111827] dark:text-[var(--color-text-primary)]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            What do you want to build today?
          </RevealItem>
          <RevealItem
            index={2}
            as="p"
            className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-muted)] sm:mt-5 sm:text-[16px] sm:leading-[1.55]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Choose your path and start creating, earning, selling, or growing with Jimvio.
          </RevealItem>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {ACTIONS.map((action, index) => (
            <ActionHubCard key={action.href} action={action} index={index} />
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}

const ACTION_HUB_CSS = `
.jimvio-action-hub-card:hover {
  border-color: color-mix(in srgb, var(--hub-accent) 26%, var(--color-border));
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-action-hub-card:hover {
    transform: none;
  }
}
`;

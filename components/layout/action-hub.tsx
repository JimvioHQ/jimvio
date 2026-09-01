"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";
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

const GROUP_WEIGHT: Record<ActionGroup, string> = {
  commerce: "1",
  earn: "1.15",
  creator: "1",
  community: "0.95",
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isCoarsePointer() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

function ActionHubCta({ label, accent }: { label: string; accent: string }) {
  const magnetRef = useRef<HTMLSpanElement>(null);

  const resetMagnet = useCallback(() => {
    const el = magnetRef.current;
    if (el) el.style.transform = "";
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLSpanElement>) => {
    if (prefersReducedMotion() || isCoarsePointer()) return;
    const el = magnetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = Math.max(-5, Math.min(5, (event.clientX - rect.left - rect.width / 2) * 0.22));
    const dy = Math.max(-3, Math.min(3, (event.clientY - rect.top - rect.height / 2) * 0.22));
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }, []);

  return (
    <span
      className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-5 text-[13px] font-bold tracking-[-0.01em] sm:text-[14px]"
      style={{ color: accent }}
      onPointerMove={onPointerMove}
      onPointerLeave={resetMagnet}
      onPointerCancel={resetMagnet}
    >
      {label}
      <span
        ref={magnetRef}
        className="inline-flex will-change-transform"
        style={{ transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <ArrowRight
          className="size-3.5 transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[4px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 sm:size-4"
          strokeWidth={2}
          aria-hidden
        />
      </span>
    </span>
  );
}

function ActionHubCard({ action, index }: { action: ActionItem; index: number }) {
  const Icon = action.icon;
  const tint = GROUP_WEIGHT[action.group];

  return (
    <Link
      href={action.href}
      className={cn(
        "jimvio-action-hub-card group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-[24px] p-6 sm:min-h-[248px] sm:p-7",
        "border border-[var(--color-border)] bg-[var(--color-surface)]",
        "shadow-[0_2px_10px_rgba(17,24,39,0.04),0_1px_2px_rgba(17,24,39,0.03)]",
        "transition-[transform,box-shadow,border-color] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-[3px]",
        "active:translate-y-0 active:scale-[0.995]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
      )}
      style={
        {
          "--hub-i": index,
          "--hub-accent": action.accent,
          background: `linear-gradient(180deg, color-mix(in srgb, ${action.accent} calc(5% * ${tint}), #ffffff) 0%, #ffffff 48%)`,
        } as CSSProperties
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70 dark:via-white/20"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 size-28 translate-x-8 -translate-y-8 rounded-full opacity-[0.18] blur-2xl transition-opacity duration-[240ms] group-hover:opacity-40 motion-reduce:transition-none"
        style={{ background: action.accent }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[240ms] group-hover:opacity-100 motion-reduce:transition-none"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, ${action.accent} 8%, transparent), transparent 58%)`,
        }}
      />
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-[2px] rounded-r-full opacity-40 transition-opacity duration-[240ms] group-hover:opacity-80 motion-reduce:transition-none"
        style={{ background: action.accent }}
      />

      <span className="relative mb-5 inline-flex size-12 items-center justify-center sm:mb-6 sm:size-[52px]">
        <span
          aria-hidden
          className="absolute inset-[-18%] rounded-full opacity-45 blur-xl transition-opacity duration-[240ms] group-hover:opacity-70 motion-reduce:transition-none"
          style={{ background: `color-mix(in srgb, ${action.accent} 26%, transparent)` }}
        />
        <span
          className={cn(
            "relative grid size-full place-items-center rounded-2xl border border-white/70 dark:border-white/5",
            "transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            "group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
          )}
          style={{
            background: `color-mix(in srgb, ${action.accent} calc(10% * ${tint}), #ffffff)`,
            color: action.accent,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 20px color-mix(in srgb, ${action.accent} 8%, transparent)`,
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-px rounded-[15px] bg-gradient-to-b from-white/55 to-transparent dark:from-white/10"
          />
          <Icon
            className="relative size-5 transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 sm:size-[22px]"
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
      <ActionHubCta label={action.cta} accent={action.accent} />
    </Link>
  );
}

export function WhatToDoToday() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

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
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="jimvio-action-hub relative overflow-hidden bg-[#F8FAFC] pt-14 pb-12 sm:pt-16 sm:pb-14 lg:pt-[4.5rem] lg:pb-16"
      aria-labelledby="jimvio-action-hub-title"
    >
      <style>{ACTION_HUB_CSS}</style>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF5A1F]/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[280px] w-[min(720px,90vw)] -translate-x-1/2 rounded-full bg-[rgba(255,90,31,0.035)] blur-[100px]"
      />

      <div className={shell}>
        <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF5A1F] sm:mb-5 sm:text-[12px] sm:tracking-[0.24em]">
            Your Jimvio Journey
          </p>
          <h2
            id="jimvio-action-hub-title"
            className="text-[clamp(1.75rem,4.2vw,2.75rem)] font-black leading-[1.12] tracking-[-0.035em] text-[#111827] dark:text-[var(--color-text-primary)]"
          >
            What do you want to build today?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-muted)] sm:mt-5 sm:text-[16px] sm:leading-[1.55]">
            Choose your path and start creating, earning, selling, or growing with Jimvio.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {ACTIONS.map((action, index) => (
            <ActionHubCard key={action.href} action={action} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

const ACTION_HUB_CSS = `
@keyframes jimvio-action-hub-enter {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.jimvio-action-hub[data-motion="ready"] .jimvio-action-hub-card {
  opacity: 0;
  transform: translateY(14px);
}
.jimvio-action-hub[data-motion="in"] .jimvio-action-hub-card {
  animation: jimvio-action-hub-enter 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--hub-i, 0) * 55ms);
}
.jimvio-action-hub-card {
  pointer-events: auto;
}
.jimvio-action-hub-card:hover {
  border-color: color-mix(in srgb, var(--hub-accent) 26%, var(--color-border));
  box-shadow:
    0 16px 40px rgba(17, 24, 39, 0.07),
    0 2px 8px color-mix(in srgb, var(--hub-accent) 8%, transparent);
}
.jimvio-action-hub-card:active {
  box-shadow: 0 6px 16px rgba(17, 24, 39, 0.06);
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-action-hub[data-motion="ready"] .jimvio-action-hub-card,
  .jimvio-action-hub[data-motion="in"] .jimvio-action-hub-card {
    animation: none !important;
    opacity: 1;
    transform: none;
  }
}
`;

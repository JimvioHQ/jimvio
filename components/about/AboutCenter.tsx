"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ShieldCheck,
  Globe2,
  Lock,
  Download,
  Sparkles,
} from "lucide-react";
import JimvioLogo from "@/components/ui/logo";
import { AnimatedPlatformStatValue } from "@/components/platform/platform-stats-provider";
import {
  ABOUT_AUDIENCES,
  ABOUT_COLORS,
  ABOUT_COMMITMENTS,
  ABOUT_ECOSYSTEM,
  ABOUT_FEATURES,
  ABOUT_GOVERNANCE_LINKS,
  ABOUT_IMPACT,
  ABOUT_QUICK_LINKS,
  ABOUT_RESOURCE_LINKS,
  ABOUT_TIMELINE,
  ABOUT_VALUES,
  LOGO_MISUSE,
  type AboutSectionId,
} from "@/lib/about/content";
import { PLATFORM_STAT_META } from "@/lib/platform-stats";
import { cn } from "@/lib/utils";
import { AboutHeroArt } from "./AboutHeroArt";
import { AboutMobileNav } from "./AboutMobileNav";
import { AboutSidebar } from "./AboutSidebar";

/** Original supplied rasters. Previews and downloads use these files unchanged. */
const BRAND_FILES = [
  {
    href: "/brand/jimvio/jimvio-brand-kit-mark-white-on-black.png",
    file: "jimvio-brand-kit-mark-white-on-black.png",
    category: "Brand kit",
    label: "Mark, white on black",
    frame: "bg-[#050505]",
  },
  {
    href: "/brand/jimvio/jimvio-brand-kit-mark-orange-on-dark.png",
    file: "jimvio-brand-kit-mark-orange-on-dark.png",
    category: "Brand kit",
    label: "Mark, orange on dark",
    frame: "bg-[#141414]",
  },
  {
    href: "/brand/jimvio/jimvio-logo-mark-white-on-orange.png",
    file: "jimvio-logo-mark-white-on-orange.png",
    category: "Logo mark",
    label: "White mark on orange",
    frame: "bg-[#FF5A1F]",
  },
  {
    href: "/brand/jimvio/jimvio-logo-mark-orange-on-white.png",
    file: "jimvio-logo-mark-orange-on-white.png",
    category: "Logo mark",
    label: "Orange mark on white",
    frame: "bg-white",
  },
  {
    href: "/brand/jimvio/jimvio-wordmark-orange-on-white.png",
    file: "jimvio-wordmark-orange-on-white.png",
    category: "Wordmark",
    label: "Orange lockup on white",
    frame: "bg-white",
  },
  {
    href: "/brand/jimvio/jimvio-wordmark-white-on-orange.png",
    file: "jimvio-wordmark-white-on-orange.png",
    category: "Wordmark",
    label: "White lockup on orange",
    frame: "bg-[#FF5A1F]",
  },
  {
    href: "/brand/jimvio/jimvio-favicon-app-icon-on-white.png",
    file: "jimvio-favicon-app-icon-on-white.png",
    category: "Favicon",
    label: "App icon on white",
    frame: "bg-white",
  },
  {
    href: "/brand/jimvio/jimvio-favicon-app-icon-on-dark.png",
    file: "jimvio-favicon-app-icon-on-dark.png",
    category: "Favicon",
    label: "App icon on dark",
    frame: "bg-[#141414]",
  },
] as const;

const SECTION_IDS: AboutSectionId[] = [
  "introduction",
  "mission",
  "what-is-jimvio",
  "origin",
  "audience",
  "ecosystem",
  "impact",
  "positioning",
  "promise",
  "personality",
  "values",
  "differentiation",
  "logo",
  "colors",
  "typography",
  "visual",
  "voice",
  "platform",
  "social",
  "assets",
  "governance",
  "team",
];

function Section({
  id,
  children,
  className,
}: {
  id: AboutSectionId;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-28", className)}>
      {children}
    </section>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-[var(--color-border)] bg-white p-5 dark:bg-[var(--color-surface)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AboutCenter() {
  const [activeId, setActiveId] = useState<AboutSectionId>("introduction");

  useEffect(() => {
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target?.id as AboutSectionId | undefined;
        if (id) setActiveId(id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[var(--color-bg)]">
      <div className="mx-auto max-w-8xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-4 flex items-center justify-between gap-3 xl:hidden">
          <nav aria-label="Breadcrumb" className="text-xs text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-[#C2410C]">
              Home
            </Link>
            <span className="px-1.5">›</span>
            <span>About Jimvio</span>
          </nav>
          <AboutMobileNav activeId={activeId} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_240px] xl:items-start">
          <div className="sticky top-24 hidden max-h-[calc(100vh-7rem)] xl:block">
            <AboutSidebar activeId={activeId} className="max-h-[calc(100vh-7rem)]" />
          </div>

          <div className="min-w-0 space-y-8">
            <Section id="introduction">
              <nav aria-label="Breadcrumb" className="mb-4 hidden text-xs text-[var(--color-text-muted)] xl:block">
                <Link href="/" className="hover:text-[#C2410C]">
                  Home
                </Link>
                <span className="px-1.5">›</span>
                <span>About Jimvio</span>
                <span className="px-1.5">›</span>
                <span>Introduction</span>
              </nav>

              <div className="overflow-hidden rounded-[20px] border border-[rgba(255,90,31,0.12)] bg-[linear-gradient(135deg,#FFF8F4_0%,#FFF1E8_48%,#FFFFFF_100%)] dark:bg-[linear-gradient(135deg,#1a0f0a_0%,#120c09_100%)]">
                <div className="grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.05fr)_0.95fr] lg:p-10">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF5A1F]">
                      Our story
                    </p>
                    <h1 className="mt-3 text-[clamp(1.85rem,4.4vw,3.15rem)] font-black leading-[1.08] tracking-[-0.04em] text-[#111827] dark:text-[var(--color-text-primary)]">
                      We built Jimvio because creators{" "}
                      <span className="text-[#FF5A1F]">deserved better.</span>
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[15px]">
                      We envision a world where creators, entrepreneurs, sellers, and brands can
                      build sustainable businesses, reach global audiences, and turn their ideas
                      into real opportunities — without unnecessary barriers.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href="/marketplace"
                        className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#FF5A1F] px-5 text-sm font-bold text-white transition hover:bg-[#e04e18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
                      >
                        Explore Jimvio
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <Link
                        href="#mission"
                        className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-white px-5 text-sm font-bold text-[#111827] transition hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-surface)] dark:text-[var(--color-text-primary)]"
                      >
                        Our Mission
                      </Link>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {[
                        { icon: HeartIcon, label: "Creators First" },
                        { icon: Globe2, label: "Global Opportunities" },
                        { icon: ShieldCheck, label: "Transparent & Fair" },
                        { icon: Sparkles, label: "Built for Everyone" },
                      ].map((item) => (
                        <span
                          key={item.label}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,90,31,0.18)] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] dark:bg-[var(--color-surface)]/80"
                        >
                          <item.icon className="h-3.5 w-3.5 text-[#FF5A1F]" aria-hidden="true" />
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <AboutHeroArt className="mx-auto max-w-md lg:max-w-none" />
                </div>
              </div>
            </Section>

            <Section id="mission">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Our Mission, Vision & Commitment
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                The principles that guide everything we do at Jimvio.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Card>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                    <CompassMark />
                  </div>
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                    Our Mission
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    Make earning online transparent, accessible, and rewarding for creators,
                    sellers, brands, and businesses around the world.
                  </p>
                </Card>
                <Card>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                    <EyeMark />
                  </div>
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                    Our Vision
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    Build a borderless creator-commerce ecosystem where anyone with an idea,
                    product, skill, or audience can access the tools and opportunities needed to
                    grow.
                  </p>
                </Card>
                <Card>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                    <Lock className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                    Our Commitment
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {ABOUT_COMMITMENTS.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm leading-relaxed text-[var(--color-text-secondary)]"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A1F]" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </Section>

            <Section id="what-is-jimvio">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                    What is Jimvio?
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    A complete ecosystem for creators, sellers, brands, and communities.
                  </p>
                </div>
                <Link
                  href="/marketplace"
                  className="text-sm font-semibold text-[#C2410C] underline-offset-2 hover:underline"
                >
                  Explore the platform →
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ABOUT_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Link
                      key={feature.title}
                      href={feature.href}
                      className="rounded-[16px] border border-[var(--color-border)] bg-white p-4 transition hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-surface)]"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <p className="mt-3 text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                        {feature.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                        {feature.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </Section>

            <Section id="origin">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Our Story & Origin
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Why Jimvio exists and the problem we set out to solve.
              </p>
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_0.85fr]">
                <Card className="p-6">
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    Most platforms were built for creators in a handful of markets. Everyone else
                    was stuck with currency restrictions, blocked payment methods, and fees that
                    made no sense. Jimvio was built from day one to be borderless — not as a
                    feature, as a founding principle.
                  </p>
                  <ol className="mt-6 grid gap-4 sm:grid-cols-2">
                    {ABOUT_TIMELINE.map((step) => (
                      <li key={step.title} className="relative pl-3">
                        <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-[#FF5A1F]" />
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C2410C]">
                          {step.label}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                          {step.title}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                          {step.body}
                        </p>
                      </li>
                    ))}
                  </ol>
                </Card>
                <Card className="flex flex-col justify-between bg-[linear-gradient(180deg,#1f140f_0%,#111827_100%)] p-6 text-white">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FDBA74]">
                      From a simple idea
                    </p>
                    <h3 className="mt-2 text-xl font-black leading-snug">
                      To a global movement for creator commerce.
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">
                      Jimvio exists to remove the barriers between ideas and opportunities, giving
                      everyone a fair chance to create, earn, and grow.
                    </p>
                  </div>
                  <Link
                    href="#introduction"
                    className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#FF5A1F] text-sm font-bold text-white hover:bg-[#e04e18]"
                  >
                    Back to the story
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Card>
              </div>
            </Section>

            <Section id="audience">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Who we are building for
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Jimvio is for people turning skills, products, and audiences into opportunities —
                without guaranteed income claims.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {ABOUT_AUDIENCES.map((item) => (
                  <Card key={item.title}>
                    <h3 className="text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {item.body}
                    </p>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="ecosystem">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Our Ecosystem
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                One login connecting discover, create, sell, promote, earn, and grow.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ABOUT_ECOSYSTEM.map((item, index) => (
                  <Card key={item.title} className="relative overflow-hidden">
                    <span className="text-[11px] font-black tabular-nums text-[#FF5A1F]">
                      0{index + 1}
                    </span>
                    <h3 className="mt-2 text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {item.body}
                    </p>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="impact">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Impact & global reach
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Figures below come from Jimvio&apos;s live platform stats — not placeholder marketing
                numbers.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {ABOUT_IMPACT.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.key} className="text-center">
                      <Icon className="mx-auto h-5 w-5 text-[#FF5A1F]" aria-hidden="true" />
                      <p className="mt-2 text-2xl font-black tabular-nums text-[#111827] dark:text-[var(--color-text-primary)]">
                        <AnimatedPlatformStatValue statKey={item.key} />
                        {item.key === "countries" ? "+" : ""}
                      </p>
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">
                        {PLATFORM_STAT_META[item.key].label}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </Section>

            <Section id="positioning">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Brand positioning
              </h2>
              <Card className="mt-4">
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Jimvio is the global creator-commerce platform: marketplace, affiliates, UGC
                  campaigns, communities, commerce integrations, and payouts — in one place, free
                  to start.
                </p>
              </Card>
            </Section>

            <Section id="promise">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Brand promise
              </h2>
              <Card className="mt-4">
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Clear rules. Useful tools. A fair chance to turn an idea into income, wherever
                  you are — without requiring a huge audience, a pile of apps, or hidden setup
                  fees.
                </p>
              </Card>
            </Section>

            <Section id="personality">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Brand personality
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { title: "Direct", body: "Plain language. No hype about guaranteed earnings." },
                  { title: "Warm", body: "Orange energy with generous space and human tone." },
                  { title: "Precise", body: "Numbers, policies, and product claims stay verifiable." },
                ].map((item) => (
                  <Card key={item.title}>
                    <h3 className="text-sm font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{item.body}</p>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="values">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Our Values
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                These are not wall posters. They are the decisions we make while building Jimvio.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {ABOUT_VALUES.map((value) => (
                  <Card key={value.title}>
                    <h3 className="text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                      {value.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {value.body}
                    </p>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="differentiation">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Differentiation
              </h2>
              <Card className="mt-4">
                <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li>All-in-one login for marketplace, affiliates, campaigns, and communities.</li>
                  <li>No followers required to join a campaign and start from a phone.</li>
                  <li>Global payouts, including mobile money for Africa and Southeast Asia.</li>
                  <li>Real-time tracking instead of black-box commissions.</li>
                  <li>Free to start — Jimvio earns when you earn.</li>
                </ul>
              </Card>
            </Section>

            <Section id="logo">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Logo
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Use the official Jimvio mark and lockup. Do not redraw or substitute them.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="flex min-h-[160px] flex-col items-center justify-center gap-3 bg-[#F8FAFC]">
                  <JimvioLogo variant="icon" size="lg" />
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">Brandmark</p>
                </Card>
                <Card className="flex min-h-[160px] flex-col items-center justify-center gap-3">
                  <JimvioLogo variant="full" size="lg" />
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">Lockup</p>
                </Card>
                <Card className="flex min-h-[160px] flex-col items-center justify-center gap-3 bg-[#111827]">
                  <span className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-[#FF5A1F]">
                    <JimvioLogo variant="icon" size="md" />
                  </span>
                  <p className="text-xs font-semibold text-white/70">Avatar / profile mark</p>
                </Card>
              </div>
              <h3 className="mt-8 text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                Downloadable brand files
              </h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Original PNG artwork. Each download is the supplied file, not a traced vector.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {BRAND_FILES.map((asset) => (
                  <Card key={asset.file} className="flex flex-col p-3">
                    <div className={`flex h-36 items-center justify-center overflow-hidden rounded-[12px] ${asset.frame}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.href}
                        alt=""
                        width={1024}
                        height={1024}
                        className="max-h-32 w-auto max-w-[90%] object-contain"
                      />
                    </div>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]">
                      {asset.category}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827] dark:text-[var(--color-text-primary)]">
                      {asset.label}
                    </p>
                    <a
                      href={asset.href}
                      download={asset.file}
                      className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[var(--color-border)] text-sm font-bold text-[#111827] hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:text-[var(--color-text-primary)]"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download PNG
                    </a>
                  </Card>
                ))}
              </div>
              <Card className="mt-4">
                <h3 className="text-sm font-bold">Clear space</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Keep at least the height of the orange mark as empty space around the lockup.
                  Never crowd the logo with other graphics or crop the rounded square.
                </p>
              </Card>
              <Card className="mt-4">
                <h3 className="text-sm font-bold">Logo misuse</h3>
                <ul className="mt-3 space-y-2">
                  {LOGO_MISUSE.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                    >
                      <span className="mt-0.5 text-red-500" aria-hidden="true">
                        ✕
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>

            <Section id="colors">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Brand colors
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ABOUT_COLORS.map((color) => (
                  <Card key={color.hex} className="p-3">
                    <div
                      className="h-20 rounded-[12px] border border-[var(--color-border)]"
                      style={{ background: color.hex }}
                    />
                    <p className="mt-3 text-sm font-bold">{color.name}</p>
                    <p className="font-mono text-xs text-[var(--color-text-muted)]">{color.hex}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{color.usage}</p>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="typography">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Typography
              </h2>
              <Card className="mt-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Jimvio uses the platform&apos;s established type family,{" "}
                  <strong className="text-[var(--color-text-primary)]">DM Sans</strong>, for
                  interface and marketing copy. Headlines are heavy and tightly tracked. Body copy
                  stays readable at 15px with relaxed line height.
                </p>
                <p className="mt-4 text-3xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                  Creators deserve better.
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  The quick brown fox jumps over the lazy dog.
                </p>
              </Card>
            </Section>

            <Section id="visual">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Visual identity
              </h2>
              <Card className="mt-4">
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Rounded cards (12–18px), light canvas backgrounds, restrained borders, and orange
                  used for emphasis — never as a wash over entire pages. Photography, when used,
                  should show real creators and products. Decorative art stays simple: globes,
                  documents, and the official mark.
                </p>
              </Card>
            </Section>

            <Section id="voice">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Voice & messaging
              </h2>
              <Card className="mt-4">
                <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li>Speak like a builder, not a billboard. Prefer specifics over slogans.</li>
                  <li>Never promise income, follower growth, or guaranteed results.</li>
                  <li>Use “we” for the company and “you” for the people using Jimvio.</li>
                  <li>Link policies instead of restating legal language in marketing copy.</li>
                </ul>
              </Card>
            </Section>

            <Section id="platform">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Platform & ecosystem
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Jump into live Jimvio products. Every card opens an existing route.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {ABOUT_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Link
                      key={feature.title}
                      href={feature.href}
                      className="flex items-start gap-3 rounded-[14px] border border-[var(--color-border)] bg-white px-4 py-3 transition hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-surface)]"
                    >
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(255,90,31,0.2)] text-[#FF5A1F]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 text-sm font-semibold text-[#111827] dark:text-[var(--color-text-primary)]">
                          {feature.title}
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-[var(--color-text-muted)]">
                          {feature.description}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Section>

            <Section id="social">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Social & marketing
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Principles for brand channels. Formal channel kits are still being completed.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  {
                    title: "Social identity",
                    body: "Use the official Jimvio orange, wordmark, and direct creator-commerce voice. Do not invent unofficial handles or marks.",
                  },
                  {
                    title: "Content principles",
                    body: "Lead with useful product truth. Avoid fake urgency, unsupported stats, or promises of earnings.",
                  },
                  {
                    title: "Campaign guidelines",
                    body: "Paid and affiliate promotions must follow Advertising Disclosure Guidelines and Community Guidelines.",
                  },
                ].map((item) => (
                  <Card key={item.title}>
                    <h3 className="text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {item.body}
                    </p>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C2410C]">
                      Guideline — completion pending
                    </p>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="assets">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Brand assets
              </h2>
              <Card className="mt-4">
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Download the official Jimvio mark SVG. Additional press kits are not published as
                  a packaged zip on this page.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="/jimvio-logo.svg"
                    download
                    className="inline-flex h-11 items-center rounded-[12px] bg-[#FF5A1F] px-5 text-sm font-bold text-white hover:bg-[#e04e18]"
                  >
                    Download logo SVG
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex h-11 items-center rounded-[12px] border border-[var(--color-border)] px-5 text-sm font-bold"
                  >
                    Partnerships
                  </Link>
                </div>
                <ul className="mt-4 space-y-2">
                  {ABOUT_RESOURCE_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm font-medium text-[#C2410C] hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>

            <Section id="governance">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Brand governance
              </h2>
              <Card className="mt-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Official legal documents live in the Jimvio Legal Center. This page does not
                  replace them.
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ABOUT_GOVERNANCE_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center justify-between rounded-[12px] border border-[var(--color-border)] px-3 py-2 text-sm font-medium hover:border-[rgba(255,90,31,0.3)]"
                      >
                        {link.label}
                        <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>

            <Section id="team">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                The team
              </h2>
              <Card className="mt-4">
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Jimvio is a globally distributed, remote-first team. Official documentation does
                  not publish individual bios on this page, so we do not invent names, photos, or
                  press logos.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  We exist to make earning online accessible — regardless of location, audience
                  size, or background. Always hiring.
                </p>
                <Link
                  href="/careers"
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-[12px] border border-[var(--color-border)] px-5 text-sm font-bold"
                >
                  See open roles
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Card>
            </Section>

            <section className="overflow-hidden rounded-[20px] bg-[#111827] px-6 py-10 text-white sm:px-10">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                Your next opportunity starts here.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
                Discover a connected ecosystem built to help creators, sellers, brands, and
                communities turn ideas into opportunities.
              </p>
              <Link
                href="/marketplace"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#FF5A1F] px-5 text-sm font-bold text-white hover:bg-[#e04e18]"
              >
                Explore Jimvio
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          </div>

          <aside className="hidden space-y-4 xl:sticky xl:top-24 xl:block">
            <Card className="overflow-hidden border-[rgba(255,90,31,0.2)] bg-[linear-gradient(160deg,#FFF8F4_0%,#FFFFFF_55%)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,90,31,0.12)] text-[#FF5A1F]">
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-[#111827]">Global impact</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ABOUT_IMPACT.map((stat) => (
                  <div key={stat.key}>
                    <p className="text-lg font-black tracking-tight text-[#FF5A1F]">{stat.title}</p>
                    <p className="text-[11px] font-medium text-[var(--color-text-muted)]">
                      {stat.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                “A fairer, more open internet for creators everywhere. We&apos;re building a
                creator-commerce economy where people, ideas, and businesses can grow — with
                fairness, safety, and real value for everyone.”
              </p>
              <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">
                — The Jimvio Team
              </p>
            </Card>
            <Card>
              <p className="mb-3 text-sm font-bold">Quick Links</p>
              <ul className="space-y-1">
                {ABOUT_QUICK_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-2 rounded-[10px] px-2 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[#C2410C]"
                      >
                        <Icon className="h-4 w-4 text-[#FF5A1F]" aria-hidden="true" />
                        {link.label}
                        <ChevronRight className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card>
              <p className="mb-3 text-sm font-bold">Our Values</p>
              <ul className="space-y-3">
                {ABOUT_VALUES.slice(0, 6).map((value) => (
                  <li key={value.title}>
                    <p className="text-sm font-semibold text-[#111827] dark:text-[var(--color-text-primary)]">
                      {value.title}
                    </p>
                    <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                      {value.body}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompassMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14.5 9.5 11 11l-1.5 3.5L13 13l1.5-3.5z" fill="currentColor" />
    </svg>
  );
}

function EyeMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

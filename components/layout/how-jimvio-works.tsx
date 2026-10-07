"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Globe,
  Link2,
  Megaphone,
  ShoppingBag,
  Shield,
  Truck,
  UserPlus,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_STATS } from "@/lib/platform-stats";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";
import {
  AffiliateCoinsVisual,
  BrandMegaphoneVisual,
  BuildCommunitiesVisual,
  BuyProductsVisual,
  CommunityPeopleVisual,
  CreateCampaignsVisual,
  EarnCommissionsVisual,
  SellProductsVisual,
} from "./journey-visuals";

const ORANGE = "#FF5A1F";
const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

type HowCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  cta?: string;
  visual: "join" | "explore" | "global" | "sell" | "paid" | "build" | "affiliate";
};

const CARDS: HowCard[] = [
  {
    title: "Join Jimvio",
    description:
      "Create your free account in seconds and join a global community of creators, buyers and entrepreneurs.",
    icon: UserPlus,
    href: "/register",
    cta: "Get Started Free",
    visual: "join",
  },
  {
    title: "Explore & Create",
    description:
      "Discover products, import dropshipping items, create your own products, content or start a campaign.",
    icon: ShoppingBag,
    href: "/marketplace",
    cta: "Explore Marketplace",
    visual: "explore",
  },
  {
    title: "Reach Global Audience",
    description:
      "Your products and content reach buyers, creators and communities across supported markets worldwide.",
    icon: Globe,
    href: "/marketplace",
    visual: "global",
  },
  {
    title: "Sell & Promote",
    description:
      "Sell products, run campaigns, do dropshipping, promote as an affiliate or through your content.",
    icon: Megaphone,
    href: "/seller/products",
    cta: "List or Promote",
    visual: "sell",
  },
  {
    title: "Get Paid",
    description:
      "Earn from sales, affiliate commissions, campaigns, UGC, live streams and your community.",
    icon: Wallet,
    href: "/wallet",
    visual: "paid",
  },
  {
    title: "Build & Grow",
    description:
      "Create communities, go live, collaborate with creators, and build your brand globally on Jimvio.",
    icon: Users,
    href: "/communities",
    visual: "build",
  },
  {
    title: "Earn as an Affiliate",
    description:
      "Promote products and campaigns, earn commissions and grow your income with Jimvio affiliates.",
    icon: BarChart3,
    href: "/affiliates",
    visual: "affiliate",
  },
];

const TRUST = [
  { icon: Globe, label: `${PLATFORM_STATS.countries}+ Countries` },
  { icon: Users, label: "Global Community" },
  { icon: Shield, label: "Secure & Trusted" },
  { icon: Zap, label: "Built for Creators" },
];

const RAIL: { label: string; sub: string; icon: LucideIcon; href: string }[] = [
  { label: "Marketplace", sub: "Physical & Digital Products", icon: ShoppingBag, href: "/marketplace" },
  { label: "Dropshipping", sub: "Global Suppliers", icon: Truck, href: "/commerce" },
  { label: "UGC & Clipping", sub: "Create & Earn", icon: Megaphone, href: "/ugc" },
  { label: "Communities", sub: "Live, Learn & Grow", icon: Users, href: "/communities" },
  { label: "Affiliates", sub: "Earn Commissions", icon: Link2, href: "/affiliates" },
];

function CardVisual({ type }: { type: HowCard["visual"] }) {
  switch (type) {
    case "join":
      return <CommunityPeopleVisual accent={ORANGE} />;
    case "explore":
      return <BuyProductsVisual accent={ORANGE} />;
    case "global":
      return <BuildCommunitiesVisual accent={ORANGE} />;
    case "sell":
      return <BrandMegaphoneVisual accent={ORANGE} />;
    case "paid":
      return <EarnCommissionsVisual accent={ORANGE} />;
    case "build":
      return <CreateCampaignsVisual accent={ORANGE} />;
    case "affiliate":
      return <AffiliateCoinsVisual accent={ORANGE} />;
    default:
      return <SellProductsVisual accent={ORANGE} />;
  }
}

export function HowJimvioWorks() {
  return (
    <SectionReveal
      id="jimvio-how-it-works"
      className="jimvio-how-works relative overflow-x-clip py-12 sm:py-14 lg:py-16"
      aria-labelledby="jimvio-how-title"
      threshold={0.08}
    >
      <div className={shell}>
        <header className="mb-8 text-center sm:mb-10">
          <RevealItem
            index={0}
            as="div"
            className="mb-3 inline-flex rounded-full bg-[#FFF1EB] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            How Jimvio Works
          </RevealItem>
          <RevealItem
            index={1}
            as="h2"
            id="jimvio-how-title"
            className="text-[clamp(1.65rem,3.6vw,2.35rem)] font-black tracking-[-0.035em] text-[#111827]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            How <span className="text-[#FF5A1F]">Jimvio</span> Works
          </RevealItem>
          <RevealItem
            index={2}
            as="p"
            className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#6B7280] sm:text-[15px]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Create. Sell. Promote. Earn. Build. All in one platform.
          </RevealItem>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {TRUST.map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(17,24,39,0.08)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#4B5563]"
              >
                <t.icon className="size-3.5 text-[#FF5A1F]" aria-hidden />
                {t.label}
              </span>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 xl:gap-3">
          {CARDS.map((card, index) => {
            const Icon = card.icon;
            const body = (
              <>
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F] sm:size-9">
                  <Icon className="size-3.5 sm:size-4" strokeWidth={2.2} aria-hidden />
                </span>
                <h3 className="mt-2.5 text-[14px] font-bold tracking-[-0.02em] text-[#111827] xl:text-[13px]">
                  {card.title}
                </h3>
                <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-[#6B7280] xl:text-[11px]">
                  {card.description}
                </p>
                <div className="mx-auto mt-2.5 h-[80px] w-[92px] xl:h-[72px] xl:w-[84px]" aria-hidden>
                  <CardVisual type={card.visual} />
                </div>
                {card.cta ? (
                  <span className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-bold text-[#FF5A1F] xl:text-[11px]">
                    {card.cta}
                    <ArrowRight className="size-3" aria-hidden />
                  </span>
                ) : null}
              </>
            );

            const className = cn(
              "group flex h-full min-h-[260px] flex-col rounded-[18px] border border-[rgba(17,24,39,0.07)] bg-white p-4",
              "shadow-[0_8px_22px_rgba(17,24,39,0.04)] transition-[transform,box-shadow,border-color] duration-300",
              "hover:-translate-y-0.5 hover:border-[rgba(255,90,31,0.22)] hover:shadow-[0_14px_30px_rgba(17,24,39,0.08)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
              "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              "xl:min-h-[280px] xl:p-3.5",
            );

            return (
              <RevealItem key={card.title} index={Math.min(index + 3, 8)} as="div" className="h-full">
                {card.href ? (
                  <Link
                    href={card.href}
                    className={className}
                    aria-label={`${card.title}${card.cta ? `. ${card.cta}` : ""}`}
                  >
                    {body}
                  </Link>
                ) : (
                  <article className={className}>{body}</article>
                )}
              </RevealItem>
            );
          })}
        </div>

        {/* Bottom ecosystem rail */}
        <div className="mt-8 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-10">
          <div className="flex min-w-max items-center justify-center gap-2 px-1 sm:min-w-0 sm:flex-wrap sm:gap-3">
            {RAIL.map((item, i) => (
              <div key={item.label} className="flex items-center gap-2 sm:gap-3">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-[14px] border border-[rgba(17,24,39,0.08)] bg-white px-3 py-2 shadow-[0_4px_12px_rgba(17,24,39,0.03)] transition-colors hover:border-[rgba(255,90,31,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
                >
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F]">
                    <item.icon className="size-3.5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[12px] font-bold text-[#111827]">{item.label}</span>
                    <span className="block text-[10px] text-[#6B7280]">{item.sub}</span>
                  </span>
                </Link>
                {i < RAIL.length - 1 ? (
                  <ArrowRight className="size-3.5 shrink-0 text-[#FF5A1F]/70" aria-hidden />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}

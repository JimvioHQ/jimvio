"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Megaphone,
  Percent,
  Search,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";
import { useCurrency } from "@/context/CurrencyContext";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";
import { getImage, fmtCount, cn } from "@/lib/utils";
import type { SharedCampaignRow } from "@/components/ugc/campaign-card-shared";

const ORANGE = "#fd5000";
const GREEN = "#16a34a";
const PURPLE = "#7c3aed";

const JIMVIO_AI_FEATURES = [
  {
    label: "Top Commissions",
    query: "Which affiliate products have the highest commission rates today?",
    icon: Percent,
  },
  {
    label: "Paid Creator Opportunities",
    query: "What UGC campaigns are paying creators the most right now?",
    icon: Video,
  },
  {
    label: "Find Profitable Products",
    query: "What are the most profitable products to promote on Jimvio right now?",
    icon: Search,
  },
  {
    label: "High-Converting Campaigns",
    query: "Show me high-converting campaigns I can join as a creator.",
    icon: Megaphone,
  },
  {
    label: "Trending Winning Products",
    query: "What trending products are winning sales this week on Jimvio?",
    icon: TrendingUp,
  },
  {
    label: "Launch & Sell Products",
    query: "How do I launch and sell products on Jimvio as a new vendor?",
    icon: Store,
  },
] as const;

type SpotlightProduct = {
  id: string;
  name: string;
  slug: string;
  price?: number;
  currency?: string;
  images?: unknown;
  sale_count?: number;
  sold_count?: number;
};

type SpotlightCommunity = {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  member_count?: number;
  avatar_url?: string | null;
  image_url?: string | null;
  cover_image?: string | null;
};

type SpotlightItem = {
  id: string;
  kind: "product" | "campaign" | "community";
  href: string;
  badge: string;
  badgeColor: string;
  image: string | null;
  title: string;
  subtitle: string;
  metric?: string;
};

function interleave<T>(groups: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(...groups.map((g) => g.length), 0);
  for (let i = 0; i < max; i++) {
    for (const group of groups) {
      if (group[i]) out.push(group[i]);
    }
  }
  return out;
}

function communityImage(c: SpotlightCommunity): string | null {
  return c.avatar_url ?? c.image_url ?? c.cover_image ?? null;
}

function JimvioAIHotSpotlight({
  products = [],
  campaigns = [],
  communities = [],
}: {
  products?: SpotlightProduct[];
  campaigns?: SharedCampaignRow[];
  communities?: SpotlightCommunity[];
}) {
  const { formatMoney } = useCurrency();
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const productItems: SpotlightItem[] = products.slice(0, 3).map((p) => ({
      id: `product-${p.id}`,
      kind: "product" as const,
      href: `/marketplace/${p.slug}`,
      badge: "Hot Product",
      badgeColor: ORANGE,
      image: getImage(p.images) || null,
      title: p.name,
      subtitle: "Trending on Jimvio marketplace",
      metric: p.price != null ? formatMoney(p.price, p.currency) : undefined,
    }));

    const campaignItems: SpotlightItem[] = campaigns.slice(0, 3).map((c) => {
      const vendor = c.vendor ?? c.vendors;
      const banner = c.media?.find((m) => m.usage === "banner")?.url;
      const logo = vendor?.business_logo ?? vendor?.logo_url ?? null;
      const isFixed = c.payment_model === "fixed_per_content";
      const pay = isFixed
        ? formatMoney(c.fixed_rate ?? 0, "USD")
        : formatMoney(c.rate_per_1k_views, "USD");
      const joined = c.approved_count ?? c.submission_count ?? 0;
      return {
        id: `campaign-${c.id}`,
        kind: "campaign" as const,
        href: `/ugc/${c.id}`,
        badge: "UGC Campaign",
        badgeColor: PURPLE,
        image: banner ?? logo,
        title: c.title,
        subtitle: vendor?.business_name ?? "Brand campaign",
        metric: `${pay} · ${joined} creators`,
      };
    });

    const communityItems: SpotlightItem[] = communities.slice(0, 3).map((c) => ({
      id: `community-${c.id}`,
      kind: "community" as const,
      href: `/communities/${c.slug}`,
      badge: "Community",
      badgeColor: GREEN,
      image: communityImage(c),
      title: c.name,
      subtitle: c.tagline ?? "Join and connect with members",
      metric: `${fmtCount(c.member_count ?? 0)} ${c.member_count === 1 ? "member" : "members"}`,
    }));

    return interleave([productItems, campaignItems, communityItems]);
  }, [products, campaigns, communities, formatMoney]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) {
    return (
      <p className="relative z-10 mt-1 text-[11px] leading-snug text-[var(--color-text-muted)] sm:text-[12px]">
        Earn, sell, create, and grow — affiliates, UGC campaigns, products, communities, live events, and courses.
      </p>
    );
  }

  const current = items[index];

  return (
    <div className="relative z-10 mt-1.5 min-h-[4.25rem] sm:min-h-[4.5rem]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href={current.href}
            className="flex w-full cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-2.5 py-2 transition-colors hover:border-[#fd5000]/25 hover:bg-[#fd5000]/8 sm:gap-3 sm:px-3 sm:py-2.5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface)] sm:size-11">
              {current.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.image}
                  alt=""
                  className={cn(
                    "size-full",
                    current.kind === "product" ? "object-contain p-1" : "object-cover"
                  )}
                  loading="lazy"
                />
              ) : (
                <span
                  className="grid size-full place-items-center"
                  style={{ color: current.badgeColor, background: `${current.badgeColor}14` }}
                >
                  {current.kind === "product" && <TrendingUp className="size-4" />}
                  {current.kind === "campaign" && <Video className="size-4" />}
                  {current.kind === "community" && <Users className="size-4" />}
                </span>
              )}
            </div>
            <span className="min-w-0 flex-1">
              <span
                className="inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white sm:text-[9px]"
                style={{ background: current.badgeColor }}
              >
                {current.badge}
              </span>
              <span className="mt-0.5 block line-clamp-1 text-[11px] font-bold text-[var(--color-text-primary)] sm:text-[12px]">
                {current.title}
              </span>
              <span className="mt-0.5 block line-clamp-1 text-[10px] text-[var(--color-text-muted)]">
                {current.subtitle}
              </span>
              {current.metric && (
                <span className="mt-0.5 block text-[10px] font-semibold sm:text-[11px]" style={{ color: GREEN }}>
                  {current.metric}
                </span>
              )}
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />
          </Link>
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <div className="mt-1.5 flex items-center justify-center gap-1" aria-hidden>
          {items.map((item, i) => (
            <span
              key={item.id}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === index ? "w-4 bg-[#fd5000]" : "w-1 bg-[var(--color-border)]"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JimvioAIFeatureGrid({ onSelect }: { onSelect: (query: string) => void }) {
  return (
    <div className="relative z-10 mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
      {JIMVIO_AI_FEATURES.map(({ label, query, icon: Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(query)}
          className="flex min-h-[2.75rem] min-w-0 cursor-pointer touch-manipulation items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/70 px-2.5 py-2 text-left transition-colors hover:border-[#fd5000]/30 hover:bg-[#fd5000]/10 active:bg-[#fd5000]/15 sm:min-h-[3rem] sm:px-3"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--color-surface)] text-[#fd5000] shadow-[0_2px_6px_rgba(253,80,0,0.12)] sm:size-8">
            <Icon className="size-3.5 sm:size-4" strokeWidth={2.25} />
          </span>
          <span className="min-w-0 text-[10px] font-semibold leading-tight text-[var(--color-text-primary)] sm:text-[11px]">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

export type JimvioAIPanelProps = {
  className?: string;
  showFeatureRows?: boolean;
  compact?: boolean;
  products?: SpotlightProduct[];
  campaigns?: SharedCampaignRow[];
  communities?: SpotlightCommunity[];
};

export function JimvioAIPanel({
  className,
  showFeatureRows = false,
  compact = false,
  products = [],
  campaigns = [],
  communities = [],
}: JimvioAIPanelProps) {
  const openAssistant = useAIStore((s) => s.openAssistant);
  const [prompt, setPrompt] = useState("");

  const ask = (query?: string) => {
    const text = (query ?? prompt).trim();
    openAssistant(text);
    setPrompt("");
  };

  return (
    <div className={cn(
      "relative w-full min-w-0",
      compact ? "" : "overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-[#FFF9F5] to-[#FFF0E6] p-4 shadow-[0_12px_32px_rgba(249,115,22,0.08)] sm:p-5",
      className
    )}>
      <div
        className={cn(
          "relative z-10 flex w-full items-center gap-2 sm:gap-3",
          compact ? "justify-start" : "justify-center"
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#fd5000] to-[#ff8c42] text-white sm:size-8">
          <Sparkles className="size-3.5 sm:size-4" strokeWidth={2.25} />
        </span>
        <h2
          className={cn(
            "shrink-0 font-black leading-none tracking-tight text-[#fd5000]",
            compact ? "text-[14px]" : "text-[17px] sm:text-[22px]"
          )}
        >
          Jimvio AI
        </h2>
        <JimvioAIMascot
          size="xs"
          showRings={false}
          className={cn("shrink-0", compact ? "h-10 w-10" : "h-12 w-12 sm:h-16 sm:w-16")}
        />
      </div>

      <div className="relative z-10 mt-1.5 flex flex-col gap-1.5 sm:relative sm:mt-2 sm:block">
        <div className="relative min-w-0 w-full">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-[#fd5000] sm:left-3.5 sm:size-4" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask();
            }}
            placeholder="Ask about products, campaigns…"
            aria-label="Ask Jimvio AI"
            className={cn(
              "h-10 w-full min-w-0 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] py-0 pl-9 pr-4 text-[12px] text-[var(--color-text-primary)] shadow-sm outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[#fd5000]/50 focus:ring-2 focus:ring-[#fd5000]/15 sm:pl-10 sm:pr-[148px] sm:text-[13px]",
              compact ? "sm:pr-4" : "sm:h-11"
            )}
          />
          <button
            type="button"
            onClick={() => ask()}
            className={cn(
              "absolute right-1.5 top-1/2 z-20 inline-flex h-8 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-md px-3 text-[11px] font-bold text-white transition-opacity hover:opacity-90 sm:h-9 sm:px-3.5 sm:text-[12px]",
              compact ? "hidden" : "hidden sm:inline-flex"
            )}
            style={{ background: ORANGE }}
          >
            Ask AI
            <ArrowRight className="size-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => ask()}
          className={cn(
            "inline-flex h-10 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-lg text-[12px] font-bold text-white transition-opacity hover:opacity-90 sm:h-11 sm:text-[13px]",
            compact ? "flex" : "sm:hidden"
          )}
          style={{ background: ORANGE }}
        >
          Ask Jimvio AI
          <ArrowRight className="size-4" />
        </button>
      </div>

      {!compact && showFeatureRows ? (
        <JimvioAIHotSpotlight
          products={products}
          campaigns={campaigns}
          communities={communities}
        />
      ) : (
        <p
          className={cn(
            "relative z-10 mt-1 leading-snug text-[var(--color-text-muted)]",
            compact ? "text-[10px]" : "text-[11px] sm:text-[12px]"
          )}
        >
          Earn, sell, create, and grow — affiliates, UGC campaigns, products, communities, live events, and courses.
        </p>
      )}

      {showFeatureRows && <JimvioAIFeatureGrid onSelect={(query) => ask(query)} />}
    </div>
  );
}

export { JIMVIO_AI_FEATURES };

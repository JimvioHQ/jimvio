"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShoppingBag, TrendingUp } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { getImage, fmtCount, cn } from "@/lib/utils";
import { CommunityLetterAvatar } from "@/components/community/community-letter-avatar";

const ORANGE = "var(--color-accent)";
const GREEN = "#16a34a";
const ROTATE_MS = 4000;

const FALLBACK_COMMUNITIES = [
  { id: "1", name: "Affiliate Hub", slug: "affiliate-hub", member_count: 12400, tagline: "Swap tips and wins on what's converting." },
  { id: "2", name: "UGC Creators", slug: "ugc-creators", member_count: 15600, tagline: "Post work, find briefs, talk rates." },
  { id: "3", name: "Jimvio Community", slug: "jimvio", member_count: 14, tagline: "Updates, questions, and feedback for the platform." },
  { id: "4", name: "Ecommerce Sellers", slug: "ecommerce-sellers", member_count: 8900, tagline: "Store owners comparing suppliers and ad spend." },
] as const;

type HeroProduct = {
  id: string;
  name: string;
  slug: string;
  price?: number;
  currency?: string;
  images?: unknown;
  sale_count?: number;
  sold_count?: number;
};

type HeroCommunity = {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  member_count?: number;
  avatar_url?: string | null;
  image_url?: string | null;
  cover_image?: string | null;
};

type ShowcaseItem = {
  id: string;
  kind: "product" | "community";
  href: string;
  exploreHref: string;
  badge: string;
  badgeColor: string;
  image: string | null;
  title: string;
  meta: string;
  description: string;
  actionLabel: string;
  exploreLabel: string;
};

function communityImage(c: HeroCommunity): string | null {
  return c.avatar_url ?? c.image_url ?? c.cover_image ?? null;
}

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

function BentoTile({
  item,
  className,
  imageClassName,
  showBadge,
}: {
  item: ShowcaseItem;
  className?: string;
  imageClassName?: string;
  showBadge?: boolean;
}) {
  const isProduct = item.kind === "product";

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative min-h-0 overflow-hidden rounded-2xl bg-[var(--color-surface-secondary)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]",
        className
      )}
    >
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.title}
          className={cn(
            "size-full transition-transform duration-500 group-hover:scale-105",
            isProduct ? "object-contain p-3 sm:p-4" : "object-cover",
            imageClassName
          )}
          loading="lazy"
        />
      ) : (
        <CommunityLetterAvatar
          name={item.title}
          className="size-full min-h-[80px]"
          textClassName={isProduct ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl font-black"}
          style={{ background: `${item.badgeColor}12`, color: item.badgeColor }}
        />
      )}

      {showBadge && (
        <span
          className="absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[9px] font-semibold text-white shadow-md sm:text-[10px]"
          style={{ background: item.badgeColor }}
        >
          {item.badge}
        </span>
      )}

      {showBadge && (
        <span className="absolute bottom-3 left-3 z-10 rounded-full bg-black/75 px-2.5 py-1 text-[9px] font-medium text-white/95 sm:text-[10px]">
          {isProduct ? "Selling fast" : "People posting today"}
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent p-2.5 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:p-3">
        <p className="line-clamp-1 text-[10px] font-bold text-white sm:text-[11px]">{item.title}</p>
      </div>
    </Link>
  );
}

export function HeroFeaturedShowcase({
  products = [],
  communities = [],
  className,
}: {
  products?: HeroProduct[];
  communities?: HeroCommunity[];
  className?: string;
}) {
  const { formatMoney } = useCurrency();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const items = useMemo(() => {
    const productItems: ShowcaseItem[] = products.slice(0, 6).map((p) => {
      const sold = p.sale_count ?? p.sold_count ?? 0;
      return {
        id: `product-${p.id}`,
        kind: "product" as const,
        href: `/marketplace/${p.slug}`,
        exploreHref: "/marketplace",
        badge: "Popular",
        badgeColor: ORANGE,
        image: getImage(p.images) || null,
        title: p.name,
        meta: `${formatMoney(p.price ?? 0, p.currency)} · ${fmtCount(sold)} sold`,
        description: sold > 0 ? `${fmtCount(sold)} sold so far.` : "Listed on the Jimvio marketplace.",
        actionLabel: "View product",
        exploreLabel: "All products",
      };
    });

    const communityItems: ShowcaseItem[] = (
      communities.length > 0 ? communities : FALLBACK_COMMUNITIES
    )
      .slice(0, 6)
      .map((c) => ({
        id: `community-${c.id}`,
        kind: "community" as const,
        href: `/communities/${c.slug}`,
        exploreHref: "/communities",
        badge: "Community",
        badgeColor: GREEN,
        image: communityImage(c),
        title: c.name,
        meta: `${fmtCount(c.member_count ?? 0)} members`,
        description: c.tagline ?? "Open group on Jimvio.",
        actionLabel: "Open community",
        exploreLabel: "All communities",
      }));

    return interleave([productItems, communityItems]);
  }, [products, communities, formatMoney]);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [items.length, paused]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  if (!items.length) return null;

  const n = items.length;
  const featured = items[index];
  const sideTiles = [
    items[(index + 1) % n],
    items[(index + 2) % n],
    items[(index + 3) % n],
  ].filter(Boolean);

  return (
    <div
      className={cn("flex w-full min-w-0 flex-col", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Kasha-style bento — tall spotlight left + 1 top + 2 bottom right */}
      <div className="flex flex-col gap-2.5 sm:gap-3">
        <div className="grid h-[220px] grid-cols-3 gap-2.5 sm:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={featured.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="col-span-3 min-h-0"
            >
              <BentoTile
                item={featured}
                showBadge
                className="h-full shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
                imageClassName={featured.kind === "product" ? "p-6" : undefined}
              />
            </motion.div>
          </AnimatePresence>
          {sideTiles.map((tile) => (
            <BentoTile key={tile.id} item={tile} className="h-[88px]" />
          ))}
        </div>

        <div className="hidden h-[300px] grid-cols-[1.35fr_1fr] grid-rows-2 gap-2.5 sm:grid sm:h-[360px] sm:gap-3 lg:h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={featured.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="col-start-1 row-span-2 row-start-1 min-h-0"
            >
              <BentoTile
                item={featured}
                showBadge
                className="size-full shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
                imageClassName={
                  featured.kind === "product"
                    ? "bg-[#f5e6c8] p-5 sm:p-8"
                    : undefined
                }
              />
            </motion.div>
          </AnimatePresence>

          <div className="col-start-2 row-span-2 grid min-h-0 grid-rows-2 gap-2.5 sm:gap-3">
            {sideTiles[0] && <BentoTile item={sideTiles[0]} className="min-h-0" />}
            <div className="grid min-h-0 grid-cols-2 gap-2.5 sm:gap-3">
              {sideTiles[1] && <BentoTile item={sideTiles[1]} className="min-h-0" />}
              {sideTiles[2] ? (
                <BentoTile item={sideTiles[2]} className="min-h-0" />
              ) : (
                <div className="min-h-0 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Featured info + actions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={featured.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="mt-4 min-w-0"
        >
          <div className="mb-3 flex items-start gap-2">
            <span
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg sm:size-9"
              style={{ background: `${featured.badgeColor}14`, color: featured.badgeColor }}
            >
              {featured.kind === "product" ? (
                <TrendingUp className="size-4" />
              ) : (
                <span className="text-[13px] font-black leading-none">
                  {featured.title.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-[var(--color-text-primary)] sm:text-[17px]">
                {featured.title}
              </h3>
              <p className="mt-0.5 text-[12px] font-bold sm:text-[13px]" style={{ color: GREEN }}>
                {featured.meta}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] text-[var(--color-text-muted)] sm:text-[12px]">
                {featured.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={featured.href}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: ORANGE }}
            >
              {featured.actionLabel}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={featured.exploreHref}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] font-bold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              {featured.exploreLabel}
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Feature ${item.title}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-[var(--color-accent)]" : "w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

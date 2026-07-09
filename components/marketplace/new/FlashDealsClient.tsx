"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { type DbProduct, getImage, getDiscount, getEffectiveCompareAtPrice } from "@/lib/utils";
import { dedupeProductsById } from "@/lib/marketplace/homepage-ranking";

type FlashDealProduct = DbProduct & {
  currency?: string | null;
};

const GAP_PX = 8; // gap-2

function getColumnCount(width: number) {
  if (width >= 1280) return 6;
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 640) return 3;
  return 2;
}

export function FlashDealsClient({ deals }: { deals: FlashDealProduct[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState<number | null>(null);

  const uniqueDeals = useMemo(() => dedupeProductsById(deals), [deals]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      const cols = getColumnCount(el.clientWidth);
      const width = (el.clientWidth - GAP_PX * (cols - 1)) / cols;
      setCardWidth(width > 0 ? width : null);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (uniqueDeals.length === 0) return null;

  return (
    <div ref={viewportRef} className="w-full overflow-hidden">
      <div
        className="flex w-full gap-2 overflow-x-auto pb-1 snap-x snap-mandatory"
        style={{ visibility: cardWidth == null ? "hidden" : "visible" }}
      >
        {uniqueDeals.map((d) => (
          <div
            key={d.id}
            className="shrink-0 snap-start"
            style={cardWidth != null ? { width: cardWidth } : undefined}
          >
            <FlashDealCard d={d} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlashDealCard({ d }: { d: FlashDealProduct }) {
  const { formatMoney } = useCurrency();
  const discount = getDiscount(d);
  const compareAtPrice = getEffectiveCompareAtPrice(d);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <Link
      href={`/marketplace/${d.slug}`}
      className="product-tap-nav group relative flex w-full min-w-0 flex-col rounded-xl border border-border bg-card p-2.5 transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 focus-visible:ring-offset-2 sm:p-3"
    >
      {discount && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-primary px-1 py-0.5 text-[8px] font-bold leading-none text-primary-foreground md:text-[9px]">
          {discount}
        </span>
      )}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/50">
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
        )}
        <img
          src={getImage(d.images)}
          alt={d.name}
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover object-center transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgLoaded(true)}
        />
      </div>
      <h4
        className="mt-0.5 line-clamp-2 overflow-hidden text-ellipsis break-words text-[12px] font-semibold leading-[1.3] min-h-[31.2px] max-h-[31.2px] md:text-[13px] md:leading-[1.35] md:min-h-[35.1px] md:max-h-[35.1px]"
      >
        {d.name}
      </h4>
      <div className="mt-0.5 flex items-baseline gap-0.5 leading-none">
        <span
          className="text-[10px] font-bold leading-none md:text-[12px]"
          style={{ color: "#FF5A1F" }}
        >
          {formatMoney(d.price, d.currency)}
        </span>
        {compareAtPrice && (
          <span
            className="text-[8px] font-medium leading-none line-through opacity-70 md:text-[9px]"
            style={{ color: "#9CA3AF" }}
          >
            {formatMoney(compareAtPrice, d.currency)}
          </span>
        )}
      </div>
    </Link>
  );
}

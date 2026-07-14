"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import {
  type DbProduct,
  getImage,
  getDiscount,
  getEffectiveCompareAtPrice,
  normalizeImages,
  isRenderableImageSrc,
} from "@/lib/utils";
import { dedupeProductsByIdentity } from "@/lib/marketplace/homepage-ranking";
import { ProductCardVideoMedia, type ProductVideoSource } from "@/components/marketplace/product-card-video-media";

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

  const uniqueDeals = useMemo(() => dedupeProductsByIdentity(deals), [deals]);

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
  const [hovered, setHovered] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const displayImage = getImage(d.images);
  const previewImages = useMemo(
    () => normalizeImages(d.images).filter(isRenderableImageSrc).slice(0, 3),
    [d.images],
  );

  useEffect(() => {
    setImgReady(false);
    if (!displayImage) {
      setImgReady(true);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setImgReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setImgReady(true);
    };
    img.src = displayImage;
    return () => {
      cancelled = true;
    };
  }, [displayImage]);

  return (
    <Link
      href={`/marketplace/${d.slug}`}
      className="product-tap-nav group relative flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-[transform,box-shadow] duration-150 ease-out hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted/50">
        <ProductCardVideoMedia
          productId={d.id}
          product={d}
          alt={d.name}
          imageSrc={displayImage}
          previewImages={previewImages}
          hovered={hovered}
          useNextImage={false}
          layout="fill"
          imageFit="cover"
          imageClassName={`transition-opacity duration-300 ease-out ${imgReady ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      {discount && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-primary px-1 py-0.5 text-[8px] font-bold leading-none text-primary-foreground md:text-[9px]">
          {discount}
        </span>
      )}
      <div className="flex flex-1 flex-col p-2 sm:p-2.5">
        <h4
          className="line-clamp-2 overflow-hidden text-ellipsis break-words text-[12px] font-semibold leading-[1.3] min-h-[31.2px] max-h-[31.2px] md:text-[13px] md:leading-[1.35] md:min-h-[35.1px] md:max-h-[35.1px]"
        >
          {d.name}
        </h4>
        <div className="mt-auto flex items-baseline gap-0.5 leading-none pt-1">
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
          <ArrowRight className="size-2.5 ml-0.5" strokeWidth={2.5} style={{ color: "#FF5A1F" }} />
        </div>
      </div>
    </Link>
  );
}

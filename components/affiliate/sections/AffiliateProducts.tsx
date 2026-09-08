"use client";

import Image from "next/image";
import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  Heart,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toggleWishlist } from "@/lib/actions/marketplace";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_BTN_SECONDARY,
  AFFILIATE_CARD,
  AFFILIATE_SHELL,
  AffiliateSectionHeading,
  fadeUp,
  formatAffiliateMoney,
  staggerContainer,
  type AffiliateSpotlightProduct,
} from "./shared";
import { cn } from "@/lib/utils";

type AffiliateProductsProps = {
  products: AffiliateSpotlightProduct[];
};

const PAGE_SIZE = 10;

const ProductCard = memo(function ProductCard({
  product,
  picked,
}: {
  product: AffiliateSpotlightProduct;
  picked: boolean;
}) {
  const [wishlisted, setWishlisted] = useState(false);
  const [pending, startTransition] = useTransition();
  const commissionPct =
    typeof product.rate === "number" && Number.isFinite(product.rate) && product.rate > 0
      ? Math.round(product.rate)
      : product.price > 0 && product.avgEarning > 0
        ? Math.round((product.avgEarning / product.price) * 100)
        : null;

  const onWishlist = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !wishlisted;
      setWishlisted(next);
      startTransition(async () => {
        try {
          const res = await toggleWishlist(product.id);
          if (!res.success) {
            setWishlisted(!next);
            return;
          }
          if (typeof res.inWishlist === "boolean") {
            setWishlisted(res.inWishlist);
          }
        } catch {
          setWishlisted(!next);
        }
      });
    },
    [product.id, wishlisted]
  );

  return (
    <article
      className={cn(
        AFFILIATE_CARD,
        "group relative flex h-full flex-col overflow-hidden",
        "transition-all duration-200 ease-out will-change-transform",
        "hover:-translate-y-1.5 hover:border-[#FF5A1F]/35",
        "hover:shadow-[0_16px_36px_rgba(17,24,39,0.12)]",
        "focus-within:ring-2 focus-within:ring-[#FF5A1F]/25 focus-within:ring-offset-2",
        "motion-reduce:hover:translate-y-0"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F8FAFC]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06] motion-reduce:group-hover:scale-100"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          unoptimized
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60"
        />

        {picked ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            <Check className="h-3 w-3" strokeWidth={3} />
            Picked
          </span>
        ) : null}

        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          disabled={pending}
          onClick={onWishlist}
          className={cn(
            "absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full",
            "border border-white/70 bg-white/85 text-[#6B7280] shadow-sm backdrop-blur-md",
            "transition-all duration-200 hover:scale-105 hover:text-[#FF5A1F]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
            "disabled:opacity-60 motion-reduce:hover:scale-100",
            wishlisted && "text-[#FF5A1F]"
          )}
        >
          <Heart
            className="h-3.5 w-3.5"
            strokeWidth={2.2}
            fill={wishlisted ? "currentColor" : "none"}
          />
        </button>

        <Link
          href={`/affiliates/promote/${product.slug}`}
          aria-label={`Quick preview ${product.name}`}
          className={cn(
            "absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full",
            "border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#111827] backdrop-blur-md",
            "opacity-0 translate-y-2 transition-all duration-200",
            "group-hover:translate-y-0 group-hover:opacity-100",
            "focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
            "motion-reduce:translate-y-0 motion-reduce:opacity-100"
          )}
        >
          <Eye className="h-3 w-3" />
          Preview
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <Link
          href={`/affiliates/promote/${product.slug}`}
          className="line-clamp-2 min-h-[2.4rem] rounded-sm text-[13px] font-semibold leading-snug text-[#111827] transition-colors duration-200 hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/30"
        >
          {product.name}
        </Link>

        <div className="mt-2.5 border-t border-[#F3F4F6] pt-2.5">
          <p className="text-[15px] font-bold tabular-nums leading-none text-[#111827]">
            {formatAffiliateMoney(product.price, product.currency)}
          </p>
          {commissionPct != null ? (
            <span className="mt-2 inline-flex rounded-full bg-[#FF5A1F]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF5A1F] ring-1 ring-[#FF5A1F]/20">
              {commissionPct}% Commission
            </span>
          ) : null}
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
            Earn per sale
          </p>
          <p className="mt-0.5 text-[15px] font-bold tabular-nums leading-none text-[#FF5A1F]">
            {formatAffiliateMoney(product.avgEarning, product.currency)}
          </p>
        </div>

        <div
          className={cn(
            "mt-auto pt-3 translate-y-1 opacity-95 transition-all duration-200",
            "group-hover:translate-y-0 group-hover:opacity-100",
            "motion-reduce:translate-y-0"
          )}
        >
          <Link
            href={`/affiliates/promote/${product.slug}`}
            className={cn(
              picked ? AFFILIATE_BTN_SECONDARY : AFFILIATE_BTN_PRIMARY,
              "h-9 w-full px-3 text-[12px]",
              !picked && "shadow-[0_4px_14px_rgba(255,90,31,0.22)]"
            )}
          >
            {picked ? "Manage link" : "Promote Now"}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </article>
  );
});

function ProductSkeleton() {
  return (
    <div className={cn(AFFILIATE_CARD, "overflow-hidden")}>
      <div className="aspect-[4/3] animate-pulse bg-[#F3F4F6]" />
      <div className="space-y-2.5 p-3.5">
        <div className="h-4 w-[80%] animate-pulse rounded bg-[#F3F4F6]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#F3F4F6]" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-[#F3F4F6]" />
        <div className="h-9 w-full animate-pulse rounded-[10px] bg-[#F3F4F6]" />
      </div>
    </div>
  );
}

export function AffiliateProducts({ products }: AffiliateProductsProps) {
  const initial = products.slice(0, PAGE_SIZE);
  const [items, setItems] = useState<AffiliateSpotlightProduct[]>(initial);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(initial.length);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;
  const gridRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set(initial.map((p) => p.id)));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/affiliates/products?limit=${PAGE_SIZE}&offset=0`,
          { credentials: "same-origin" }
        );
        if (!res.ok) return;
        const body = await res.json();
        if (cancelled) return;
        if (Array.isArray(body.pickedProductIds)) {
          setPickedIds(new Set(body.pickedProductIds as string[]));
        }
        if (typeof body.hasMore === "boolean") {
          setHasMore(body.hasMore && body.total > initial.length);
        } else if (typeof body.total === "number") {
          setHasMore(body.total > initial.length);
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setExpanded(true);
    try {
      const res = await fetch(
        `/api/affiliates/products?limit=${PAGE_SIZE}&offset=${offset}`,
        { credentials: "same-origin" }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || "Could not load more products");
      }
      const next = (body.products ?? []) as AffiliateSpotlightProduct[];
      const deduped = next.filter((p) => {
        if (seenIds.current.has(p.id)) return false;
        seenIds.current.add(p.id);
        return true;
      });
      setItems((prev) => [...prev, ...deduped]);
      const newOffset = offset + next.length;
      setOffset(newOffset);
      setHasMore(
        typeof body.hasMore === "boolean"
          ? body.hasMore
          : newOffset < Number(body.total ?? 0)
      );
      if (Array.isArray(body.pickedProductIds)) {
        setPickedIds((prev) => {
          const merged = new Set(prev);
          for (const id of body.pickedProductIds as string[]) merged.add(id);
          return merged;
        });
      }
      requestAnimationFrame(() => {
        gridRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products");
    } finally {
      setLoading(false);
    }
  }, [loading, offset]);

  return (
    <section className={`${AFFILIATE_SHELL} pt-12 sm:pt-14`} id="creatives">
      <AffiliateSectionHeading
        title="Products to Promote Now"
        subtitle="High-converting products with live commission rates — promote without leaving Affiliate Center."
      />

      {items.length === 0 && !loading ? (
        <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[14px] text-[#6B7280]">
          Affiliate-enabled products are loading into the catalog. Check back
          soon.
        </div>
      ) : (
        <motion.div
          ref={gridRef}
          className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5"
          initial={reduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={staggerContainer}
        >
          {items.map((product) => (
            <motion.div key={product.id} variants={fadeUp} className="h-full">
              <ProductCard
                product={product}
                picked={pickedIds.has(product.id)}
              />
            </motion.div>
          ))}
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <ProductSkeleton key={`sk-${i}`} />
              ))
            : null}
        </motion.div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        {error ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-[13px] text-red-600" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadMore()}
              className={cn(AFFILIATE_BTN_SECONDARY, "h-10 px-5 text-[13px]")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : null}

        {hasMore ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            aria-busy={loading}
            className={cn(
              AFFILIATE_BTN_PRIMARY,
              "h-11 px-7 text-[14px] disabled:opacity-70"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading products…
              </>
            ) : (
              <>
                Explore More to Promote
                <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
              </>
            )}
          </button>
        ) : items.length > 0 ? (
          <p className="text-[13px] font-medium text-[#9CA3AF]">
            {expanded
              ? "You're caught up on affiliate products."
              : "All spotlight products are shown."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

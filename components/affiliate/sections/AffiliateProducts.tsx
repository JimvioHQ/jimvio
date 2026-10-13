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
import { toggleWishlist } from "@/lib/actions/marketplace";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_BTN_SECONDARY,
  AFFILIATE_CARD,
  AFFILIATE_SHELL,
  AffiliateSectionHeading,
  formatAffiliateMoney,
  type AffiliateSpotlightProduct,
} from "./shared";
import { cn } from "@/lib/utils";
import {
  AFFILIATE_CATALOG_PAGE_SIZE,
  canLoadMoreAffiliateProducts,
  catalogHasMore,
  affiliateFeedErrorMessage,
  mergeAffiliateCatalogPage,
  shouldFollowDuplicatePage,
} from "@/lib/affiliate/catalog-feed";

type AffiliateProductsProps = {
  products: AffiliateSpotlightProduct[];
  total?: number | null;
};

const PAGE_SIZE = AFFILIATE_CATALOG_PAGE_SIZE;

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

export function AffiliateProducts({ products, total = null }: AffiliateProductsProps) {
  const initial = products.slice(0, PAGE_SIZE);
  const [items, setItems] = useState<AffiliateSpotlightProduct[]>(initial);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(
    catalogHasMore({ loaded: initial.length, total, pageSize: PAGE_SIZE }),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const seenIds = useRef(new Set(initial.map((p) => p.id)));
  const offsetRef = useRef(initial.length);
  const itemsRef = useRef(initial);
  const inFlight = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

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
        const reportedTotal = typeof body.total === "number" ? body.total : total;
        if (offsetRef.current === initial.length) {
          setHasMore(
            catalogHasMore({
              loaded: initial.length,
              total: reportedTotal,
              pageSize: PAGE_SIZE,
            }),
          );
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
    if (!canLoadMoreAffiliateProducts({ loading: inFlight.current, hasMore })) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    setExpanded(true);
    let follows = 0;
    let firstAddedId: string | null = null;
    try {
      while (follows < 3) {
        const res = await fetch(
          `/api/affiliates/products?limit=${PAGE_SIZE}&offset=${offsetRef.current}`,
          { credentials: "same-origin" }
        );
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(affiliateFeedErrorMessage(body, false) ?? "Could not load more products");
        }
        const pageProducts = (body.products ?? []) as AffiliateSpotlightProduct[];
        const merged = mergeAffiliateCatalogPage(itemsRef.current, seenIds.current, {
          products: pageProducts,
          offset: offsetRef.current,
          limit: PAGE_SIZE,
          total: typeof body.total === "number" ? body.total : null,
          hasMore: typeof body.hasMore === "boolean" ? body.hasMore : undefined,
        });
        seenIds.current = merged.seen;
        offsetRef.current = merged.nextOffset;
        itemsRef.current = merged.items;
        setItems(merged.items);
        setHasMore(merged.hasMore);
        if (Array.isArray(body.pickedProductIds)) {
          setPickedIds((prev) => {
            const next = new Set(prev);
            for (const id of body.pickedProductIds as string[]) next.add(id);
            return next;
          });
        }
        if (!firstAddedId && merged.firstAddedId) firstAddedId = merged.firstAddedId;
        if (!shouldFollowDuplicatePage(merged, follows)) break;
        follows += 1;
      }
      if (firstAddedId) {
        requestAnimationFrame(() => {
          document.getElementById(`affiliate-product-${firstAddedId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [hasMore]);

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
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
          {items.map((product) => (
            <div key={product.id} id={`affiliate-product-${product.id}`} className="h-full">
              <ProductCard
                product={product}
                picked={pickedIds.has(product.id)}
              />
            </div>
          ))}
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <ProductSkeleton key={`sk-${i}`} />
              ))
            : null}
        </div>
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
            disabled={loading || !canLoadMoreAffiliateProducts({ loading, hasMore })}
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

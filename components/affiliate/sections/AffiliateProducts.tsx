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
  formatAffiliateMoney,
  type AffiliateSpotlightProduct,
} from "./shared";
import { cn } from "@/lib/utils";
import { formatAffiliateRate } from "@/lib/affiliate/commission-tiers";
import {
  AFFILIATE_CATALOG_PAGE_SIZE,
  canLoadMoreAffiliateProducts,
  catalogHasMore,
  affiliateFeedErrorMessage,
  mergeAffiliateCatalogPage,
  shouldFollowDuplicatePage,
} from "@/lib/affiliate/catalog-feed";
import {
  affiliateDiscoveryLabel,
  affiliateDiscoverySectionTitle,
  affiliateSearchGuidance,
  affiliateSearchMatchReason,
  normalizeAffiliateSearch,
  type AffiliateDiscoveryCategoryId,
} from "@/lib/affiliate/discovery";

type AffiliateProductsProps = {
  products: AffiliateSpotlightProduct[];
  total?: number | null;
  category: AffiliateDiscoveryCategoryId;
  search: string;
  pickedProductIds?: string[];
  loadError?: string | null;
  pending?: boolean;
  onClearSearch: () => void;
  onSelectCategory: (id: AffiliateDiscoveryCategoryId) => void;
  onRetry: () => void;
};

const PAGE_SIZE = AFFILIATE_CATALOG_PAGE_SIZE;

const ProductCard = memo(function ProductCard({
  product,
  picked,
  search,
}: {
  product: AffiliateSpotlightProduct;
  picked: boolean;
  search: string;
}) {
  const matchReason = affiliateSearchMatchReason(
    {
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
    },
    search,
  );
  const [wishlisted, setWishlisted] = useState(false);
  const [pending, startTransition] = useTransition();
  const commissionPct =
    typeof product.rate === "number" && Number.isFinite(product.rate) && product.rate > 0
      ? formatAffiliateRate(product.rate)
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
          if (typeof res.inWishlist === "boolean") setWishlisted(res.inWishlist);
        } catch {
          setWishlisted(!next);
        }
      });
    },
    [product.id, wishlisted],
  );

  return (
    <article
      className={cn(
        AFFILIATE_CARD,
        "group relative flex h-full flex-col overflow-hidden",
        "transition-shadow duration-200 hover:border-[#FF5A1F]/30 hover:shadow-[0_12px_28px_rgba(17,24,39,0.08)]",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F8FAFC]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          loading="lazy"
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          unoptimized
        />
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          disabled={pending}
          onClick={onWishlist}
          className={cn(
            "absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full",
            "border border-white/80 bg-white text-[#9CA3AF] shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
            "disabled:opacity-60",
            wishlisted && "text-[#FF5A1F]",
          )}
        >
          <Heart className="h-3.5 w-3.5" strokeWidth={2.2} fill={wishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <Link
          href={`/affiliates/promote/${product.slug}`}
          className="line-clamp-2 min-h-[2.4rem] rounded-sm text-[13px] font-semibold leading-snug text-[#172033] hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/30"
        >
          {product.name}
        </Link>
        {matchReason ? (
          <p className="mt-1 text-[11px] leading-snug text-[#6B7280]">{matchReason}</p>
        ) : null}

        <div className="mt-2.5">
          <p className="text-[15px] font-bold tabular-nums leading-none text-[#111827]">
            {formatAffiliateMoney(product.price, product.currency)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
              Earn per
            </p>
            {commissionPct != null ? (
              <span className="inline-flex rounded-full bg-[#FFF1EA] px-2 py-0.5 text-[10px] font-semibold text-[#FF5A1F]">
                {commissionPct}% commission
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
            Earn per sale
          </p>
          <p className="mt-1 text-[18px] font-bold tabular-nums leading-none text-[#FF5A1F]">
            {formatAffiliateMoney(product.avgEarning, product.currency)}
          </p>
        </div>

        <div className="mt-auto pt-3">
          <Link
            href={`/affiliates/promote/${product.slug}`}
            className={cn(
              picked ? AFFILIATE_BTN_SECONDARY : AFFILIATE_BTN_PRIMARY,
              "h-10 w-full px-3 text-[13px]",
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
        <div className="h-10 w-full animate-pulse rounded-[10px] bg-[#F3F4F6]" />
      </div>
    </div>
  );
}

function snapshotFrom(products: AffiliateSpotlightProduct[], total: number | null, signature: string) {
  const initial = products.slice(0, PAGE_SIZE);
  return {
    signature,
    items: initial,
    hasMore: catalogHasMore({ loaded: initial.length, total, pageSize: PAGE_SIZE }),
    offset: initial.length,
  };
}

export function AffiliateProducts({
  products,
  total = null,
  category,
  search,
  pickedProductIds = [],
  loadError = null,
  pending = false,
  onClearSearch,
  onSelectCategory,
  onRetry,
}: AffiliateProductsProps) {
  const signature = `${category}|${normalizeAffiliateSearch(search)}|${products.map((product) => product.id).join(",")}|${total ?? ""}|${loadError ?? ""}`;
  const [snapshot, setSnapshot] = useState(() => snapshotFrom(products, total, signature));
  const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set(pickedProductIds));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(loadError);
  const seenIds = useRef(new Set(snapshot.items.map((product) => product.id)));
  const offsetRef = useRef(snapshot.offset);
  const itemsRef = useRef(snapshot.items);
  const inFlight = useRef(false);
  const signatureRef = useRef(signature);

  useEffect(() => {
    signatureRef.current = signature;
    seenIds.current = new Set(snapshot.items.map((product) => product.id));
    offsetRef.current = snapshot.offset;
    itemsRef.current = snapshot.items;
  }, [signature, snapshot]);

  const loadMore = useCallback(async () => {
    if (!canLoadMoreAffiliateProducts({ loading: inFlight.current, hasMore: snapshot.hasMore })) return;
    const requestSignature = signatureRef.current;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    let follows = 0;
    let firstAddedId: string | null = null;
    try {
      while (follows < 3) {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offsetRef.current),
          category,
          q: normalizeAffiliateSearch(search),
        });
        const res = await fetch(`/api/affiliates/products?${params.toString()}`, {
          credentials: "same-origin",
        });
        const body = await res.json().catch(() => null);
        if (signatureRef.current !== requestSignature) return;
        if (!res.ok) {
          throw new Error(affiliateFeedErrorMessage(body, false) ?? "Could not load more products");
        }
        if (body?.category !== category || (body?.q ?? "") !== normalizeAffiliateSearch(search)) return;
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
        setSnapshot((current) => ({
          ...current,
          items: merged.items,
          hasMore: merged.hasMore,
          offset: merged.nextOffset,
        }));
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
      if (signatureRef.current === requestSignature) {
        setError(err instanceof Error ? err.message : "Could not load products");
      }
    } finally {
      inFlight.current = false;
      if (signatureRef.current === requestSignature) setLoading(false);
    }
  }, [category, search, snapshot.hasMore]);

  const query = normalizeAffiliateSearch(search);
  const title = query
    ? `Results for “${query}”`
    : affiliateDiscoverySectionTitle(category);
  const label = affiliateDiscoveryLabel(category);
  const searchGuidance = affiliateSearchGuidance(query, query ? label : null);
  const showSkeleton = pending || (loading && snapshot.items.length === 0);

  const viewAll = () => {
    if (query) {
      onClearSearch();
      return;
    }
    document.getElementById("campaigns")?.focus();
  };

  return (
    <section className={`${AFFILIATE_SHELL} pt-8 sm:pt-10`} id="campaigns" tabIndex={-1}>
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-[#172033] sm:text-[24px]">{title}</h2>
          {searchGuidance ? (
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-[#6B7280]">{searchGuidance}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={viewAll}
          className="inline-flex h-10 items-center justify-center gap-1 self-start rounded-full border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35"
        >
          View all products
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {showSkeleton ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <ProductSkeleton key={`sk-${index}`} />
          ))}
        </div>
      ) : error && snapshot.items.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white px-6 py-14 text-center" role="alert">
          <p className="text-[14px] font-semibold text-[#111827]">Could not load products</p>
          <p className="mt-1 text-[13px] text-[#6B7280]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className={cn(AFFILIATE_BTN_SECONDARY, "mt-4 h-10 px-5 text-[13px]")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      ) : snapshot.items.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white px-6 py-14 text-center" role="status">
          <p className="text-[14px] font-semibold text-[#111827]">
            {query
              ? `No products match “${query}”`
              : category === "featured"
                ? "No featured products yet"
                : `No ${label.toLowerCase()} to promote yet`}
          </p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-[#6B7280]">
            {query
              ? "Nothing in the promotable catalog matches that search."
              : category === "featured"
                ? "No products are marked as featured right now."
                : "Nothing in this category is open for affiliate promotion."}
          </p>
          {query ? (
            <button
              type="button"
              onClick={onClearSearch}
              className={cn(AFFILIATE_BTN_PRIMARY, "mt-4 h-10 px-5 text-[13px]")}
            >
              Clear search
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectCategory(category === "featured" ? "physical" : "featured")}
              className={cn(AFFILIATE_BTN_PRIMARY, "mt-4 h-10 px-5 text-[13px]")}
            >
              {category === "featured" ? "Browse physical products" : "Browse featured products"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
          {snapshot.items.map((product) => (
            <div key={product.id} id={`affiliate-product-${product.id}`} className="h-full">
              <ProductCard product={product} picked={pickedIds.has(product.id)} search={query} />
            </div>
          ))}
          {loading
            ? Array.from({ length: 5 }).map((_, index) => <ProductSkeleton key={`more-${index}`} />)
            : null}
        </div>
      )}

      {!showSkeleton && snapshot.items.length > 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          {error ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-[13px] text-red-600" role="alert">{error}</p>
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
          {snapshot.hasMore ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loading || !canLoadMoreAffiliateProducts({ loading, hasMore: snapshot.hasMore })}
              aria-busy={loading}
              className={cn(AFFILIATE_BTN_PRIMARY, "h-11 px-7 text-[14px] disabled:opacity-70")}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading products…
                </>
              ) : (
                <>
                  Load more
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Heart, ShieldCheck, Flame, Sparkles,
  TrendingUp, Warehouse, MapPin, ShoppingCart, Eye, ChevronDown, Star,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import { type DbProduct, getImage, getEffectiveCompareAtPrice, getProductDiscountLabel } from "@/lib/utils";
import { addToCart, toggleWishlist, getWishlistProductIds } from "@/lib/actions/marketplace";
import { filterStorefrontVariants } from "@/lib/products/storefront-variants";
import type { Tables } from "@/types/supabase";

export type DbVariant = Tables<"product_variants">;

type Product = DbProduct & {
  vendor_id?: string | null;
  track_inventory?: boolean | null;
  variants?: DbVariant[];
  product_variants?: DbVariant[];
  currency?: string | null;
  vendors?: { id: string; verification_status?: string | null } | null;
};

const PHYSICAL_TABS = [
  { label: "Trending", icon: Flame, filter: (_p: Product) => true },
  { label: "New Arrivals", icon: Sparkles, filter: (_p: Product) => true },
  { label: "Best Selling", icon: TrendingUp, filter: (p: Product) => (p.sale_count ?? 0) > 0 },
  { label: "Free Shipping", icon: Warehouse, filter: (p: Product) => p.is_free_shipping === true },
  { label: "Local Stock", icon: MapPin, filter: (p: Product) => p.shipping_from != null },
];

const DIGITAL_TABS = [
  { label: "Trending", icon: Flame, filter: (_p: Product) => true },
  { label: "New Arrivals", icon: Sparkles, filter: (_p: Product) => true },
  { label: "Best Selling", icon: TrendingUp, filter: (p: Product) => (p.sale_count ?? 0) > 0 },
  { label: "Top Rated", icon: Star, filter: (p: Product) => (p.rating ?? 0) >= 4 },
  { label: "Instant Access", icon: Warehouse, filter: (p: Product) => p.product_type !== "physical" },
];

function normaliseVariant(v: any): DbVariant {
  const meta = v.source_metadata ?? {};
  return {
    ...v,
    cj_vid: v.cj_vid ?? meta.cj_vid ?? null,
    cj_pid: v.cj_pid ?? meta.cj_pid ?? null,
  };
}

// Single helper — shows toast AND sets inline error state, never logs to console
function reportError(
  msg: string,
  setAddError: (m: string | null) => void
) {
  setAddError(msg);
  toast.error(msg);
  setTimeout(() => setAddError(null), 3000);
}

export function TrendingProductsClient({
  products,
  type = "physical",
}: {
  products: Product[];
  type?: "physical" | "digital";
}) {
  const TABS = type === "digital" ? DIGITAL_TABS : PHYSICAL_TABS;
  const [activeTab, setActiveTab] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [wishlistLoaded, setWishlistLoaded] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    getWishlistProductIds()
      .then((ids) => { setFavorites(new Set(ids)); setWishlistLoaded(true); })
      .catch(() => setWishlistLoaded(true));
  }, []);

  useEffect(() => { setActiveTab(0); }, [type]);

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  const filtered = products.filter(TABS[activeTab].filter);

  const toggleFav = useCallback(async (productId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      await toggleWishlist(productId);
    } catch {
      // Revert optimistic update silently
      setFavorites((prev) => {
        const next = new Set(prev);
        next.has(productId) ? next.delete(productId) : next.add(productId);
        return next;
      });
    }
  }, []);

  return (
    <div className="space-y-5">
      <div className="relative flex items-center gap-0.5 border-b border-[var(--color-border)]">
        <div
          className="absolute bottom-0 h-[2px] bg-[var(--color-accent)] transition-all duration-300 ease-out rounded-full"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
        {TABS.map((t, i) => {
          const active = activeTab === i;
          return (
            <button
              key={t.label}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              onClick={() => setActiveTab(i)}
              className="relative flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-semibold tracking-wide transition-colors duration-150 whitespace-nowrap"
              style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
            >
              <t.icon
                style={{
                  width: 12,
                  height: 12,
                  transform: active ? "scale(1.15)" : "scale(1)",
                  transition: "transform 150ms",
                }}
              />
              {t.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-6 py-16 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-secondary)" }}
        >
          <div className="mb-2 text-2xl">🛍️</div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            Nothing here yet
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
            Check back soon or explore other categories
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              isFav={favorites.has(p.id)}
              wishlistLoaded={wishlistLoaded}
              onToggleFav={() => toggleFav(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Helpers                                                    */
/* ─────────────────────────────────────────────────────────── */

function getOptions(v: DbVariant): Record<string, string> {
  const o = v.options;
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  return o as Record<string, string>;
}

const COLOR_KEYS = ["color", "colour", "Color", "Colour"];

function getColorValue(opts: Record<string, string>): string | null {
  for (const k of COLOR_KEYS) if (opts[k]) return opts[k];
  return null;
}

function cssColor(raw: string): string {
  if (/^#|^rgb|^hsl/.test(raw)) return raw;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = raw.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 55%)`;
}

/* ─────────────────────────────────────────────────────────── */
/*  ProductCard                                                */
/* ─────────────────────────────────────────────────────────── */

function ProductCard({
  p,
  isFav,
  wishlistLoaded,
  onToggleFav,
}: {
  p: Product;
  isFav: boolean;
  wishlistLoaded: boolean;
  onToggleFav: () => void;
}) {
  const trackInventory = Boolean(p.track_inventory);
  const variants: DbVariant[] = filterStorefrontVariants(
    (p.variants ?? p.product_variants ?? []).map(normaliseVariant),
    trackInventory
  );

  const vendorId: string = (p.vendor_id ?? (p as any)?.vendors?.id ?? "") as string;

  const colorVariants = variants.filter((v) => v.is_active && getColorValue(getOptions(v)));
  const hasColors = colorVariants.length > 0;

  const sizeKey = ["size", "Size"].find((k) =>
    variants.some((v) => getOptions(v)[k])
  );
  const sizeOptions = sizeKey
    ? [...new Set(
      variants
        .filter((v) => v.is_active && getOptions(v)[sizeKey])
        .map((v) => getOptions(v)[sizeKey])
    )]
    : [];
  const hasSizes = sizeOptions.length > 0;

  const activeVariants = variants.filter((v) => v.is_active);
  const activeVariantsCount = activeVariants.length;
  const defaultVariant = activeVariantsCount === 1 ? activeVariants[0] : null;

  const initialColor = (() => {
    if (defaultVariant) {
      const c = getColorValue(getOptions(defaultVariant));
      if (c) return c;
    }
    if (activeVariantsCount <= 1 && colorVariants[0])
      return getColorValue(getOptions(colorVariants[0]));
    return null;
  })();

  const initialSize = (() => {
    if (sizeKey && defaultVariant) {
      const s = getOptions(defaultVariant)[sizeKey];
      if (s) return s;
    }
    return activeVariantsCount <= 1 ? sizeOptions[0] ?? null : null;
  })();

  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);
  const [selectedSize, setSelectedSize] = useState<string | null>(initialSize);
  const [showSizes, setShowSizes] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const { formatMoney } = useCurrency();

  let activeVariant = variants.find((v) => {
    const colorMatch = !selectedColor || getColorValue(getOptions(v)) === selectedColor;
    const sizeMatch = !selectedSize || !sizeKey || getOptions(v)[sizeKey] === selectedSize;
    return colorMatch && sizeMatch && v.is_active;
  }) ?? null;

  if (!activeVariant && activeVariantsCount === 1) activeVariant = defaultVariant;

  const sizeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showSizes) return;
    const handler = (e: MouseEvent) => {
      if (sizeRef.current && !sizeRef.current.contains(e.target as Node))
        setShowSizes(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSizes]);

  const displayPrice = activeVariant?.price ?? p.price;
  const compareAtPrice = activeVariant?.compare_at_price ?? p.compare_at_price;
  const displayImage = activeVariant?.image_url ?? getImage(p.images);
  const discountFields = {
    price: displayPrice,
    compare_at_price: compareAtPrice,
    discount_label: p.discount_label,
    is_flash_deal: p.is_flash_deal,
  };
  const discount = getProductDiscountLabel(discountFields);
  const effectiveCompareAt = getEffectiveCompareAtPrice(discountFields);
  const currency = (activeVariant as any)?.currency ?? p.currency ?? "USD";
  const isVerifiedSupplier = p.vendors?.verification_status === "verified";

  const outOfStock =
    activeVariant != null &&
    activeVariant.inventory_quantity != null &&
    activeVariant.inventory_quantity <= 0;

  const SWATCH_LIMIT = 5;
  const visibleColors = colorVariants.slice(0, SWATCH_LIMIT);
  const extraColors = colorVariants.length - SWATCH_LIMIT;

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (adding) return;

    if (!vendorId) {
      reportError("Missing vendor information.", setAddError);
      return;
    }

    if (variants.length > 0 && !activeVariant) {
      reportError("Please select options first.", setAddError);
      return;
    }

    if (outOfStock) {
      reportError("This item is out of stock.", setAddError);
      return;
    }

    setAdding(true);
    setAddError(null);

    try {
      const result = await addToCart(
        p.id,
        vendorId,
        1,
        activeVariant?.id ?? null
      );

      if (!result.success) {
        if (result.error === "Authentication required") {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        reportError(result.error ?? "Failed to add to cart.", setAddError);
        return;
      }

      setAdded(true);
      toast.success("Added to cart!");
      setTimeout(() => setAdded(false), 2000);
    } catch (err: any) {
      if (err?.message === "Authentication required") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      reportError(err?.message ?? "Something went wrong.", setAddError);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="group relative flex flex-col rounded-md overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,.10)]"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      {/* ── Image ── */}
      <div className="relative overflow-hidden">
        <Link
          href={`/marketplace/${p.slug}${activeVariant ? `?variant=${activeVariant.id}` : ""}`}
          className="block"
        >
          <div
            className="relative flex aspect-square w-full items-center justify-center overflow-hidden"
            style={{ background: "var(--color-surface-secondary)" }}
          >
            <img
              src={displayImage}
              alt={p.name}
              width={512}
              height={512}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain object-center p-2 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[.03] transition-colors duration-200 pointer-events-none" />
          </div>
        </Link>

        {discount && (
          <span
            className="absolute left-2 top-2 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white"
            style={{ background: "var(--color-accent)" }}
          >
            {discount}
          </span>
        )}

        {p.is_free_shipping && !discount && (
          <span
            className="absolute left-2 top-2 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white"
            style={{ background: "var(--color-success, #16a34a)" }}
          >
            Free ship
          </span>
        )}

        {outOfStock && (
          <span
            className="absolute left-2 bottom-10 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white"
            style={{ background: "rgba(0,0,0,.55)" }}
          >
            Out of stock
          </span>
        )}

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleFav(); }}
          disabled={!wishlistLoaded}
          className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full shadow-sm transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50"
          style={{
            background: isFav ? "var(--color-accent)" : "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
          aria-label={isFav ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isFav}
        >
          <Heart
            className="size-3.5 transition-colors duration-150"
            style={{ color: isFav ? "#fff" : "var(--color-text-muted)" }}
            fill={isFav ? "#fff" : "none"}
          />
        </button>

        <div
          className="absolute inset-x-0 bottom-0 z-10 flex translate-y-full gap-1 p-1.5 transition-transform duration-200 ease-out group-hover:translate-y-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.55) 0%, transparent 100%)" }}
        >
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding || !vendorId || outOfStock}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
            style={{
              background: addError
                ? "#dc2626"
                : added
                  ? "var(--color-success, #16a34a)"
                  : outOfStock
                    ? "rgba(100,100,100,.7)"
                    : "var(--color-accent)",
            }}
          >
            {adding ? (
              <span className="size-3 animate-spin rounded-full border border-white border-t-transparent" />
            ) : (
              <ShoppingCart className="size-3" />
            )}
            {adding ? "Adding…" : addError ? "Failed" : added ? "Added!" : outOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
          <Link
            href={`/marketplace/${p.slug}`}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-white transition-colors hover:bg-white/20"
            style={{ background: "rgba(255,255,255,.15)" }}
            aria-label="Quick view"
          >
            <Eye className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col gap-1 p-2.5 pt-2">
        <Link href={`/marketplace/${p.slug}`}>
          <h4
            className="line-clamp-2 text-[11px] font-semibold leading-snug hover:underline underline-offset-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            {p.name}
          </h4>
        </Link>



        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 rounded-full text-[12px] font-semibold ${isVerifiedSupplier
              ? " text-blue-600"
              : "bg-zinc-100 text-zinc-700"
              }`}
          >
            <ShieldCheck className="size-3" />
            {isVerifiedSupplier ? "Verified supplier" : ""}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>
            {formatMoney(displayPrice, currency)}
          </span>
          {effectiveCompareAt && (
            <span className="text-[10px] line-through" style={{ color: "var(--color-text-muted)" }}>
              {formatMoney(effectiveCompareAt, currency)}
            </span>
          )}
        </div>

        {hasColors && (
          <div className="mt-1 flex items-center gap-1 flex-wrap">
            {visibleColors.map((v) => {
              const raw = getColorValue(getOptions(v))!;
              const isSelected = selectedColor === raw;
              return (
                <button
                  key={v.id}
                  type="button"
                  title={raw}
                  onClick={() => setSelectedColor(raw)}
                  className="rounded-full transition-all duration-150 hover:scale-110"
                  style={{
                    width: 14,
                    height: 14,
                    background: cssColor(raw),
                    border: isSelected
                      ? "2px solid var(--color-accent)"
                      : "1.5px solid rgba(0,0,0,.15)",
                    outline: isSelected
                      ? "2px solid color-mix(in srgb, var(--color-accent) 35%, transparent)"
                      : "none",
                    outlineOffset: 1,
                  }}
                  aria-label={raw}
                  aria-pressed={isSelected}
                />
              );
            })}
            {extraColors > 0 && (
              <span className="text-[9px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                +{extraColors}
              </span>
            )}
          </div>
        )}

        {hasSizes && (
          <div className="relative mt-1" ref={sizeRef}>
            <button
              type="button"
              onClick={() => setShowSizes((s) => !s)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
              style={{
                background: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span>{selectedSize ?? "Select size"}</span>
              <ChevronDown
                className="size-3 transition-transform duration-150"
                style={{ transform: showSizes ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {showSizes && (
              <div
                className="absolute inset-x-0 top-full z-20 mt-0.5 overflow-hidden rounded-md shadow-lg"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {sizeOptions.map((size) => {
                  const matchesColor = (v: DbVariant) =>
                    !selectedColor || getColorValue(getOptions(v)) === selectedColor;
                  const available = variants.some(
                    (v) =>
                      v.is_active &&
                      getOptions(v)[sizeKey!] === size &&
                      matchesColor(v)
                  );
                  if (!available) return null;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setSelectedSize(size); setShowSizes(false); }}
                      className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold transition-colors"
                      style={{
                        color: selectedSize === size
                          ? "var(--color-accent)"
                          : "var(--color-text-primary)",
                        background: selectedSize === size
                          ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                          : "transparent",
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
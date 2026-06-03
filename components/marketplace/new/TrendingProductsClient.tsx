"use client";

import { useState } from "react";
import { Heart, Star, DollarSign, Play, Flame, Sparkles, TrendingUp, Warehouse, MapPin } from "lucide-react";
import Link from "next/link";
import { type DbProduct, getImage, getDiscount, fmtPrice, fmtCount } from "@/lib/utils";

const TABS = [
  { label: "Trending",        icon: Flame,      filter: (p: DbProduct) => true                              },
  { label: "New Arrivals",    icon: Sparkles,   filter: (p: DbProduct) => true                              },
  { label: "Best Selling",    icon: TrendingUp, filter: (p: DbProduct) => (p.sale_count ?? 0) > 0          },
  { label: "Free Shipping",   icon: Warehouse,  filter: (p: DbProduct) => p.is_free_shipping === true       },
  { label: "Digital",         icon: MapPin,     filter: (p: DbProduct) => p.product_type === "digital"      },
];

export function TrendingProductsClient({ products }: { products: DbProduct[] }) {
  const [activeTab,  setActiveTab]  = useState(0);
  const [favorites,  setFavorites]  = useState<Set<string>>(new Set());

  const filtered = products.filter(TABS[activeTab].filter);

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <>
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t, i) => {
          const active = activeTab === i;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => setActiveTab(i)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: active
                  ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                  : "transparent",
                color:      active ? "var(--color-accent)" : "var(--color-text-muted)",
                border:     active
                  ? "1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)"
                  : "1px solid transparent",
              }}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl border-dashed px-6 py-12 text-center"
          style={{ border: "1px dashed var(--color-border)", background: "var(--color-surface-secondary)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            No products in this category yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              isFav={favorites.has(p.id)}
              onToggleFav={() => toggleFav(p.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ProductCard({
  p,
  isFav,
  onToggleFav,
}: {
  p: DbProduct;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  const discount = getDiscount(p);
  const earn     = p.affiliate_commission_rate
    ? `Earn ${fmtPrice(p.price * (p.affiliate_commission_rate / 100))}`
    : null;

  return (
    <div
      className="group flex flex-col rounded-xl p-2 sm:p-2.5 transition-shadow hover:shadow-md"
      style={{
        background: "var(--color-surface)",
        border:     "1px solid var(--color-border)",
      }}
    >
      {/* Image */}
      <div className="relative">
        <Link href={`/marketplace/${p.slug}`} className="block">
          <div
            className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg"
            style={{ background: "var(--color-surface-secondary)" }}
          >
            <img
              src={getImage(p.images)}
              alt={p.name}
              width={512}
              height={512}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain object-center p-1.5 transition-transform group-hover:scale-105"
            />
          </div>
        </Link>

        {/* Discount badge */}
        {discount && (
          <span
            className="absolute left-2 top-2 z-10 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ background: "var(--color-accent)" }}
          >
            {discount}
          </span>
        )}

        {/* Wishlist button */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleFav(); }}
          className="absolute right-2 top-2 z-10 grid size-6 place-items-center rounded-full shadow transition-transform hover:scale-110"
          style={{
            background: "var(--color-surface)",
            border:     "1px solid var(--color-border)",
          }}
          aria-label={isFav ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className="size-3.5 transition-colors"
            style={{ color: isFav ? "var(--color-accent)" : "var(--color-text-muted)" }}
            fill={isFav ? "var(--color-accent)" : "none"}
          />
        </button>

        {/* Video indicator */}
        <span className="absolute bottom-2 left-2 z-10 grid size-6 place-items-center rounded-full bg-black/50">
          <Play className="size-3 fill-white text-white" />
        </span>
      </div>

      {/* Info */}
      <Link href={`/products/${p.slug}`} className="mt-2 flex flex-col gap-1">
        <h4
          className="truncate text-xs font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {p.name}
        </h4>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>
            {fmtPrice(p.price)}
          </span>
          {p.compare_at_price && p.compare_at_price > p.price && (
            <span className="text-[11px] line-through" style={{ color: "var(--color-text-muted)" }}>
              {fmtPrice(p.compare_at_price)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
            <Star className="size-3 fill-current" style={{ color: "var(--color-accent)" }} />
            {p.rating?.toFixed(1) ?? "—"} ({fmtCount(p.review_count)})
          </span>
          {p.is_free_shipping && (
            <span className="font-medium" style={{ color: "var(--color-success)" }}>Free ship</span>
          )}
        </div>
      </Link>

      {/* Affiliate earn badge */}
      {earn && (
        <div
          className="mt-2 flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-bold"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
            color:      "var(--color-accent)",
          }}
        >
          <DollarSign className="size-3" /> {earn}
        </div>
      )}

      {/* Quick shop button — appears on hover */}
      <Link
        href={`/products/${p.slug}`}
        className="mt-2 hidden w-full rounded-lg py-1.5 text-center text-xs font-bold text-white transition-opacity hover:opacity-90 group-hover:block"
        style={{ background: "var(--color-accent)" }}
      >
        View Product
      </Link>
    </div>
  );
}
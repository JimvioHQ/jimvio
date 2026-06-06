"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Zap, DollarSign, ShieldCheck, BadgeDollarSign,
  CircleCheck, Truck, Users, ChevronRight, ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FlashDealsClient } from "./FlashDealsClient";
import { TrendingProductsClient } from "./TrendingProductsClient";
import { FlashDealsCountdown } from "./FlashDealsCountdown";
import { LiveActivityBar } from "./Liveactivitybar";
import { HeroBannerView } from "./HeroBannerView";
import type { HeroProduct } from "@/types";
import { useMarketplace } from "./marketplace-context";
import { fmtPrice, fmtCount } from "@/lib/utils";
import type { DbProduct } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

type ProductType = "physical" | "digital";

type DbCategory = {
  id: string;
  name: string;
  slug: string;
  product_count: number | null;
  image_url: string | null;
  tint_color: string | null;
};

type Stats = {
  viewers_now:     number;
  revenue_today:   number;
  creators_active: number;
};

type Props = {
  initialType:         "physical" | "digital";
  initialListingCount: number;
  initialFlashDeals:   DbProduct[];
  initialTrending:     DbProduct[];
  initialCategories:   DbCategory[];
  initialStats:        Stats;
  heroPhysical:        HeroProduct[] | null;
  heroDigital:         HeroProduct[] | null;
};

const BADGES = [
  { icon: ShieldCheck,     title: "Secure Payments",    sub: "100% safe & secure"   },
  { icon: BadgeDollarSign, title: "Buyer Protection",   sub: "Money-back guarantee" },
  { icon: CircleCheck,     title: "Verified Suppliers", sub: "Trusted & reliable"   },
  { icon: Truck,           title: "Fast Delivery",      sub: "Worldwide shipping"   },
];

// ─── CategoryImage — image with emoji fallback ────────────────────────────────

function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("electron"))      return "⚡";
  if (n.includes("phone") || n.includes("smartphone") || n.includes("mobile")) return "📱";
  if (n.includes("tablet"))        return "📱";
  if (n.includes("laptop") || n.includes("computer")) return "💻";
  if (n.includes("fashion") || n.includes("cloth") || n.includes("wear")) return "👗";
  if (n.includes("shoe") || n.includes("sneaker") || n.includes("basketball shoe")) return "👟";
  if (n.includes("jacket") || n.includes("coat") || n.includes("outerwear")) return "🧥";
  if (n.includes("t-shirt") || n.includes("tee") || n.includes("tops")) return "👕";
  if (n.includes("dress"))         return "👗";
  if (n.includes("pant") || n.includes("jean") || n.includes("trouser")) return "👖";
  if (n.includes("cap") || n.includes("hat"))  return "🧢";
  if (n.includes("beauty") || n.includes("makeup") || n.includes("cosmetic")) return "💄";
  if (n.includes("hair"))          return "💇";
  if (n.includes("health") || n.includes("wellness")) return "💊";
  if (n.includes("home") || n.includes("living") || n.includes("household")) return "🏠";
  if (n.includes("kitchen") || n.includes("cookware")) return "🍳";
  if (n.includes("furniture") || n.includes("sofa")) return "🛋️";
  if (n.includes("sport") || n.includes("fitness") || n.includes("gym")) return "⚽";
  if (n.includes("basketball"))    return "🏀";
  if (n.includes("outdoor") || n.includes("camping")) return "🏕️";
  if (n.includes("toy") || n.includes("kids") || n.includes("children")) return "🧸";
  if (n.includes("baby"))          return "🍼";
  if (n.includes("auto") || n.includes("car") || n.includes("vehicle")) return "🚗";
  if (n.includes("tool") || n.includes("hardware")) return "🔧";
  if (n.includes("garden") || n.includes("plant")) return "🌱";
  if (n.includes("office") || n.includes("stationery")) return "💼";
  if (n.includes("book") || n.includes("ebook")) return "📚";
  if (n.includes("gaming") || n.includes("game")) return "🎮";
  if (n.includes("watch"))         return "⌚";
  if (n.includes("jewel") || n.includes("ring") || n.includes("earring") || n.includes("necklace")) return "💎";
  if (n.includes("bag") || n.includes("backpack") || n.includes("purse")) return "👜";
  if (n.includes("air condition") || n.includes("conditioning")) return "❄️";
  if (n.includes("printer") || n.includes("3d")) return "🖨️";
  if (n.includes("packaging"))     return "📦";
  if (n.includes("wool") || n.includes("blend")) return "🧶";
  if (n.includes("course") || n.includes("education")) return "🎓";
  if (n.includes("design") || n.includes("creative") || n.includes("template")) return "🎨";
  if (n.includes("marketing"))     return "📣";
  if (n.includes("software") || n.includes("saas") || n.includes("ai")) return "💡";
  if (n.includes("music") || n.includes("audio")) return "🎵";
  return "🏷️";
}

// Tint colors per category name for cards without tint_color set
function getCategoryTint(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("electron") || n.includes("phone") || n.includes("tablet") || n.includes("computer")) return "#eef6ff";
  if (n.includes("fashion") || n.includes("cloth") || n.includes("dress") || n.includes("wear") || n.includes("tops")) return "#fff5f9";
  if (n.includes("beauty") || n.includes("hair") || n.includes("makeup")) return "#fff0f5";
  if (n.includes("home") || n.includes("garden") || n.includes("furniture") || n.includes("kitchen")) return "#f0fff8";
  if (n.includes("sport") || n.includes("fitness") || n.includes("outdoor") || n.includes("basketball")) return "#f0fff4";
  if (n.includes("toy") || n.includes("kids") || n.includes("baby")) return "#fffbf0";
  if (n.includes("jewel") || n.includes("watch") || n.includes("ring") || n.includes("necklace") || n.includes("earring")) return "#fffff0";
  if (n.includes("bag") || n.includes("backpack") || n.includes("packaging")) return "#fff8f0";
  if (n.includes("auto") || n.includes("car")) return "#f5f5ff";
  if (n.includes("book") || n.includes("course") || n.includes("education")) return "#f5f0ff";
  if (n.includes("software") || n.includes("digital") || n.includes("ai")) return "#f0f0ff";
  if (n.includes("shoe") || n.includes("sneaker")) return "#fff0ee";
  if (n.includes("pant") || n.includes("cap") || n.includes("hat") || n.includes("jacket")) return "#f5faff";
  return "#f8f8f8";
}

function CategoryCard({ c }: { c: DbCategory }) {
  const [imgErr, setImgErr] = useState(false);
  const showImg  = c.image_url && !imgErr;
  const tintBg   = c.tint_color ?? getCategoryTint(c.name);

  return (
    <a
      href={`/marketplace?category=${c.slug}`}
      className="group relative flex flex-col justify-end overflow-hidden rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        height:     110,
        background: tintBg,
        border:     "1px solid var(--color-border)",
      }}
    >
      {/* Image — large, right side */}
      {showImg && (
        <div className="absolute bottom-0 right-0 top-0 flex w-[60%] items-center justify-end">
          <img
            src={c.image_url!}
            alt={c.name}
            width={80}
            height={80}
            loading="lazy"
            className="mr-2 h-16 w-16 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
            onError={() => setImgErr(true)}
          />
        </div>
      )}

      {/* Text — bottom left, always above image */}
      <div className="relative z-10 p-2.5 pt-0">
        <div
          className="line-clamp-2 text-[11px] font-black leading-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          {c.name}
        </div>
        <div className="mt-0.5 text-[9px]" style={{ color: "var(--color-text-muted)" }}>
          {c.product_count != null && c.product_count > 0
            ? `${fmtCount(c.product_count)}+ products`
            : "Browse"}
        </div>
      </div>
    </a>
  );
}

function CategoryImage({ name, imageUrl, size = "sm" }: {
  name:      string;
  imageUrl:  string | null;
  size?:     "sm" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const emoji    = getCategoryEmoji(name);
  const isSvg    = imageUrl?.endsWith(".svg");
  const showImage = imageUrl && !imgError;
  const dim      = size === "lg" ? 80 : 44;
  const emojiCls = size === "lg" ? "text-5xl" : "text-2xl";

  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{ width: dim, height: dim }}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={name}
          width={dim}
          height={dim}
          loading="lazy"
          className="h-full w-full object-contain transition-transform group-hover:scale-105"
          style={{ imageRendering: isSvg ? "auto" : undefined }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className={`${emojiCls} leading-none transition-transform group-hover:scale-105 select-none`}
          role="img"
          aria-label={name}
        >
          {emoji}
        </span>
      )}
    </div>
  );
}

export function MarketplacePageClient({
  initialType,
  initialListingCount,
  initialFlashDeals,
  initialTrending,
  initialCategories,
  initialStats,
  heroPhysical,
  heroDigital,
}: Props) {
  const supabase = createClient();

  // ── Marketplace context (sidebar filters) ────────────────────────────────
  const { filters, setCategory } = useMarketplace();

  const router       = useRouter();
  const searchParams = useSearchParams();

  // Read type from URL, default to physical
  const urlType = (searchParams.get("type") as ProductType | null);
  const [type, setType] = useState<ProductType>(
    urlType === "digital" ? "digital" : urlType === "physical" ? "physical" : initialType
  );

  // Sync URL when type changes
  function handleTypeChange(t: ProductType) {
    setType(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", t);
    router.replace(`/marketplace?${params.toString()}`, { scroll: false });
  }
  const [search,       setSearch]       = useState("");
  const [flashDeals,   setFlashDeals]   = useState<DbProduct[]>(initialFlashDeals);
  const [trending,     setTrending]     = useState<DbProduct[]>(initialTrending);
  const [categories,   setCategories]   = useState<DbCategory[]>(initialCategories);
  const [stats,        setStats]        = useState<Stats>(initialStats);
  const [loading,      setLoading]      = useState(false);
  const [listingCount, setListingCount] = useState(initialListingCount);

  // Use a ref to avoid supabase client recreating on every render
  const supabaseRef = useRef(supabase);

  // ── Re-fetch when type OR sidebar filters change ──────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);

      const typeFilter = type === "digital"
        ? (["digital", "course", "ebook", "software", "template", "coaching"] as const)
        : (["physical"] as const);

      // Build shipping_from filter from sidebar
      const hasShipping  = filters.shippingFrom.length > 0;
      const hasDelivery  = filters.deliveryTimes.length > 0;
      const hasPriceMax  = filters.priceRange[1] < 5000;
      const hasPriceMin  = filters.priceRange[0] > 0;
      const hasRating    = filters.minRating > 0;
      const hasCategory  = filters.category && filters.category !== "Trending Now";

      // Resolve category name → category_id for DB filtering
      let categoryId: string | null = null;
      if (hasCategory) {
        const { data: catRow } = await supabaseRef.current
          .from("product_categories")
          .select("id")
          .ilike("name", filters.category)
          .single();
        categoryId = catRow?.id ?? null;
      }

      function applyFilters(q: any): any {
        if (hasShipping)           q = q.in("shipping_from", filters.shippingFrom);
        if (hasDelivery)           q = q.in("delivery_time", filters.deliveryTimes);
        if (hasPriceMax)           q = q.lte("price", filters.priceRange[1]);
        if (hasPriceMin)           q = q.gte("price", filters.priceRange[0]);
        if (hasRating)             q = q.gte("rating", filters.minRating);
        if (categoryId)            q = q.eq("category_id", categoryId);
        return q;
      }

      const [{ data: deals }, { data: trend }, { count }] = await Promise.all([
        // Flash deals — if none exist, component falls back to trending
        applyFilters(
          supabaseRef.current
            .from("products")
            .select(`
              id, name, slug, price, compare_at_price, images, product_type,
              status, is_flash_deal, discount_label, shipping_from,
              delivery_time, affiliate_commission_rate, sold_count,
              claimed_pct, rating, review_count, is_free_shipping, category_id
            `)
            .eq("status", "active")
            .eq("is_active", true)
            .is("deleted_at", null)
            .in("product_type", [...typeFilter])
            .or("is_flash_deal.eq.true,compare_at_price.not.is.null")
            .order("is_flash_deal", { ascending: false })
            .order("view_count",    { ascending: false })
            .limit(12)
        ),

        applyFilters(
          supabaseRef.current
            .from("products")
            .select(`
              id, name, slug, price, compare_at_price, images, product_type,
              status, is_flash_deal, discount_label, shipping_from,
              delivery_time, affiliate_commission_rate, sale_count,
              rating, review_count, is_free_shipping, category_id
            `)
            .eq("status", "active")
            .eq("is_active", true)
            .is("deleted_at", null)
            .in("product_type", [...typeFilter])
            .order("view_count", { ascending: false })
            .limit(48)
        ),

        applyFilters(
          supabaseRef.current
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("status", "active")
            .eq("is_active", true)
            .is("deleted_at", null)
            .in("product_type", [...typeFilter])
        ),
      ]);

      setFlashDeals((deals ?? []) as DbProduct[]);
      setTrending((trend   ?? []) as DbProduct[]);
      setListingCount(count ?? 0);
      setLoading(false);
    }

    load();
  // Re-run when type switches OR when sidebar Apply is clicked (filters change)
  }, [type, filters]);

  // ── Client-side search filter ─────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const filteredTrending = q ? trending.filter((p) => p.name.toLowerCase().includes(q)) : trending;
  const filteredDeals    = q ? flashDeals.filter((p) => p.name.toLowerCase().includes(q)) : flashDeals;

  return (
    <div className="flex gap-4">
      {/* Sidebar — receives current type */}
      <Sidebar type={type} />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
      {/* ── Search bar + type switcher ── */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            type === "digital"
              ? "Search for digital products, tools, software & more..."
              : "Search for physical products & gear..."
          }
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border p-1">
          {(["physical", "digital"] as ProductType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className="rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-all"
              style={{
                background: type === t ? "var(--color-accent)" : "transparent",
                color:      type === t ? "white" : "var(--color-text-muted)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <span
          className="hidden shrink-0 items-center gap-1.5 text-xs sm:flex"
          style={{ color: "var(--color-text-muted)" }}
        >
          <span className="size-1.5 rounded-full bg-green-500" />
          {listingCount} listings
        </span>
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="flex flex-col gap-4">
          <div className="h-12 animate-pulse rounded-2xl" style={{ background: "var(--color-surface)" }} />
          <div className="h-48 animate-pulse rounded-2xl" style={{ background: "var(--color-surface)" }} />
          <div className="h-32 animate-pulse rounded-2xl" style={{ background: "var(--color-surface)" }} />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Hero banner — changes with type ── */}
          <HeroBannerView physical={heroPhysical} digital={heroDigital} initialType={type} />

          {/* ── Trust badges ── */}
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl p-2.5"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}
          >
            {BADGES.map((b) => (
              <div key={b.title} className="flex min-w-[140px] flex-1 items-center gap-2.5">
                <b.icon className="size-5 shrink-0" style={{ color: "var(--color-accent)" }} />
                <div>
                  <div className="text-xs font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>{b.title}</div>
                  <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{b.sub}</div>
                </div>
              </div>
            ))}
            <div className="hidden items-center gap-1.5 border-l pl-3 xl:flex" style={{ borderColor: "var(--color-border)" }}>
              <DollarSign className="size-4" style={{ color: "var(--color-accent)" }} />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Revenue today:{" "}
                <b className="font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {fmtPrice(stats.revenue_today)}
                </b>
              </span>
            </div>
            <div className="hidden items-center gap-1.5 border-l pl-3 xl:flex" style={{ borderColor: "var(--color-border)" }}>
              <Users className="size-4" style={{ color: "var(--color-accent)" }} />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                <b className="font-bold" style={{ color: "var(--color-text-primary)" }}>{stats.creators_active}</b> creators active
              </span>
            </div>
          </div>

          {/* ── Flash Deals — always shown, falls back to top products ── */}
          <section
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-2 text-white"
              style={{ background: "linear-gradient(90deg, var(--color-accent) 0%, #ff8c00 100%)" }}
            >
              <div className="flex items-center gap-2">
                <Zap className="size-4 fill-current" />
                <span className="font-bold">Flash Deals</span>
                <span className="hidden text-xs text-white/80 sm:inline">
                  Limited time offers – Don&apos;t miss out!
                </span>
              </div>
              <div className="flex items-center gap-4">
                <FlashDealsCountdown />
                <button type="button" className="flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white">
                  View All Deals <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="p-2">
              {filteredDeals.length > 0 ? (
                <FlashDealsClient deals={filteredDeals} />
              ) : (
                /* Fallback — show top trending as deals when no flash deals set */
                filteredTrending.length > 0 ? (
                  <FlashDealsClient deals={filteredTrending.slice(0, 12)} />
                ) : (
                  <p className="py-6 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                    No deals available right now — check back soon
                  </p>
                )
              )}
            </div>
          </section>

          {/* ── Shop by Category ── */}
          {categories.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-lg font-black">Shop by Category</h2>
                <button className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                  Explore top categories
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {categories.map((c) => <CategoryCard key={c.id} c={c} />)}
              </div>
            </section>
          )}

          {/* ── Trending Products ── */}
          <section>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black">
                {filters.category && filters.category !== "Trending Now"
                  ? filters.category
                  : `Trending ${type === "digital" ? "Digital " : ""}Products`}
              </h2>
              {filters.category && filters.category !== "Trending Now" && (
                <button
                  type="button"
                  onClick={() => setCategory("Trending Now")}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  ✕ Clear
                </button>
              )}
              <button
                type="button"
                className="ml-auto flex items-center gap-1 text-xs font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                View all <ArrowRight className="size-3.5" />
              </button>
            </div>
            {filteredTrending.length === 0 ? (
              <div
                className="rounded-xl border-dashed px-6 py-12 text-center"
                style={{ border: "1px dashed var(--color-border)", background: "var(--color-surface-secondary)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                  No products match your filters
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Try adjusting or clearing your filters
                </p>
              </div>
            ) : (
              <TrendingProductsClient products={filteredTrending} type={type} />
            )}
          </section>

          <LiveActivityBar />
        </>
      )}
      </div>
    </div>
  );
}
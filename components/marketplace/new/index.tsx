import { createClient } from "@/lib/supabase/server";
import {
  Zap, DollarSign, Star, ShieldCheck, BadgeDollarSign,
  CircleCheck, Truck, Users, Sparkles, TrendingUp,
  Warehouse, MapPin, Flame, ChevronRight, ArrowRight,
} from "lucide-react";
import { FlashDealsClient } from "./FlashDealsClient";
import { FlashDealsCountdown } from "./FlashDealsCountdown";
import { TrendingProductsClient } from "./TrendingProductsClient";

// ─── Types ────────────────────────────────────────────────────────────────────

import {
  type DbProduct,
  fmtPrice,
  fmtCount,
  isRenderableUrl,
  getImage,
  getDiscount,
} from "@/lib/utils";
import { LiveActivityBar } from "./Liveactivitybar";
export type { DbProduct };

type DbCategory = {
  id: string;
  name: string;
  slug: string;
  product_count: number | null;
  image_url: string | null;
  tint_color: string | null;
  icon: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────



// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchMarketplaceData() {
  const supabase = await createClient();

  const [
    { data: flashDealsRaw },
    { data: trendingRaw },
    { data: categoriesRaw },
    { data: revenueRaw },
    { data: viewerCountRaw },
    { count: creatorsActive },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id, name, slug, price, currency, compare_at_price, images, product_type,
        status, is_flash_deal, discount_label, shipping_from,
        delivery_time, affiliate_commission_rate, sold_count, sale_count,
        claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id,
        view_count, vendors(id, verification_status)
      `)
      .eq("is_flash_deal", true)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("view_count", { ascending: false })
      .limit(12),

    supabase
      .from("products")
      .select(`
        id, name, slug, price, currency, compare_at_price, images, product_type,
        status, is_flash_deal, discount_label, shipping_from,
        delivery_time, affiliate_commission_rate, sale_count,
        rating, review_count, is_free_shipping, vendor_id, category_id,
        view_count, sold_count, claimed_pct, vendors(id, verification_status)
      `)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("view_count", { ascending: false })
      .limit(48),

    supabase
      .from("product_categories")
      .select("id, name, slug, product_count, image_url, tint_color, icon")
      .eq("is_active", true)
      .eq("visible", true)
      .is("parent_id", null)
      .order("sort_order")
      .limit(7),

    supabase
      .from("orders")
      .select("total_amount")
      .eq("payment_status", "paid")
      .gte("paid_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

    supabase
      .from("product_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),

    supabase
      .from("short_videos")
      .select("creator_id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const revenueToday = (revenueRaw ?? []).reduce(
    (sum: number, o: { total_amount: number | null }) => sum + (o.total_amount ?? 0), 0,
  );

  return {
    flashDeals: (flashDealsRaw ?? []) as DbProduct[],
    trending: (trendingRaw ?? []) as DbProduct[],
    categories: (categoriesRaw ?? []) as DbCategory[],
    stats: {
      viewers_now: (viewerCountRaw as { count?: number } | null)?.count ?? 0,
      revenue_today: revenueToday,
      creators_active: creatorsActive ?? 0,
    },
  };
}

// ─── TrustBadges (static, server) ────────────────────────────────────────────

const BADGES = [
  { icon: ShieldCheck, title: "Secure Payments", sub: "100% safe & secure", color: "var(--color-accent)" },
  { icon: BadgeDollarSign, title: "Buyer Protection", sub: "Money-back guarantee", color: "var(--color-success)" },
  { icon: CircleCheck, title: "Verified Suppliers", sub: "Trusted & reliable", color: "var(--color-success)" },
  { icon: Truck, title: "Fast Delivery", sub: "Worldwide shipping", color: "var(--color-accent)" },
];

function TrustBadgesSection({
  stats,
}: {
  stats: { viewers_now: number; revenue_today: number; creators_active: number };
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl p-3"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {BADGES.map((b) => (
        <div key={b.title} className="flex min-w-[140px] flex-1 items-center gap-2.5">
          <b.icon className="size-6 shrink-0" style={{ color: b.color }} />
          <div>
            <div className="text-sm font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
              {b.title}
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{b.sub}</div>
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
          <b className="font-bold" style={{ color: "var(--color-text-primary)" }}>{stats.creators_active}</b>{" "}
          creators active
        </span>
      </div>
    </div>
  );
}

// ─── FlashDeals header (server) + scroll strip (client) ──────────────────────

function FlashDealsSection({ deals }: { deals: DbProduct[] }) {
  return (
    <section
      className="overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 text-white"
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
      <div className="p-3">
        {deals.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No flash deals available right now
          </p>
        ) : (
          <FlashDealsClient deals={deals} />
        )}
      </div>
    </section>
  );
}

// ─── ShopByCategory (server) ──────────────────────────────────────────────────

function ShopByCategorySection({ categories }: { categories: DbCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-black">Shop by Category</h2>
        <button className="text-xs font-semibold text-primary">Explore top categories</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {categories.map((c) => (
          <a
            key={c.id}
            href={`/marketplace?category=${c.slug}`}
            className="group flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-border p-3 text-left transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: c.tint_color ?? undefined }}
          >
            <div>
              <div className="text-sm font-bold leading-tight text-foreground">{c.name}</div>
              <div className="text-[11px] text-foreground/60">
                {c.product_count ? `${fmtCount(c.product_count)}+ products` : ""}
              </div>
            </div>
            {c.image_url && (
              <img
                src={c.image_url}
                alt={c.name}
                width={512}
                height={512}
                loading="lazy"
                decoding="async"
                className="size-11 shrink-0 object-contain object-center transition-transform group-hover:scale-110 sm:size-14 lg:size-16"
              />
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

// ─── TrendingProducts (client for tabs + wishlist) ────────────────────────────

export const TRENDING_TABS = [
  { label: "Trending", icon: Flame },
  { label: "New Arrivals", icon: Sparkles },
  { label: "Best Selling", icon: TrendingUp },
  { label: "Free Shipping", icon: Warehouse },
  { label: "Local Warehouse", icon: MapPin },
];

function TrendingProductsSection({ products }: { products: DbProduct[] }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black" style={{ color: "var(--color-text-primary)" }}>
          Trending Products
        </h2>
        <button
          type="button"
          className="ml-auto flex items-center gap-1 text-xs font-semibold"
          style={{ color: "var(--color-accent)" }}
        >
          View all <ArrowRight className="size-3.5" />
        </button>
      </div>
      <TrendingProductsClient products={products} />
    </section>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────

export async function MarketplaceData() {
  const { flashDeals, trending, categories, stats } = await fetchMarketplaceData();
  return (
    <>
      <TrustBadgesSection stats={stats} />
      <FlashDealsSection deals={flashDeals} />
      <ShopByCategorySection categories={categories} />
      <TrendingProductsSection products={trending} />
      <LiveActivityBar />
    </>
  );
}
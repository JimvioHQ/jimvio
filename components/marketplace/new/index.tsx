import { createClient } from "@/lib/supabase/server";
import {
  Radio, Gift, Package, ArrowRight, ChevronRight, Zap,
  DollarSign, Play, Star, ShieldCheck, BadgeDollarSign,
  CircleCheck, Truck, Users, Sparkles, TrendingUp,
  Warehouse, MapPin, Flame,
} from "lucide-react";

// ─── Types (matched to real schema) ──────────────────────────────────────────

type DbProduct = {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  images: unknown;                   // jsonb — could be string[] or null
  product_type: string;              // enum: physical | digital | ...
  status: string;                    // enum: active | draft | ...
  is_flash_deal: boolean | null;
  discount_label: string | null;
  shipping_from: string | null;
  delivery_time: string | null;
  affiliate_commission_rate: number | null;
  view_count: number | null;
  sale_count: number | null;
  sold_count: number | null;
  claimed_pct: number | null;
  rating: number | null;
  review_count: number | null;
  is_free_shipping: boolean | null;
  category_id: string | null;
};

type DbCategory = {
  id: string;
  name: string;
  slug: string;
  product_count: number | null;
  image_url: string | null;
  tint_color: string | null;
  icon: string | null;
};

// activity derived from recent orders + short_videos
type ActivityItem = {
  id: string;
  kind: "purchase" | "video" | "campaign";
  actor: string;
  country: string | null;
  description: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(amount: number | null | undefined): string {
  if (!amount) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function fmtCount(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function getImage(images: unknown): string {
  if (!images) return "/placeholder.png";
  if (Array.isArray(images) && images.length > 0) return String(images[0]);
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) return String(parsed[0]);
    } catch {}
    return images;
  }
  return "/placeholder.png";
}

function getDiscount(p: DbProduct): string {
  if (p.discount_label) return p.discount_label;
  if (p.compare_at_price && p.price && p.compare_at_price > p.price) {
    const pct = Math.round((1 - p.price / p.compare_at_price) * 100);
    return `-${pct}%`;
  }
  return "";
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchMarketplaceData() {
  const supabase = await createClient();

  const [
    { data: flashDealsRaw },
    { data: trendingRaw },
    { data: categoriesRaw },
    { data: recentOrdersRaw },
    { data: recentVideosRaw },
    { data: viewerCountRaw },
  ] = await Promise.all([
    // Flash deals
    supabase
      .from("products")
      .select(`
        id, name, price, compare_at_price, images, product_type,
        status, is_flash_deal, discount_label, shipping_from,
        delivery_time, affiliate_commission_rate, sold_count,
        claimed_pct, rating, review_count, is_free_shipping, category_id
      `)
      .eq("is_flash_deal", true)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("view_count", { ascending: false })
      .limit(12),

    // Trending products (non-flash, ordered by view_count)
    supabase
      .from("products")
      .select(`
        id, name, price, compare_at_price, images, product_type,
        status, is_flash_deal, discount_label, shipping_from,
        delivery_time, affiliate_commission_rate, sale_count,
        rating, review_count, is_free_shipping, category_id
      `)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("view_count", { ascending: false })
      .limit(24),

    // Categories from product_categories
    supabase
      .from("product_categories")
      .select("id, name, slug, product_count, image_url, tint_color, icon")
      .eq("is_active", true)
      .eq("visible", true)
      .order("sort_order")
      .limit(7),

    // Recent orders for activity feed
    supabase
      .from("orders")
      .select(`
        id,
        profiles!buyer_id ( full_name, country ),
        order_items ( product_name )
      `)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(4),

    // Recent short videos for activity feed
    supabase
      .from("short_videos")
      .select("id, title, profiles!user_id ( full_name )")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(2),

    // Approximate viewer count: products viewed in last hour
    supabase
      .from("product_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),
  ]);

  // Build activity items from real orders
  const activities: ActivityItem[] = [];

  for (const order of recentOrdersRaw ?? []) {
    const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
    const item = Array.isArray(order.order_items) ? order.order_items[0] : null;
    if (!profile || !item) continue;
    activities.push({
      id: order.id,
      kind: "purchase",
      actor: (profile as any).full_name ?? "Someone",
      country: (profile as any).country ?? null,
      description: `purchased ${(item as any).product_name}`,
    });
  }

  for (const vid of recentVideosRaw ?? []) {
    const profile = Array.isArray(vid.profiles) ? vid.profiles[0] : vid.profiles;
    activities.push({
      id: vid.id,
      kind: "video",
      actor: (profile as any)?.full_name ?? "A creator",
      country: null,
      description: `posted a video: ${vid.title}`,
    });
  }

  // Revenue today from paid orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: revenueRaw } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("payment_status", "paid")
    .gte("paid_at", today.toISOString());

  const revenueToday = (revenueRaw ?? []).reduce(
    (sum, o) => sum + (o.total_amount ?? 0),
    0,
  );

  // Active creators (influencers with videos this week)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: creatorsActive } = await supabase
    .from("short_videos")
    .select("creator_id", { count: "exact", head: true })
    .eq("status", "active")
    .gte("created_at", weekAgo);

  return {
    flashDeals: (flashDealsRaw ?? []) as DbProduct[],
    trending: (trendingRaw ?? []) as DbProduct[],
    categories: (categoriesRaw ?? []) as DbCategory[],
    activities,
    stats: {
      viewers_now: (viewerCountRaw as any)?.count ?? 0,
      revenue_today: revenueToday,
      creators_active: creatorsActive ?? 0,
    },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductCard({ p }: { p: DbProduct }) {
  const discount = getDiscount(p);
  const earn = p.affiliate_commission_rate
    ? `Earn ${fmtPrice(p.price * (p.affiliate_commission_rate / 100))}`
    : null;

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-2 sm:p-2.5 transition-shadow hover:shadow-[var(--shadow-card)]">
      <div className="relative">
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted/50">
          <img
            src={getImage(p.images)}
            alt={p.name}
            width={512}
            height={512}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain object-center p-1.5"
          />
        </div>
        {discount && (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {discount}
          </span>
        )}
        <span className="absolute bottom-2 left-2 z-10 grid size-6 place-items-center rounded-full bg-black/50 text-white">
          <Play className="size-3 fill-current" />
        </span>
      </div>
      <h4 className="mt-2 truncate text-xs font-bold">{p.name}</h4>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-sm font-black text-primary">{fmtPrice(p.price)}</span>
        {p.compare_at_price && p.compare_at_price > p.price && (
          <span className="text-[11px] text-muted-foreground line-through">
            {fmtPrice(p.compare_at_price)}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Star className="size-3 fill-accent text-accent" />
          {p.rating?.toFixed(1) ?? "—"} ({fmtCount(p.review_count)})
        </span>
        {p.is_free_shipping && (
          <span className="font-medium text-success">Free shipping</span>
        )}
      </div>
      {earn && (
        <div className="mt-2 flex items-center justify-center gap-1 rounded-md bg-accent/10 py-1 text-[11px] font-bold text-accent">
          <DollarSign className="size-3" /> {earn}
        </div>
      )}
    </div>
  );
}

function FlashDealCard({ d }: { d: DbProduct }) {
  const pct = d.claimed_pct ?? 0;
  const discount = getDiscount(d);
  const earn = d.affiliate_commission_rate
    ? `Earn ${fmtPrice(d.price * (d.affiliate_commission_rate / 100))}`
    : null;

  return (
    <div className="group relative w-[42vw] max-w-[180px] shrink-0 rounded-xl border border-border bg-card p-2 sm:w-[160px] sm:p-2.5 md:w-[180px] transition-shadow hover:shadow-[var(--shadow-card)]">
      {discount && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          {discount}
        </span>
      )}
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted/50">
        <img
          src={getImage(d.images)}
          alt={d.name}
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain object-center p-1.5"
        />
      </div>
      <h4 className="mt-2 truncate text-xs font-bold">{d.name}</h4>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-sm font-black text-primary">{fmtPrice(d.price)}</span>
        {d.compare_at_price && d.compare_at_price > d.price && (
          <span className="text-[11px] text-muted-foreground line-through">
            {fmtPrice(d.compare_at_price)}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{fmtCount(d.sold_count ?? d.sale_count)} sold</span>
        {pct > 0 && <span>{pct}% claimed</span>}
      </div>
      {pct > 0 && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[image:var(--gradient-flash)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {earn && (
        <div className="mt-2 flex items-center justify-center gap-1 rounded-md bg-accent/10 py-1 text-[11px] font-bold text-accent">
          <DollarSign className="size-3" /> {earn}
        </div>
      )}
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function FlashDealsSection({ deals }: { deals: DbProduct[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between bg-[image:var(--gradient-flash)] px-4 py-2.5 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Zap className="size-4 fill-current" />
          <span className="font-bold">Flash Deals</span>
          <span className="hidden text-xs text-primary-foreground/85 sm:inline">
            Limited time offers – Don&apos;t miss out!
          </span>
        </div>
        <button type="button" className="flex items-center gap-1 text-xs font-semibold">
          View All Deals <ChevronRight className="size-3.5" />
        </button>
      </div>
      <div className="relative p-3">
        {deals.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No flash deals available right now
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {deals.map((d) => <FlashDealCard key={d.id} d={d} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function ShopByCategorySection({ categories }: { categories: DbCategory[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-black">Shop by Category</h2>
        <button className="text-xs font-semibold text-primary">Explore top categories</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {categories.map((c) => (
          <button
            key={c.id}
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
          </button>
        ))}
      </div>
    </section>
  );
}

const TABS = [
  { label: "Trending", icon: Flame },
  { label: "New Arrivals", icon: Sparkles },
  { label: "Best Selling", icon: TrendingUp },
  { label: "Free Warehouse", icon: Warehouse },
  { label: "Local Warehouse", icon: MapPin },
];

function TrendingProductsSection({ products }: { products: DbProduct[] }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black">Trending Products</h2>
        <div className="flex flex-wrap items-center gap-1">
          {TABS.map((t) => (
            <span
              key={t.label}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground"
            >
              <t.icon className="size-3.5" /> {t.label}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary"
        >
          View all products <ArrowRight className="size-3.5" />
        </button>
      </div>
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">No products available</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </section>
  );
}

const BADGES = [
  { icon: ShieldCheck, title: "Secure Payments", sub: "100% safe & secure", color: "text-primary" },
  { icon: BadgeDollarSign, title: "Buyer Protection", sub: "Money-back guarantee", color: "text-accent" },
  { icon: CircleCheck, title: "Verified Suppliers", sub: "Trusted & reliable", color: "text-success" },
  { icon: Truck, title: "Fast Delivery", sub: "Worldwide shipping", color: "text-[oklch(0.55_0.2_280)]" },
];

function TrustBadgesSection({
  stats,
}: {
  stats: { viewers_now: number; revenue_today: number; creators_active: number };
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
      {BADGES.map((b) => (
        <div key={b.title} className="flex min-w-[160px] flex-1 items-center gap-2.5">
          <b.icon className={`size-7 shrink-0 ${b.color}`} />
          <div>
            <div className="text-sm font-bold leading-tight">{b.title}</div>
            <div className="text-xs text-muted-foreground">{b.sub}</div>
          </div>
        </div>
      ))}
      <div className="hidden items-center gap-2 border-l border-border pl-3 xl:flex">
        <div className="flex -space-x-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-6 rounded-full border-2 border-card bg-[image:var(--gradient-cta)]" />
          ))}
        </div>
        <span className="text-xs">
          <b className="font-bold">{stats.viewers_now}</b>{" "}
          <span className="text-muted-foreground">people viewing now</span>
        </span>
      </div>
      <div className="hidden items-center gap-1.5 border-l border-border pl-3 xl:flex">
        <DollarSign className="size-5 text-accent" />
        <span className="text-xs">
          <b className="font-bold">{fmtPrice(stats.revenue_today)}</b>{" "}
          <span className="text-muted-foreground">generated today</span>
        </span>
      </div>
      <div className="hidden items-center gap-1.5 border-l border-border pl-3 xl:flex">
        <Users className="size-5 text-[oklch(0.55_0.2_280)]" />
        <span className="text-xs">
          <b className="font-bold">{stats.creators_active}</b>{" "}
          <span className="text-muted-foreground">creators promoting</span>
        </span>
      </div>
    </div>
  );
}

function LiveActivityBarSection({
  activities,
  viewersNow,
}: {
  activities: ActivityItem[];
  viewersNow: number;
}) {
  return (
    <div className="sticky bottom-0 z-40 mt-2">
      <div className="flex items-center gap-4 overflow-hidden rounded-2xl bg-[oklch(0.16_0.03_285)] px-4 py-2.5 text-primary-foreground shadow-[var(--shadow-card)]">
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold">
          <Radio className="size-3.5" /> Live Now
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 text-xs sm:flex">
          <span className="size-2 rounded-full bg-success" /> {viewersNow} people viewing now
        </span>
        <div className="flex flex-1 items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activities.map((a) => (
            <div key={a.id} className="flex shrink-0 items-center gap-2 text-xs">
              {a.kind === "purchase" ? (
                <span className="size-6 rounded-full bg-[image:var(--gradient-cta)]" />
              ) : a.kind === "campaign" ? (
                <Gift className="size-5 text-accent" />
              ) : (
                <Package className="size-5 text-accent" />
              )}
              <span>
                <b className="font-semibold">
                  {a.actor}
                  {a.country ? ` from ${a.country}` : ""}
                </b>{" "}
                <span className="text-primary-foreground/70">{a.description}</span>
              </span>
            </div>
          ))}
        </div>
        <button className="flex shrink-0 items-center gap-1 rounded-full bg-[image:var(--gradient-cta)] px-4 py-1.5 text-xs font-bold">
          View All Activity <ArrowRight className="size-3.5" />
        </button>
        <button className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────

export async function MarketplaceData() {
  const { flashDeals, trending, categories, activities, stats } =
    await fetchMarketplaceData();

  return (
    <>
      <TrustBadgesSection stats={stats} />
      <FlashDealsSection deals={flashDeals} />
      <ShopByCategorySection categories={categories} />
      <TrendingProductsSection products={trending} />
    </>
  );
}
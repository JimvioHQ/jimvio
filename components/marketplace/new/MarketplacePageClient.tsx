"use client";

import { useState, useEffect } from "react";
import { Search, Zap, DollarSign, Star, ShieldCheck, BadgeDollarSign, CircleCheck, Truck, Users, ChevronRight, ArrowRight, Heart, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FlashDealsClient } from "./FlashDealsClient";
import { TrendingProductsClient } from "./TrendingProductsClient";
import { FlashDealsCountdown } from "./FlashDealsCountdown";
import type { DbProduct } from "@/lib/utils";
import { fmtPrice, fmtCount } from "@/lib/utils";
import { LiveActivityBar } from "./Liveactivitybar ";

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
  viewers_now: number;
  revenue_today: number;
  creators_active: number;
};

type Props = {
  initialListingCount: number;
  initialFlashDeals:   DbProduct[];
  initialTrending:     DbProduct[];
  initialCategories:   DbCategory[];
  initialStats:        Stats;
};

// ─── Trust badges ─────────────────────────────────────────────────────────────

const BADGES = [
  { icon: ShieldCheck,     title: "Secure Payments",    sub: "100% safe & secure"   },
  { icon: BadgeDollarSign, title: "Buyer Protection",   sub: "Money-back guarantee" },
  { icon: CircleCheck,     title: "Verified Suppliers", sub: "Trusted & reliable"   },
  { icon: Truck,           title: "Fast Delivery",      sub: "Worldwide shipping"   },
];

export function MarketplacePageClient({
  initialListingCount,
  initialFlashDeals,
  initialTrending,
  initialCategories,
  initialStats,
}: Props) {
  const supabase = createClient();

  const [type,         setType]         = useState<ProductType>("physical");
  const [search,       setSearch]       = useState("");
  const [flashDeals,   setFlashDeals]   = useState<DbProduct[]>(initialFlashDeals);
  const [trending,     setTrending]     = useState<DbProduct[]>(initialTrending);
  const [categories,   setCategories]   = useState<DbCategory[]>(initialCategories);
  const [stats,        setStats]        = useState<Stats>(initialStats);
  const [loading,      setLoading]      = useState(false);
  const [listingCount, setListingCount] = useState(initialListingCount);

  // ── Re-fetch when type switches ───────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);

      const typeFilter = type === "digital"
        ? (["digital", "course", "ebook", "software", "template", "coaching"] as const)
        : (["physical"] as const);

      const [
        { data: deals },
        { data: trend },
        { count },
      ] = await Promise.all([
        supabase
          .from("products")
          .select(`
            id, name, slug, price, compare_at_price, images, product_type,
            status, is_flash_deal, discount_label, shipping_from,
            delivery_time, affiliate_commission_rate, sold_count,
            claimed_pct, rating, review_count, is_free_shipping, category_id
          `)
          .eq("is_flash_deal", true)
          .eq("status", "active")
          .eq("is_active", true)
          .is("deleted_at", null)
          .in("product_type", [...typeFilter])
          .order("view_count", { ascending: false })
          .limit(12),

        supabase
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
          .limit(48),

        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .eq("is_active", true)
          .is("deleted_at", null)
          .in("product_type", [...typeFilter]),
      ]);

      setFlashDeals((deals ?? []) as DbProduct[]);
      setTrending((trend   ?? []) as DbProduct[]);
      setListingCount(count ?? 0);
      setLoading(false);
    }

    load();
  }, [type]);

  // ── Client-side search filter ─────────────────────────────────────────────
  const filteredTrending = search.trim()
    ? trending.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : trending;

  const filteredDeals = search.trim()
    ? flashDeals.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : flashDeals;

  return (
    <>
      {/* ── Search bar + type switcher ── */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm">
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
        {/* Physical / Digital toggle */}
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border p-1">
          {(["physical", "digital"] as ProductType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
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

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="flex flex-col gap-4">
          <div className="h-64 animate-pulse rounded-3xl" style={{ background: "var(--color-surface)" }} />
          <div className="h-32 animate-pulse rounded-2xl" style={{ background: "var(--color-surface)" }} />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Trust badges ── */}
          <div
            className="flex flex-wrap items-center gap-3 rounded-2xl p-3"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}
          >
            {BADGES.map((b) => (
              <div key={b.title} className="flex min-w-[140px] flex-1 items-center gap-2.5">
                <b.icon className="size-6 shrink-0" style={{ color: "var(--color-accent)" }} />
                <div>
                  <div className="text-sm font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>{b.title}</div>
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
                <b className="font-bold" style={{ color: "var(--color-text-primary)" }}>{stats.creators_active}</b> creators active
              </span>
            </div>
          </div>

          {/* ── Flash Deals ── */}
          {filteredDeals.length > 0 && (
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
                <FlashDealsClient deals={filteredDeals} />
              </div>
            </section>
          )}

          {/* ── Shop by Category ── */}
          {categories.length > 0 && (
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
                        width={64}
                        height={64}
                        loading="lazy"
                        className="size-11 shrink-0 object-contain transition-transform group-hover:scale-110 sm:size-14 lg:size-16"
                      />
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── Trending Products ── */}
          <section>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-black">
                Trending {type === "digital" ? "Digital" : ""} Products
              </h2>
              <button
                type="button"
                className="ml-auto flex items-center gap-1 text-xs font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                View all <ArrowRight className="size-3.5" />
              </button>
            </div>
            <TrendingProductsClient products={filteredTrending} />
          </section>

          <LiveActivityBar />
        </>
      )}
    </>
  );
}
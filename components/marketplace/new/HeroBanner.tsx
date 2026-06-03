import { createClient } from "@/lib/supabase/server";
import { Flame, Eye, DollarSign, Heart, ThumbsUp, Play } from "lucide-react";
import { HeroBannerClient } from "@/components/marketplace/new/HeroBannerClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type HeroProduct = {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  discount_label: string | null;
  images: unknown;
  short_description: string | null;
  affiliate_commission_rate: number | null;
  sale_count: number | null;
  claimed_pct: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRenderableUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t || t === "[object Object]" || t === "null") return false;
  if (t.startsWith("/") || t.startsWith("data:") || t.startsWith("blob:")) return true;
  try { const u = new URL(t); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
}

function getImage(images: unknown): string {
  if (!images) return "/placeholder.png";
  let arr: unknown[] = [];
  if (typeof images === "string") {
    try { arr = JSON.parse(images); }
    catch { return isRenderableUrl(images) ? images : "/placeholder.png"; }
  } else if (Array.isArray(images)) {
    arr = images;
  } else {
    return "/placeholder.png";
  }
  const primary = arr.find(
    (x) => x && typeof x === "object" && (x as Record<string,unknown>).is_primary === true
  );
  if (primary) {
    const u = (primary as Record<string,unknown>).url ?? (primary as Record<string,unknown>).src;
    if (isRenderableUrl(u)) return u as string;
  }
  for (const item of arr) {
    if (isRenderableUrl(item)) return item;
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const u = o.url ?? o.src ?? o.image_url;
      if (isRenderableUrl(u)) return u as string;
    }
  }
  return "/placeholder.png";
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function getDiscount(price: number, compare: number | null, label: string | null): string {
  if (label) return label;
  if (compare && compare > price) {
    return `-${Math.round((1 - price / compare) * 100)}%`;
  }
  return "";
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

const FALLBACK: HeroProduct = {
  id:                       "fallback",
  name:                     "Trending Product",
  price:                    89.99,
  compare_at_price:         189.99,
  discount_label:           "-53%",
  images:                   ["/marketplace/projector.png"],
  short_description:        "Top-rated · Fast shipping · Affiliate enabled",
  affiliate_commission_rate: 25,
  sale_count:               1500,
  claimed_pct:              91,
};

// ─── Server component ─────────────────────────────────────────────────────────

export async function HeroBanner() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(`
      id, name, price, compare_at_price, discount_label,
      images, short_description, affiliate_commission_rate,
      sale_count, claimed_pct
    `)
    .eq("is_flash_deal", true)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("view_count", { ascending: false })
    .limit(1)
    .single();

  const product: HeroProduct = (data as HeroProduct | null) ?? FALLBACK;

  const image     = getImage(product.images);
  const price     = fmtPrice(product.price);
  const oldPrice  = product.compare_at_price ? fmtPrice(product.compare_at_price) : null;
  const discount  = getDiscount(product.price, product.compare_at_price, product.discount_label);
  const earn      = product.affiliate_commission_rate
    ? fmtPrice(product.price * (product.affiliate_commission_rate / 100))
    : null;
  const soldCount = product.sale_count
    ? product.sale_count >= 1000
      ? `${(product.sale_count / 1000).toFixed(1)}K`
      : String(product.sale_count)
    : null;

  // Discount number only e.g. "53" from "-53%"
  const discountNum = discount.replace(/[^0-9]/g, "");

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-6 sm:p-9"
      style={{
        background: "linear-gradient(135deg, var(--color-bg) 0%, var(--color-accent-light) 50%, var(--color-accent-subtle) 100%)",
        border:     "1px solid var(--color-border)",
      }}
    >
      {/* Ambient glow — stronger in dark, subtle in light */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 70% 40%, color-mix(in srgb, var(--color-accent) 15%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6 lg:flex-row">

        {/* ── Left copy ── */}
        <div className="flex-1">

          {/* Flash sale badge */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
            style={{ background: "var(--color-accent)" }}
          >
            <Flame className="size-3.5" /> FLASH SALE
          </span>

          <h1 className="mt-4 text-3xl font-black leading-[1.05] sm:text-4xl lg:text-5xl" style={{ color: "var(--color-text-primary)" }}>
            {product.name}
          </h1>

          {product.short_description && (
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
              {product.short_description}
            </p>
          )}

          {soldCount && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-7 rounded-full border-2 border-black/40"
                    style={{ background: "var(--color-accent)" }}
                  />
                ))}
              </div>
              <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                <span
                  className="size-2 rounded-full"
                  style={{ background: "var(--color-success)" }}
                />
                {soldCount} sold
              </span>
            </div>
          )}

          {/* Pricing */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span
              className="text-4xl font-black"
              style={{ color: "var(--color-accent)" }}
            >
              {price}
            </span>
            {oldPrice && (
              <span className="text-lg line-through" style={{ color: "var(--color-text-muted)" }}>
                {oldPrice}
              </span>
            )}
            {discount && (
              <span
                className="rounded-full px-2.5 py-1 text-sm font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                {discount}
              </span>
            )}
          </div>

          {/* Affiliate earn */}
          {earn && (
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              <DollarSign className="size-3.5" style={{ color: "var(--color-accent)" }} />
              <span style={{ color: "var(--color-text-muted)" }}>Affiliates earn</span>
              <span className="font-bold" style={{ color: "var(--color-accent)" }}>
                {earn} per sale
              </span>
            </div>
          )}

          {/* CTAs */}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{
                background:  "var(--color-accent)",
                boxShadow:   "0 4px 20px rgba(253,80,0,0.35)",
              }}
            >
              Shop Now →
            </button>
            <button
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              style={{ border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)" }}
            >
              <Eye className="size-4" /> Quick View
            </button>
          </div>
        </div>

        {/* ── Product image ── */}
        <div className="relative flex w-full max-w-sm flex-1 items-center justify-center sm:max-w-md lg:max-w-lg">
          {/* Glow blob behind product */}
          <div
            className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:size-64"
            style={{ background: "color-mix(in srgb, var(--color-accent) 20%, transparent)" }}
          />
          <div className="relative aspect-square w-full max-w-[260px] sm:max-w-[320px] lg:max-w-[380px]">
            <img
              src={image}
              alt={product.name}
              width={768}
              height={768}
              loading="eager"
              decoding="async"
              className="h-full w-full object-contain object-center drop-shadow-2xl"
            />
          </div>

          {/* Floating reaction chips */}
          <span
            className="absolute left-2 top-6 grid size-10 place-items-center rounded-full text-white shadow-lg"
            style={{ background: "var(--color-accent)" }}
          >
            <Heart className="size-5 fill-current" />
          </span>
          <span
            className="absolute right-6 top-2 grid size-10 place-items-center rounded-xl text-white shadow-lg"
            style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
          >
            <ThumbsUp className="size-5 fill-current" />
          </span>
          <span
            className="absolute bottom-10 left-4 grid size-10 place-items-center rounded-full text-white shadow-lg"
            style={{ background: "var(--color-accent)" }}
          >
            <DollarSign className="size-5" />
          </span>
          <span
            className="absolute bottom-2 right-8 grid size-9 place-items-center rounded-lg text-white shadow-lg"
            style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
          >
            <Play className="size-4 fill-current" />
          </span>
        </div>

        {/* ── Right: discount badge + countdown ── */}
        <div className="flex flex-col items-center gap-4 lg:items-end">
          {discountNum && (
            <div
              className="grid size-28 place-items-center rounded-full text-center shadow-lg" 
              style={{
                background: "linear-gradient(135deg, var(--color-accent) 0%, #ff8c00 100%)",
                boxShadow:  "0 8px 32px rgba(253,80,0,0.40)",
              }}
            >
              <div>
                <div className="text-xs font-semibold opacity-80">Up to</div>
                <div className="text-2xl font-black leading-none">{discountNum}%</div>
                <div className="text-xs font-semibold opacity-80">OFF</div>
              </div>
            </div>
          )}

          {/* Live countdown + claimed bar */}
          <HeroBannerClient claimedPct={product.claimed_pct ?? 0} />
        </div>

      </div>
    </section>
  );
}
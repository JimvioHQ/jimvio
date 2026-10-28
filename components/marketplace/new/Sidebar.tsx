"use client";

import { useEffect, useRef, useState } from "react";
import {
  Flame, Cpu, Smartphone, Shirt, Sparkles, Sofa, Dumbbell,
  Car, Watch, Baby, Briefcase, Wrench, Send,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { Slider } from "@/components/ui/slider";
import CustomSelect from "@/components/ui/select-2";
import { useMarketplace } from "./marketplace-context";
import { type DeliveryTime } from "@/lib/utils";
import { JIMVIO_ORANGE } from "@/lib/marketplace/category-catalog";
import {
  categoryTypeOrFilter,
  DIGITAL_FORMATS,
  MARKETPLACE_PRICE_CEILING,
  marketplaceNewArrivalSince,
  type MarketplaceFormat,
} from "@/lib/marketplace/experience";
import { marketplaceCustomerUsd } from "@/lib/marketplace/display-price";
import { getMarketplaceTypeFilter } from "@/lib/marketplace/fetch-page-data";
import { SHOPPING_SUGGESTIONS } from "@/lib/marketplace/shopping-assistant";

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarCategory = {
  name: string;
  slug: string;
  product_count: number | null;
  icon: string | null;
};

type ShippingCount = { shipping_from: string; count: number };
type DeliveryCount = { delivery_time: string; count: number };

// ─── Static maps ──────────────────────────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  Flame, Cpu, Smartphone, Shirt, Sparkles, Sofa,
  Dumbbell, Car, Watch, Baby, Briefcase, Wrench,
};

const deliveryLabel: Record<string, string> = {
  fast: "Fast (3–7 Days)",
  standard: "Standard (7–15 Days)",
  economy: "Economy (15–30 Days)",
};

const deliveryOrder: DeliveryTime[] = ["fast", "standard", "economy"];

const OFFER_ROWS = [
  { key: "free_shipping" as const, label: "Free shipping" },
  { key: "flash_deal" as const, label: "Flash deal" },
];

const FORMAT_LABELS: Record<MarketplaceFormat, string> = {
  digital: "Digital files",
  course: "Courses",
  ebook: "Ebooks",
  software: "Software",
  template: "Templates",
  coaching: "Coaching",
};

type AssistantProduct = {
  name: string;
  slug: string;
  price: number | string | null;
  price_usd?: number | null;
  currency?: string | null;
  image?: string | null;
  reason?: string | null;
};

const CATEGORY_LIMIT = 200;

function fmtCount(n: number | null | undefined): string {
  if (!n) return "";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Skeleton components ──────────────────────────────────────────────────────

function SkeletonRow({ width = "full" }: { width?: "full" | "3/4" | "2/3" | "1/2" }) {
  const widthClass = {
    full: "w-full",
    "3/4": "w-3/4",
    "2/3": "w-2/3",
    "1/2": "w-1/2",
  }[width];
  return (
    <div
      className={`h-4 ${widthClass} animate-pulse rounded-md`}
      style={{ background: "var(--color-border)" }}
    />
  );
}

function CategorySkeleton() {
  const widths: Array<"full" | "3/4" | "2/3" | "1/2"> = ["full", "3/4", "full", "2/3", "3/4", "full", "1/2", "2/3"];
  return (
    <div className="flex flex-col gap-2">
      {/* Fake select box */}
      <div
        className="h-8 w-full animate-pulse rounded-md"
        style={{ background: "var(--color-border)" }}
      />
      <div className="mt-1 flex flex-col gap-1.5">
        {widths.map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="size-3.5 shrink-0 animate-pulse rounded"
              style={{ background: "var(--color-border)", animationDelay: `${i * 60}ms` }}
            />
            <div
              className={`h-3 ${w === "full" ? "w-full" : w === "3/4" ? "w-3/4" : w === "2/3" ? "w-2/3" : "w-1/2"} animate-pulse rounded`}
              style={{ background: "var(--color-border)", animationDelay: `${i * 60}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Shipping section */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-1/3 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
        <div className="flex flex-col gap-1.5">
          {["full", "3/4", "2/3", "full", "1/2"].map((w, i) => (
            <div key={i} className="flex items-center gap-2" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="size-3.5 shrink-0 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
              <div
                className={`h-3 animate-pulse rounded ${w === "full" ? "w-full" : w === "3/4" ? "w-3/4" : w === "2/3" ? "w-2/3" : "w-1/2"}`}
                style={{ background: "var(--color-border)" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Price range section */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-1/4 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
        <div className="h-2 w-full animate-pulse rounded-full" style={{ background: "var(--color-border)" }} />
        <div className="flex justify-between">
          <div className="h-3 w-6 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
          <div className="h-3 w-10 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
        </div>
      </div>

      {/* Delivery section */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-2/5 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
        {["full", "3/4", "2/3"].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="size-3.5 shrink-0 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
            <div
              className={`h-3 animate-pulse rounded ${w === "full" ? "w-full" : w === "3/4" ? "w-3/4" : "w-2/3"}`}
              style={{ background: "var(--color-border)" }}
            />
          </div>
        ))}
      </div>

      {/* Rating section */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-1/3 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="size-3.5 shrink-0 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
            <div className="h-3 w-16 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
          </div>
        ))}
      </div>

      {/* Apply button skeleton */}
      <div className="h-8 w-full animate-pulse rounded-lg" style={{ background: "var(--color-border)" }} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-1.5 text-[10px] font-bold uppercase tracking-widest"
      style={{ color: "var(--color-text-muted)" }}
    >
      {children}
    </div>
  );
}

function CheckRow({
  label, count, checked, onToggle,
}: {
  label: string; count?: string; checked: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 focus-visible:ring-offset-1"
      style={{ color: "var(--color-text-secondary)" }}
    >
      <span className="flex items-center gap-1.5">
        <span
          className="grid size-3.5 shrink-0 place-items-center rounded transition-all"
          style={{
            background: checked ? "var(--color-accent)" : "transparent",
            border: checked ? "none" : "1px solid var(--color-border-strong)",
            color: "white",
          }}
        >
          {checked && <span className="text-[8px] leading-none">✓</span>}
        </span>
        <span className="truncate">{label}</span>
      </span>
      {count && (
        <span
          className="ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
          style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  type?: "physical" | "digital";
};

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({ type = "physical" }: Props) {
  const {
    filters, pending,
    setCategory, toggleShippingFrom, toggleDeliveryTime,
    setPriceRange, setOffer, setFormat, setArrivals, setPurchased, applyFilters, clearFilters,
  } = useMarketplace();

  const { formatMoney } = useCurrency();
  const [aiQuery, setAiQuery] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [aiProducts, setAiProducts] = useState<AssistantProduct[]>([]);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const [retryAfterMs, setRetryAfterMs] = useState<number | null>(null);
  const lastAiMessage = useRef("");
  const aiInFlight = useRef(false);
  const aiAbort = useRef<AbortController | null>(null);
  const aiGeneration = useRef(0);

  useEffect(() => {
    if (!retryAfterMs) return;
    const wait = Math.max(0, retryAfterMs - Date.now());
    const timer = window.setTimeout(() => setRetryAfterMs(null), wait);
    return () => window.clearTimeout(timer);
  }, [retryAfterMs]);

  async function askShoppingAssistant(message: string) {
    const text = message.replace(/\s+/g, " ").trim();
    if (!text || retryAfterMs != null) return;
    if (aiInFlight.current && lastAiMessage.current === text) return;
    aiAbort.current?.abort();
    const controller = new AbortController();
    aiAbort.current = controller;
    const generation = ++aiGeneration.current;
    aiInFlight.current = true;
    lastAiMessage.current = text;
    setAiStatus("loading");
    setAiError("");
    setAiReply("");
    setAiProducts([]);
    try {
      const res = await fetch("/api/marketplace/shopping-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, type }),
        signal: controller.signal,
      });
      if (generation !== aiGeneration.current) return;
      const data = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        error?: string;
        quotaScope?: "minute" | "daily" | "overload" | null;
        retryAfterSeconds?: number | null;
        products?: AssistantProduct[];
      };
      if (generation !== aiGeneration.current) return;
      if (!res.ok || !data.ok || !data.reply) {
        const wait = Number(data.retryAfterSeconds);
        if (data.error === "rate_limit" && Number.isFinite(wait) && wait > 0) {
          setRetryAfterMs(Date.now() + wait * 1000);
        }
        setAiStatus("error");
        setAiError(
          data.error === "rate_limit"
            ? data.quotaScope === "daily"
              ? "This assistant’s daily quota is used up. The provider did not give a reset time."
              : data.quotaScope === "overload"
                ? "The assistant is busy right now. Wait a moment, then retry."
                : `The assistant is rate-limiting requests${Number.isFinite(wait) && wait > 0 ? `. Retry in ${Math.ceil(wait)}s` : ""}.`
            : "The assistant couldn’t answer. Try again.",
        );
        return;
      }
      setRetryAfterMs(null);
      setAiReply(data.reply);
      setAiProducts(Array.isArray(data.products) ? data.products : []);
      setAiStatus("ready");
      setAiQuery("");
    } catch (error) {
      if (generation !== aiGeneration.current) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAiStatus("error");
      setAiError("The assistant couldn’t answer. Try again.");
    } finally {
      if (generation === aiGeneration.current) aiInFlight.current = false;
    }
  }

  const [sidebarCategories, setSidebarCategories] = useState<SidebarCategory[]>([]);
  const [shippingCounts, setShippingCounts] = useState<ShippingCount[]>([]);
  const [deliveryCounts, setDeliveryCounts] = useState<DeliveryCount[]>([]);
  const [offerCounts, setOfferCounts] = useState({ free_shipping: 0, flash_deal: 0 });
  const [listingCounts, setListingCounts] = useState({ arrivals: 0, purchased: 0 });
  const [formatCounts, setFormatCounts] = useState<Partial<Record<MarketplaceFormat, number>>>({});
  const [loadingCats, setLoadingCats] = useState(true);
  const [categoryLoad, setCategoryLoad] = useState<"loading" | "ready" | "error">("loading");
  const [loadingFilters, setLoadingFilters] = useState(true);

  // ── Categories filtered by product type ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    async function load() {
      setLoadingCats(true);
      setCategoryLoad("loading");

      const { data, error } = await supabase
        .from("product_categories")
        .select("name, slug, product_count, icon")
        .eq("is_active", true)
        .eq("visible", true)
        .or(categoryTypeOrFilter(type))
        .order("sort_order", { ascending: true })
        .limit(CATEGORY_LIMIT);

      if (cancelled) return;
      if (error) {
        setSidebarCategories([]);
        setCategoryLoad("error");
        setLoadingCats(false);
        return;
      }

      setSidebarCategories((data ?? []) as SidebarCategory[]);
      setCategoryLoad("ready");
      setLoadingCats(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [type]);

  // Clear a slug that is not in this type's category set. Skip errors and truncated lists.
  useEffect(() => {
    if (categoryLoad !== "ready" || loadingCats) return;
    if (sidebarCategories.length >= CATEGORY_LIMIT) return;
    const valid = new Set(sidebarCategories.map((c) => c.slug));
    if (filters.category && !valid.has(filters.category)) {
      setCategory("");
    }
  }, [categoryLoad, loadingCats, sidebarCategories, filters.category, setCategory]);

  // ── Filter counts filtered by product type ────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoadingFilters(true);
      const typeFilter = [...getMarketplaceTypeFilter(type)];

      const active = () =>
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("is_active", true)
          .is("deleted_at", null);

      const [{ data: sd }, { data: dd }, freeRes, flashRes, formatRes, arrivalRes, purchasedRes] = await Promise.all([
        supabase
          .from("products")
          .select("shipping_from")
          .eq("status", "active")
          .eq("is_active", true)
          .is("deleted_at", null)
          .in("product_type", typeFilter as any[])
          .not("shipping_from", "is", null)
          .limit(800),
        supabase
          .from("products")
          .select("delivery_time")
          .eq("status", "active")
          .eq("is_active", true)
          .is("deleted_at", null)
          .in("product_type", typeFilter as any[])
          .not("delivery_time", "is", null)
          .limit(800),
        type === "physical"
          ? active().in("product_type", typeFilter as any[]).eq("is_free_shipping", true)
          : Promise.resolve({ count: 0 }),
        type === "physical"
          ? active().in("product_type", typeFilter as any[]).eq("is_flash_deal", true)
          : Promise.resolve({ count: 0 }),
        type === "digital"
          ? Promise.all(
              DIGITAL_FORMATS.map(async (format) => {
                const { count } = await active().eq("product_type", format);
                return [format, count ?? 0] as const;
              }),
            )
          : Promise.resolve([] as const),
        active().in("product_type", typeFilter as any[]).gte("created_at", marketplaceNewArrivalSince()),
        active().in("product_type", typeFilter as any[]).gt("sale_count", 0),
      ]);

      if (sd) {
        const c: Record<string, number> = {};
        for (const r of sd) if (r.shipping_from) c[r.shipping_from] = (c[r.shipping_from] ?? 0) + 1;
        setShippingCounts(
          Object.entries(c).sort((a, b) => b[1] - a[1]).map(([shipping_from, count]) => ({ shipping_from, count }))
        );
      }

      if (dd) {
        const c: Record<string, number> = {};
        for (const r of dd) if (r.delivery_time) c[r.delivery_time] = (c[r.delivery_time] ?? 0) + 1;
        setDeliveryCounts(Object.entries(c).map(([delivery_time, count]) => ({ delivery_time, count })));
      }

      setOfferCounts({
        free_shipping: freeRes.count ?? 0,
        flash_deal: flashRes.count ?? 0,
      });
      setFormatCounts(Object.fromEntries(formatRes));
      setListingCounts({
        arrivals: arrivalRes.count ?? 0,
        purchased: purchasedRes.count ?? 0,
      });

      setLoadingFilters(false);
    }
    load();
  }, [type]);

  const shippingItems = shippingCounts.slice(0, 5).map((s) => ({
    name: s.shipping_from, count: fmtCount(s.count),
  }));

  const deliveryItems = deliveryOrder
    .map((key) => {
      const found = deliveryCounts.find((d) => d.delivery_time === key);
      return { key, label: deliveryLabel[key] ?? key, count: found ? fmtCount(found.count) : "" };
    })
    .filter((d) => d.count !== "");

  const offerItems = OFFER_ROWS.filter(
    (row) => offerCounts[row.key] > 0 || pending.offer === row.key,
  );
  const formatItems = DIGITAL_FORMATS.filter(
    (format) => (formatCounts[format] ?? 0) > 0 || pending.format === format,
  );

  const allCategories = [...sidebarCategories];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-0 self-start">

      <div className="flex flex-col gap-3.5">

        {/* ── Categories ── */}
        <div
          className="rounded-xl p-3.5"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-black" style={{ color: "var(--color-text-primary)" }}>
              Categories
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                {type === "digital" ? "Digital" : "Physical"}
              </span>
            </span>
            <button
              onClick={() => setCategory("")}
              className="text-[10px] font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              View all
            </button>
          </div>

          {loadingCats ? (
            <CategorySkeleton />
          ) : (
            <div>
              <CustomSelect
                options={[
                  { label: "All", value: "" },
                  ...allCategories.map((c) => ({
                    label: c.product_count ? `${c.name} (${fmtCount(c.product_count)})` : c.name,
                    value: c.slug,
                  })),
                ]}
                value={filters.category || ""}
                onChange={(v) => setCategory(v)}
                placeholder="All"
                searchable
                isClearable
                className="h-10"
                textSize="sm"
              />
              {sidebarCategories.length === 0 && (
                <div className="mt-2 rounded-md py-3 text-center text-[10px]" style={{ color: "var(--color-text-muted)", background: "var(--color-surface-secondary)" }}>
                  No {type} categories yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Filters ── */}
        <div
          className="rounded-xl p-3.5"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-black" style={{ color: "var(--color-text-primary)" }}>Filters</span>
            <button
              onClick={clearFilters}
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors hover:opacity-80"
              style={{ color: "var(--color-accent)", background: "var(--color-border)" }}
            >
              Clear All
            </button>
          </div>

          {loadingFilters ? (
            <FilterSkeleton />
          ) : (
            <div className="flex flex-col gap-3">

              {/* Shipping From — only for physical */}
              {type === "physical" && shippingItems.length > 0 && (
                <div>
                  <SectionLabel>Shipping From</SectionLabel>
                  <div className="flex flex-col gap-0.5">
                    {shippingItems.map((item) => (
                      <CheckRow
                        key={item.name}
                        label={item.name}
                        count={item.count}
                        checked={pending.shippingFrom.includes(item.name)}
                        onToggle={() => toggleShippingFrom(item.name)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div>
                <SectionLabel>Price Range</SectionLabel>
                <Slider
                  min={0}
                  max={type === "digital" ? 500 : MARKETPLACE_PRICE_CEILING}
                  step={1}
                  value={[Math.min(pending.priceRange[1], type === "digital" ? 500 : MARKETPLACE_PRICE_CEILING)]}
                  onValueChange={(v) => {
                    const cap = type === "digital" ? 500 : MARKETPLACE_PRICE_CEILING;
                    const raw = v[0] ?? cap;
                    setPriceRange([0, raw >= cap ? MARKETPLACE_PRICE_CEILING : raw]);
                  }}
                  className="py-1"
                />
                <div
                  className="mt-1.5 flex justify-between rounded-md px-2 py-1 text-[10px] font-semibold"
                  style={{ background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}
                >
                  <span>{formatMoney(0, "USD")}</span>
                  <span style={{ color: "var(--color-text-primary)" }}>
                    {pending.priceRange[1] >= (type === "digital" ? 500 : MARKETPLACE_PRICE_CEILING)
                      ? `${formatMoney(type === "digital" ? 500 : MARKETPLACE_PRICE_CEILING, "USD")}+`
                      : formatMoney(pending.priceRange[1], "USD")}
                  </span>
                </div>
              </div>

              {/* Delivery Time — only for physical */}
              {type === "physical" && deliveryItems.length > 0 && (
                <div>
                  <SectionLabel>Delivery Time</SectionLabel>
                  <div className="flex flex-col gap-0.5">
                    {deliveryItems.map((d) => (
                      <CheckRow
                        key={d.key}
                        label={d.label}
                        count={d.count}
                        checked={pending.deliveryTimes.includes(d.key as DeliveryTime)}
                        onToggle={() => toggleDeliveryTime(d.key as DeliveryTime)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {type === "physical" && offerItems.length > 0 && (
                <div data-filter-offer>
                  <SectionLabel>Offers</SectionLabel>
                  <div className="flex flex-col gap-0.5">
                    {offerItems.map((row) => (
                      <CheckRow
                        key={row.key}
                        label={row.label}
                        count={fmtCount(offerCounts[row.key])}
                        checked={pending.offer === row.key}
                        onToggle={() => setOffer(pending.offer === row.key ? "" : row.key)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(listingCounts.arrivals > 0 || pending.arrivals || listingCounts.purchased > 0 || pending.purchased) && (
                <div data-filter-listings>
                  <SectionLabel>Listings</SectionLabel>
                  <div className="flex flex-col gap-0.5">
                    {(listingCounts.arrivals > 0 || pending.arrivals) && (
                      <CheckRow
                        label="New arrivals"
                        count={fmtCount(listingCounts.arrivals)}
                        checked={Boolean(pending.arrivals)}
                        onToggle={() => setArrivals(!pending.arrivals)}
                      />
                    )}
                    {(listingCounts.purchased > 0 || pending.purchased) && (
                      <CheckRow
                        label="Purchased"
                        count={fmtCount(listingCounts.purchased)}
                        checked={Boolean(pending.purchased)}
                        onToggle={() => setPurchased(!pending.purchased)}
                      />
                    )}
                  </div>
                </div>
              )}

              {type === "digital" && formatItems.length > 0 && (
                <div data-filter-format>
                  <SectionLabel>Format</SectionLabel>
                  <div className="flex flex-col gap-0.5">
                    {formatItems.map((format) => (
                      <CheckRow
                        key={format}
                        label={FORMAT_LABELS[format]}
                        count={fmtCount(formatCounts[format])}
                        checked={pending.format === format}
                        onToggle={() => setFormat(pending.format === format ? "" : format)}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          <button
            type="button"
            onClick={applyFilters}
            className="mt-3 w-full rounded-lg py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}
            disabled={loadingFilters}
          >
            Apply Filters
          </button>
        </div>

        {/* ── AI Shopping Assistant — fills the sidebar space below the filters ── */}
        <div
          data-marketplace-assistant
          className="flex flex-col rounded-xl p-3.5"
          style={{
            background: JIMVIO_ORANGE.gradient135,
            boxShadow: type === "digital" ? JIMVIO_ORANGE.glow : undefined,
          }}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-white" />
            <span className="text-xs font-black text-white">AI Shopping Assistant</span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.25)" }}
            >
              Beta
            </span>
          </div>
          <p className="mb-2.5 text-[10px] leading-relaxed text-white/80">
            {type === "digital"
              ? "Ask about courses, templates, software, or a budget. Answers use digital listings only."
              : "Ask about a product, category, or budget. Answers use physical listings only."}
          </p>
          <form
            className="flex items-end gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 ring-1 ring-white/10 transition-all focus-within:ring-white/40"
            onSubmit={(e) => {
              e.preventDefault();
              void askShoppingAssistant(aiQuery);
            }}
          >
            <textarea
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void askShoppingAssistant(aiQuery);
                }
              }}
              placeholder={type === "digital" ? "Find a course or template..." : "Ask about a product..."}
              maxLength={500}
              rows={3}
              aria-label="AI Shopping Assistant"
              className="max-h-28 min-h-[3.25rem] w-full resize-none bg-transparent text-[11px] leading-relaxed text-white outline-none placeholder:text-white/55 focus-visible:outline-none"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!aiQuery.trim()}
              className="mb-0.5 rounded p-0.5 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
            >
              <Send className="size-3 text-white" />
            </button>
          </form>
          <p className="mt-1.5 text-[9px] text-white/60">Enter to send. Shift+Enter for a new line.</p>
          {aiStatus === "loading" && (
            <p className="mt-2 text-[10px] text-white/80" aria-live="polite">
              Looking through {type} listings…
            </p>
          )}
          {aiStatus === "ready" && aiReply && (
            <div className="mt-2 space-y-1.5" aria-live="polite">
              <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-white/90">
                {aiReply}
              </p>
              {aiProducts.length > 0 && (
                <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {aiProducts.map((product) => {
                    const usd = marketplaceCustomerUsd(product);
                    const priceLabel = usd == null ? null : formatMoney(usd, "USD");
                    return (
                      <a
                        key={product.slug}
                        href={`/marketplace/${product.slug}`}
                        className="flex items-center gap-2 rounded-lg bg-white/10 p-1.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-white/15 text-[9px] text-white/70">
                            No photo
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-[10px] font-semibold">{product.name}</span>
                          {priceLabel && <span className="block text-[10px] text-white/80">{priceLabel}</span>}
                          {product.reason && (
                            <span className="block text-[9px] leading-snug text-white/70">{product.reason}</span>
                          )}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {aiStatus === "error" && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-live="polite">
              <p className="text-[10px] text-white/90">{aiError}</p>
              <button
                type="button"
                onClick={() => void askShoppingAssistant(lastAiMessage.current)}
                disabled={retryAfterMs != null}
                className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1 text-[9px] font-semibold">
            {SHOPPING_SUGGESTIONS[type].map((item) => (
              <button
                key={item.intent}
                type="button"
                onClick={() => void askShoppingAssistant(item.message)}
                className="rounded-full bg-white/15 px-2 py-0.5 text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </aside>
  );
}
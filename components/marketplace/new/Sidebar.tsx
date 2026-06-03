"use client";

import { useEffect, useState } from "react";
import {
  Flame, Cpu, Smartphone, Shirt, Sparkles, Sofa, Dumbbell,
  Car, Watch, Baby, Briefcase, Wrench, Star, Crown, Send,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Slider } from "@/components/ui/slider";
import { useMarketplace } from "./marketplace-context";
import { DeliveryTime } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarCategory = {
  name:          string;
  slug:          string;
  product_count: number | null;
  icon:          string | null;
};

type ShippingCount = { shipping_from: string; count: number };
type DeliveryCount = { delivery_time: string; count: number };

// ─── Static maps ──────────────────────────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  Flame, Cpu, Smartphone, Shirt, Sparkles, Sofa,
  Dumbbell, Car, Watch, Baby, Briefcase, Wrench,
};

const deliveryLabel: Record<string, string> = {
  fast:     "Fast Shipping (3–7 Days)",
  standard: "Standard Shipping (7–15 Days)",
  economy:  "Economy (15–30 Days)",
};

const deliveryOrder: DeliveryTime[] = ["fast", "standard", "economy"];

function fmtCount(n: number | null | undefined): string {
  if (!n) return "";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--color-surface)",
        border:     "1px solid var(--color-border)",
        boxShadow:  "var(--shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}

function FilterGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title:    string;
  items:    { name: string; count: string }[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <div>
      <h4
        className="mb-2 text-xs font-bold"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const checked = selected.includes(item.name);
          return (
            <li key={item.name}>
              <button
                type="button"
                onClick={() => onToggle(item.name)}
                className="flex w-full items-center justify-between text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="grid size-4 place-items-center rounded"
                    style={{
                      border:     checked ? "none" : "1px solid var(--color-border-strong)",
                      background: checked ? "var(--color-accent)" : "transparent",
                      color:      "white",
                    }}
                  >
                    {checked && <span className="text-[10px] leading-none">✓</span>}
                  </span>
                  {item.name}
                </span>
                {item.count && (
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {item.count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <ul className="space-y-0.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="h-9 animate-pulse rounded-lg" style={{ background: "var(--color-border)" }} />
      ))}
    </ul>
  );
}

function FilterSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-6 animate-pulse rounded" style={{ background: "var(--color-border)" }} />
      ))}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar() {
  const {
    filters, pending,
    setCategory, toggleShippingFrom, toggleDeliveryTime,
    setPriceRange, setMinRating, applyFilters, clearFilters,
  } = useMarketplace();

  const [aiQuery,           setAiQuery]           = useState("");
  const [sidebarCategories, setSidebarCategories] = useState<SidebarCategory[]>([]);
  const [shippingCounts,    setShippingCounts]    = useState<ShippingCount[]>([]);
  const [deliveryCounts,    setDeliveryCounts]    = useState<DeliveryCount[]>([]);
  const [loadingCats,       setLoadingCats]       = useState(true);
  const [loadingFilters,    setLoadingFilters]    = useState(true);

  const supabase = createClient();

  // ── Load categories ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingCats(true);
      const { data } = await supabase
        .from("product_categories")        // ← correct table
        .select("name, slug, product_count, icon")
        .eq("is_active", true)
        .eq("visible", true)
        .is("parent_id", null)             // top-level only
        .order("sort_order")
        .limit(12);
      if (data) setSidebarCategories(data as SidebarCategory[]);
      setLoadingCats(false);
    }
    load();
  }, []);

  // ── Load filter counts ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingFilters(true);
      const [{ data: shippingData }, { data: deliveryData }] = await Promise.all([
        supabase
          .from("products")
          .select("shipping_from")
          .eq("status", "active")
          .not("shipping_from", "is", null),
        supabase
          .from("products")
          .select("delivery_time")
          .eq("status", "active")
          .not("delivery_time", "is", null),
      ]);

      if (shippingData) {
        const counts: Record<string, number> = {};
        for (const row of shippingData) {
          if (row.shipping_from) counts[row.shipping_from] = (counts[row.shipping_from] ?? 0) + 1;
        }
        setShippingCounts(
          Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([shipping_from, count]) => ({ shipping_from, count })),
        );
      }

      if (deliveryData) {
        const counts: Record<string, number> = {};
        for (const row of deliveryData) {
          if (row.delivery_time) counts[row.delivery_time] = (counts[row.delivery_time] ?? 0) + 1;
        }
        setDeliveryCounts(
          Object.entries(counts).map(([delivery_time, count]) => ({ delivery_time, count })),
        );
      }

      setLoadingFilters(false);
    }
    load();
  }, []);

  const shippingItems = shippingCounts.map((s) => ({
    name: s.shipping_from, count: fmtCount(s.count),
  }));

  const deliveryItems = deliveryOrder
    .map((key) => {
      const found = deliveryCounts.find((d) => d.delivery_time === key);
      return { key, label: deliveryLabel[key] ?? key, count: found ? fmtCount(found.count) : "" };
    })
    .filter((d) => d.count !== "");

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-4 lg:flex">

      {/* ── Categories ── */}
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
            Categories
          </h3>
          <button
            type="button"
            onClick={() => setCategory("Trending Now")}
            className="text-xs font-semibold"
            style={{ color: "var(--color-accent)" }}
          >
            View all
          </button>
        </div>

        {loadingCats ? <CategorySkeleton /> : (
          <ul className="space-y-0.5">
            {[
              { name: "Trending Now", slug: "trending", product_count: null, icon: "Flame" },
              ...sidebarCategories,
            ].map((cat) => {
              const Icon     = iconMap[cat.icon ?? "Flame"] ?? Flame;
              const isActive = filters.category === cat.name;
              return (
                <li key={cat.name}>
                  <button
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors"
                    style={{
                      background: isActive ? `color-mix(in srgb, var(--color-accent) 10%, transparent)` : "transparent",
                      color:      isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className="size-4"
                        style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-muted)" }}
                      />
                      {cat.name}
                    </span>
                    {cat.product_count != null && (
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {fmtCount(cat.product_count)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* ── Filters ── */}
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
            Filters
          </h3>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold"
            style={{ color: "var(--color-accent)" }}
          >
            Clear All
          </button>
        </div>

        {loadingFilters ? <FilterSkeleton /> : (
          <>
            {shippingItems.length > 0 && (
              <FilterGroup
                title="Shipping From"
                items={shippingItems}
                selected={pending.shippingFrom}
                onToggle={toggleShippingFrom}
              />
            )}

            <div className="mt-4">
              <h4
                className="mb-2 text-xs font-bold"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Price Range
              </h4>
              <Slider
                min={0} max={5000} step={50}
                value={[pending.priceRange[1]]}
                onValueChange={(value) => setPriceRange([0, value[0] ?? 5000])}
                className="py-2"
              />
              <div className="mt-2 flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span>$0</span>
                <span>${pending.priceRange[1] >= 5000 ? "5000+" : pending.priceRange[1]}</span>
              </div>
            </div>

            {deliveryItems.length > 0 && (
              <div className="mt-4">
                <h4
                  className="mb-2 text-xs font-bold"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Delivery Time
                </h4>
                <ul className="space-y-1.5">
                  {deliveryItems.map((d) => {
                    const checked = pending.deliveryTimes.includes(d.key as DeliveryTime);
                    return (
                      <li key={d.key}>
                        <button
                          type="button"
                          onClick={() => toggleDeliveryTime(d.key as DeliveryTime)}
                          className="flex w-full items-center justify-between text-sm"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="grid size-4 place-items-center rounded"
                              style={{
                                border:     checked ? "none" : "1px solid var(--color-border-strong)",
                                background: checked ? "var(--color-accent)" : "transparent",
                                color:      "white",
                              }}
                            >
                              {checked && <span className="text-[10px] leading-none">✓</span>}
                            </span>
                            {d.label}
                          </span>
                          {d.count && (
                            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              {d.count}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <h4
                className="mb-2 text-xs font-bold"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Supplier Rating
              </h4>
              <button
                type="button"
                onClick={() => setMinRating(pending.minRating >= 4 ? 0 : 4)}
                className="flex items-center gap-2 text-sm"
              >
                <span className="flex" style={{ color: "var(--color-accent)" }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${i < 4 || pending.minRating >= 4 ? "fill-current" : ""}`}
                    />
                  ))}
                </span>
                <span style={{ color: "var(--color-text-muted)" }}>4+ Up</span>
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={applyFilters}
          className="mt-4 w-full rounded-lg py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--color-accent)" }}
        >
          Apply
        </button>
      </Panel>

      {/* ── AI Shopping Assistant ── */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, var(--color-accent) 0%, #ff8c00 100%)",
          boxShadow:  "var(--shadow-md)",
        }}
      >
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="size-4 text-white" />
          <span className="text-sm font-bold text-white">AI Shopping Assistant</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white">Beta</span>
        </div>
        <p className="mb-3 text-xs text-white/80">
          Find winning products, trending items and profitable opportunities.
        </p>
        <form
          className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            if (aiQuery.trim()) { setCategory("Trending Now"); setAiQuery(""); }
          }}
        >
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="Ask AI anything..."
            className="w-full bg-transparent text-white placeholder:text-white/60 outline-none"
          />
          <button type="submit">
            <Send className="size-3.5 text-white" />
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
          {["Winning products", "Viral now", "High commission"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCategory("Trending Now")}
              className="rounded-full bg-white/15 px-2 py-1 text-white transition-colors hover:bg-white/25"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Elite Club ── */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "var(--color-surface-secondary)",
          border:     "1px solid var(--color-border)",
          boxShadow:  "var(--shadow-md)",
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Crown className="size-4" style={{ color: "var(--color-accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
            Jimvio Elite Club
          </span>
          <span
            className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
            style={{ background: "var(--color-accent)" }}
          >
            New
          </span>
        </div>
        <ul className="mb-3 space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <li className="flex items-center gap-2">
            <span style={{ color: "var(--color-accent)" }}>★</span> Exclusive perks
          </li>
          <li className="flex items-center gap-2">
            <span style={{ color: "var(--color-accent)" }}>★</span> Higher commissions
          </li>
          <li className="flex items-center gap-2">
            <span style={{ color: "var(--color-accent)" }}>★</span> VIP support
          </li>
        </ul>
        <button
          type="button"
          className="w-full rounded-lg py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--color-accent)" }}
        >
          Join Elite Now
        </button>
      </div>

    </aside>
  );
}
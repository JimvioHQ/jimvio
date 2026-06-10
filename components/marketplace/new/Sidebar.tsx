"use client";

import { useEffect, useState } from "react";
import {
  Flame, Cpu, Smartphone, Shirt, Sparkles, Sofa, Dumbbell,
  Car, Watch, Baby, Briefcase, Wrench, Star, Crown, Send,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { Slider } from "@/components/ui/slider";
import CustomSelect from "@/components/ui/select-2";
import { useMarketplace } from "./marketplace-context";
import type { DeliveryTime } from "@/lib/utils";

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

const PHYSICAL_TYPES = ["physical"] as const;
const DIGITAL_TYPES = ["digital", "course", "ebook", "software", "template", "coaching", "bundle"] as const;

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
      className="flex w-full items-center justify-between rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-black/5"
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
    setPriceRange, setMinRating, applyFilters, clearFilters,
  } = useMarketplace();

  const { formatMoney } = useCurrency();
  const [aiQuery, setAiQuery] = useState("");
  const [sidebarCategories, setSidebarCategories] = useState<SidebarCategory[]>([]);
  const [shippingCounts, setShippingCounts] = useState<ShippingCount[]>([]);
  const [deliveryCounts, setDeliveryCounts] = useState<DeliveryCount[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const supabase = createClient();

  // ── Categories filtered by product type ───────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingCats(true);
      const typeFilter = type === "digital" ? [...DIGITAL_TYPES] : [...PHYSICAL_TYPES];

      const { data: catIds } = await supabase
        .from("products")
        .select("category_id")
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", typeFilter as any[])
        .not("category_id", "is", null);

      const ids = [...new Set((catIds ?? []).map((r: any) => r.category_id).filter(Boolean))];

      if (ids.length === 0) {
        setSidebarCategories([]);
        setLoadingCats(false);
        return;
      }

      const { data } = await supabase
        .from("product_categories")
        .select("name, slug, product_count, icon")
        .eq("is_active", true)
        .is("parent_id", null)
        .in("id", ids)
        .order("product_count", { ascending: false })
        .limit(14);

      if (data) setSidebarCategories(data as SidebarCategory[]);
      setLoadingCats(false);
    }
    load();
  }, [type]);

  // ── Filter counts filtered by product type ────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingFilters(true);
      const typeFilter = type === "digital" ? [...DIGITAL_TYPES] : [...PHYSICAL_TYPES];

      const [{ data: sd }, { data: dd }] = await Promise.all([
        supabase
          .from("products")
          .select("shipping_from")
          .eq("status", "active")
          .in("product_type", typeFilter as any[])
          .not("shipping_from", "is", null),
        supabase
          .from("products")
          .select("delivery_time")
          .eq("status", "active")
          .in("product_type", typeFilter as any[])
          .not("delivery_time", "is", null),
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

  const allCategories = [
    { name: "Trending Now", slug: "trending", product_count: null, icon: "Flame" },
    ...sidebarCategories,
  ];

  return (
    <aside
      className="hidden w-60 shrink-0 flex-col gap-0 lg:flex"
      style={{
        height: "calc(100vh - var(--navbar-height) - 2rem)",
        position: "sticky",
        top: "calc(var(--navbar-height) + 1rem)",
        overflowY: "auto",
        scrollbarWidth: "none",
      }}
    >
      <style>{`aside::-webkit-scrollbar { display: none; }`}</style>

      <div className="flex flex-col gap-3">

        {/* ── Categories ── */}
        <div
          className="rounded-md p-3"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-black" style={{ color: "var(--color-text-primary)" }}>
              Categories
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                style={{ background: type === "digital" ? "#7c3aed" : "var(--color-accent)" }}
              >
                {type === "digital" ? "Digital" : "Physical"}
              </span>
            </span>
            <button
              onClick={() => setCategory("Trending Now")}
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
                options={allCategories.map((c) => ({
                  label: c.product_count ? `${c.name} (${fmtCount(c.product_count)})` : c.name,
                  value: c.name,
                }))}
                value={filters.category ?? null}
                onChange={(v) => setCategory(v)}
                placeholder="Select category"
                searchable
                isClearable
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
          className="rounded-md p-3"
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
                  max={type === "digital" ? 500 : 5000}
                  step={type === "digital" ? 5 : 50}
                  value={[pending.priceRange[1]]}
                  onValueChange={(v) => setPriceRange([0, v[0] ?? 5000])}
                  className="py-1"
                />
                <div
                  className="mt-1.5 flex justify-between rounded-md px-2 py-1 text-[10px] font-semibold"
                  style={{ background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}
                >
                  <span>{formatMoney(0, "USD")}</span>
                  <span style={{ color: "var(--color-text-primary)" }}>
                    {pending.priceRange[1] >= (type === "digital" ? 500 : 5000)
                      ? `${formatMoney(type === "digital" ? 500 : 5000, "USD")}+`
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

              {/* Rating */}
              <div>
                <SectionLabel>
                  {type === "digital" ? "Product Rating" : "Supplier Rating"}
                </SectionLabel>
                <div className="flex flex-col gap-0.5">
                  {[4, 3].map((r) => (
                    <CheckRow
                      key={r}
                      label={`${r}+ stars`}
                      checked={pending.minRating === r}
                      onToggle={() => setMinRating(pending.minRating === r ? 0 : r)}
                    />
                  ))}
                </div>
              </div>

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

        {/* ── AI Shopping Assistant ── */}
        <div
          className="rounded-md p-3"
          style={{
            background: type === "digital"
              ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
              : "linear-gradient(135deg, var(--color-accent) 0%, #ff8c00 100%)",
          }}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-white" />
            <span className="text-xs font-black text-white">AI Shopping Assistant</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[8px] font-bold text-white">Beta</span>
          </div>
          <p className="mb-2.5 text-[10px] leading-relaxed text-white/75">
            {type === "digital"
              ? "Find top digital products, courses and tools."
              : "Find winning products, trending items and profitable opportunities."}
          </p>
          <form
            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 ring-1 ring-white/10 focus-within:ring-white/30 transition-all"
            onSubmit={(e) => {
              e.preventDefault();
              if (aiQuery.trim()) { setCategory("Trending Now"); setAiQuery(""); }
            }}
          >
            <input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder={type === "digital" ? "Find digital products..." : "Ask AI anything..."}
              className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/55"
            />
            <button
              type="submit"
              className="rounded p-0.5 transition-colors hover:bg-white/20"
            >
              <Send className="size-3 text-white" />
            </button>
          </form>
          <div className="mt-2.5 flex flex-wrap gap-1 text-[9px] font-semibold">
            {(type === "digital"
              ? ["Top courses", "AI tools", "Templates"]
              : ["Winning products", "Viral now", "High commission"]
            ).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCategory("Trending Now")}
                className="rounded-full bg-white/15 px-2 py-0.5 text-white transition-colors hover:bg-white/30"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Elite Club ── */}
        <div
          className="rounded-md p-3"
          style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <Crown className="size-3.5" style={{ color: "var(--color-accent)" }} />
            <span className="text-xs font-black" style={{ color: "var(--color-text-primary)" }}>
              Jimvio Elite Club
            </span>
            <span
              className="ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white"
              style={{ background: "var(--color-accent)" }}
            >
              New
            </span>
          </div>
          <ul className="mb-3 space-y-1 text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
            {["Exclusive perks", "Higher commissions", "VIP support"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="w-full rounded-lg py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--color-accent)" }}
          >
            Join Elite Now
          </button>
        </div>

      </div>
    </aside>
  );
}
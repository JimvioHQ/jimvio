"use client";

import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Product = Parameters<typeof ProductCardClient>[0]["p"];

export function ProductsCatalogClient({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: { id: string; name: string; slug: string }[];
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [source, setSource] = useState<"all" | "shopify" | "jimvio">("all");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");

  const filtered = useMemo(() => {
    return initialProducts.filter((p) => {
      if (q.trim() && !p.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
      if (cat !== "all") {
        const slug = p.product_categories && "slug" in p.product_categories ? (p.product_categories as { slug: string }).slug : null;
        if (slug !== cat) return false;
      }
      if (source === "shopify" && p.source !== "shopify") return false;
      if (source === "jimvio" && p.source === "shopify") return false;
      const price = Number(p.price);
      if (minP && price < Number(minP)) return false;
      if (maxP && price > Number(maxP)) return false;
      return true;
    });
  }, [initialProducts, q, cat, source, minP, maxP]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
        <div className="flex-1 max-w-md">
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm min-w-[160px]"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          {(["all", "jimvio", "shopify"] as const).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={source === s ? "default" : "outline"}
              onClick={() => setSource(s)}
            >
              {s === "all" ? "All sources" : s === "shopify" ? "Shopify" : "Jimvio"}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <Input label="Min price" type="number" value={minP} onChange={(e) => setMinP(e.target.value)} className="w-28" />
          <Input label="Max price" type="number" value={maxP} onChange={(e) => setMaxP(e.target.value)} className="w-28" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-text-secondary)]">
          No products match your filters.
        </div>
      ) : (
        <div className="product-grid md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCardClient key={p.id} p={p} detailBasePath="/products" />
          ))}
        </div>
      )}
    </div>
  );
}

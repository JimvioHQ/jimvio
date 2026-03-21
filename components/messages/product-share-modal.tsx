"use client";

import React, { useState } from "react";
import { Package, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ProductShareModal({
  onClose,
  onSelect,
  vendorId,
}: {
  onClose: () => void;
  onSelect: (product: { product_id: string; slug: string; name: string; price: number; image?: string }) => void;
  vendorId?: string | null;
}) {
  const [slug, setSlug] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; slug: string; price: number; images?: string[] }>>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function fetchBySlug() {
    const s = slug.trim();
    if (!s) return;
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, price, images")
      .eq("slug", s)
      .eq("status", "active")
      .maybeSingle();
    setLoading(false);
    if (data) {
      const img = Array.isArray(data.images) ? data.images[0] : (data.images as string[])?.[0];
      onSelect({
        product_id: data.id,
        slug: data.slug,
        name: data.name,
        price: Number(data.price),
        image: img,
      });
      onClose();
    }
  }

  async function searchProducts() {
    const q = search.trim();
    if (!q) return;
    setLoading(true);
    let query = supabase
      .from("products")
      .select("id, name, slug, price, images")
      .eq("status", "active")
      .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
      .limit(10);
    if (vendorId) query = query.eq("vendor_id", vendorId);
    const { data } = await query;
    setLoading(false);
    setResults((data ?? []).map((r) => ({ ...r, images: r.images as string[] })));
  }

  function selectProduct(p: { id: string; name: string; slug: string; price: number; images?: string[] }) {
    const img = Array.isArray(p.images) ? p.images[0] : p.images?.[0];
    onSelect({
      product_id: p.id,
      slug: p.slug,
      name: p.name,
      price: Number(p.price),
      image: img,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-darker/50" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Package className="h-5 w-5 text-[var(--color-accent)]" /> Share product
          </h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-secondary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Product slug (e.g. my-product)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchBySlug()}
              className="rounded-xl flex-1"
            />
            <Button type="button" onClick={fetchBySlug} disabled={loading} className="rounded-xl shrink-0">
              {loading ? "…" : "Load"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchProducts()}
              className="rounded-xl flex-1"
            />
            <Button type="button" variant="outline" onClick={searchProducts} disabled={loading} className="rounded-xl shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectProduct(p)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-left"
            >
              {p.images?.[0] && (
                <img src={p.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{Number(p.price).toLocaleString()} RWF</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

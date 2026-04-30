"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Search, TrendingUp, Edit, Trash2,
  Package, AlertCircle, Store, MousePointer,
  Eye, Box, Loader2, ArrowUpRight, MoreHorizontal,
  Zap, ShoppingBag, ShoppingCart,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import { Input } from "@/components/ui/input";

/* ── status config ── */
const STATUS = {
  active: { label: "Active", dot: "bg-emerald-500", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
  paused: { label: "Paused", dot: "bg-amber-500", badge: "bg-amber-500/10  border-amber-500/20  text-amber-500" },
  draft: { label: "Draft", dot: "bg-[var(--color-text-muted)]", badge: "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]" },
  archived: { label: "Archived", dot: "bg-rose-500", badge: "bg-rose-500/10   border-rose-500/20   text-rose-500" },
} as Record<string, { label: string; dot: string; badge: string }>;

const FILTERS = ["All", "Active", "Digital", "Physical", "Low Stock"] as const;
type Filter = typeof FILTERS[number];

/* ── stat card ── */
function StatCard({ icon: Icon, color, value, label }: {
  icon: React.ElementType; color: string; value: number | string; label: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {value}
        </p>
        <p className="text-[10px] uppercase tracking-widest font-medium mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { formatMoney } = useCurrency();
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [filtered, setFiltered] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setFilter] = useState<Filter>("All");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userVendors } = await supabase.from("vendors").select("*").eq("user_id", user.id);
      setVendor(userVendors?.[0] || null);

      if (userVendors && userVendors.length > 0) {
        const vendorIds = userVendors.map(v => v.id);
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, slug, price, currency, status, product_type, images, inventory_quantity, sale_count, is_digital, created_at, vendor_id")
          .in("vendor_id", vendorIds)
          .order("created_at", { ascending: false });
        setProducts(prods ?? []);
        setFiltered(prods ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    let result = products;
    if (search) result = result.filter(p => (p.name as string)?.toLowerCase().includes(search.toLowerCase()));
    if (activeFilter === "Active") result = result.filter(p => p.status === "active");
    if (activeFilter === "Digital") result = result.filter(p => p.is_digital === true);
    if (activeFilter === "Physical") result = result.filter(p => p.is_digital === false);
    if (activeFilter === "Low Stock") result = result.filter(p => !p.is_digital && (p.inventory_quantity as number) <= 5);
    setFiltered(result);
  }, [search, activeFilter, products]);

  async function toggleStatus(productId: string, currentStatus: string) {
    const supabase = createClient();
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const { error } = await supabase.from("products").update({ status: newStatus }).eq("id", productId);
    if (!error) setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
    setOpenMenu(null);
  }

  async function deleteProduct(productId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("products").update({ is_active: false, status: "archived" }).eq("id", productId);
    if (!error) setProducts(prev => prev.filter(p => p.id !== productId));
    setOpenMenu(null);
  }

  const active = products.filter(p => p.status === "active").length;
  const lowStock = products.filter(p => !p.is_digital && (p.inventory_quantity as number) <= 5).length;
  const total = products.reduce((s, p) => s + ((p.sale_count as number) || 0), 0);
  const digital = products.filter(p => p.is_digital).length;

  /* ── loading ── */
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "var(--color-bg)" }}>
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <Box className="h-6 w-6" style={{ color: "var(--color-accent)" }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Loading products</p>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Fetching your inventory…</p>
      </div>
      <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--color-text-muted)" }} />
    </div>
  );

  /* ── no vendor ── */
  if (!vendor) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-sm w-full text-center space-y-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <Store className="h-7 w-7" style={{ color: "var(--color-text-muted)" }} />
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>Vendor account required</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            You need an active vendor account to manage products.
          </p>
        </div>
        <Link
          href="/dashboard/activate/vendor"
          className="block w-full h-11 rounded-2xl text-sm font-semibold flex items-center justify-center transition-all"
          style={{ background: "var(--color-accent)", color: "#fff" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
        >
          Become a vendor
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "var(--color-accent-light)" }}
              >
                <Package className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                Inventory
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              My Products
              <span className="ml-2.5 text-lg font-normal" style={{ color: "var(--color-text-muted)" }}>
                ({products.length})
              </span>
            </h1>
          </div>

          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition-all shrink-0"
            style={{
              background: "var(--color-accent)", color: "#fff",
              boxShadow: "0 0 20px rgba(253,80,0,0.2)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
          >
            <Plus className="h-4 w-4" />
            Add product
          </Link>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={ShoppingBag} color="bg-orange-500/10 text-orange-500" value={active} label="Active" />
          <StatCard icon={ShoppingCart} color="bg-emerald-500/10 text-emerald-500" value={total} label="Total sales" />
          <StatCard icon={AlertCircle} color="bg-rose-500/10 text-rose-500" value={lowStock} label="Low stock" />
          <StatCard icon={MousePointer} color="bg-sky-500/10 text-sky-500" value={digital} label="Digital" />
        </div>

        {/* ── Filters bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Input
              value={search}
              icon={<Search className="w-3.5 h-3.5"  />}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className={cn(
                "w-full h-10 pl-9 pr-4 rounded-xl border text-sm font-medium outline-none transition-all duration-150",
                "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              )}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="shrink-0 px-4 h-10 rounded-xl text-xs font-semibold transition-all"
                style={
                  activeFilter === f
                    ? { background: "var(--color-text-primary)", color: "var(--color-bg)", border: "1px solid transparent" }
                    : { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }
                }
                onMouseEnter={e => { if (activeFilter !== f) (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)"; }}
                onMouseLeave={e => { if (activeFilter !== f) (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Product list ── */}
        {filtered.length === 0 ? (
          <div
            className="py-24 text-center rounded-2xl border"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <Package className="h-8 w-8 mx-auto mb-4" style={{ color: "var(--color-border-strong)" }} />
            <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
              No products found
            </h3>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              {search ? `No matches for "${search}"` : "Add your first product to get started."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(p => {
              const s = STATUS[p.status as string] ?? STATUS.draft;
              const img = (p.images as string[])?.[0];
              const isLowStock = !p.is_digital && (p.inventory_quantity as number) <= 5;
              const id = p.id as string;

              return (
                <div
                  key={id}
                  className="group flex items-center gap-4 p-4 rounded-2xl transition-all"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-border-strong)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0"
                    style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={p.name as string}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5" style={{ color: "var(--color-border-strong)" }} />
                      </div>
                    )}
                    {!!p.is_digital && (
                      <div className="absolute inset-0 flex items-end p-1">
                        <span
                          className="text-[8px] font-bold text-white px-1 py-0.5 rounded-md uppercase tracking-wide"
                          style={{ background: "var(--color-accent)" }}
                        >
                          Digital
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <button
                      onClick={() => toggleStatus(id, p.status as string)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all hover:opacity-75",
                        s.badge
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                      {s.label}
                    </button>

                    <h3
                      className="text-sm sm:text-base font-semibold truncate transition-colors"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {p.name as string}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                      <span className="text-sm font-semibold font-mono" style={{ color: "var(--color-text-primary)" }}>
                        {parseFloat(p.price as string) === 0
                          ? <span className="text-emerald-500">Free</span>
                          : formatMoney(Number(p.price), (p.currency as string) || undefined)
                        }
                      </span>

                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        <TrendingUp className="w-3 h-3" />
                        {(p.sale_count as number) || 0} sales
                      </span>

                      {!p.is_digital && (
                        <span className={cn(
                          "flex items-center gap-1.5 text-xs font-medium",
                          isLowStock ? "text-rose-500" : ""
                        )}
                          style={!isLowStock ? { color: "var(--color-text-muted)" } : {}}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", isLowStock ? "bg-rose-500 animate-pulse" : "bg-[var(--color-border-strong)]")} />
                          {(p.inventory_quantity as number) || 0} in stock
                          {isLowStock && " — Low"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/dashboard/products/${id}/edit`}
                      className="hidden sm:flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: "var(--color-surface-secondary)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-muted)",
                      }}
                      onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.borderColor = "var(--color-border-strong)"); }}
                      onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); }}
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </Link>

                    <Link
                      href={`/product/${p.slug}`}
                      target="_blank"
                      className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl transition-all"
                      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                      onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.borderColor = "var(--color-border-strong)"); }}
                      onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); }}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>

                    {/* Overflow menu */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === id ? null : id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                        style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                        onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.borderColor = "var(--color-border-strong)"); }}
                        onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); }}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {openMenu === id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                          <div
                            className="absolute right-0 top-10 z-20 w-44 rounded-2xl shadow-xl overflow-hidden"
                            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                          >
                            {[
                              { href: `/dashboard/products/${id}/edit`, icon: Edit, label: "Edit product", danger: false },
                              { href: `/product/${p.slug}`, icon: Eye, label: "View live", danger: false, target: "_blank" },
                            ].map(({ href, icon: Icon, label, target }) => (
                              <Link
                                key={label}
                                href={href}
                                target={target}
                                onClick={() => setOpenMenu(null)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                                style={{ color: "var(--color-text-secondary)" }}
                                onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.background = "var(--color-surface-secondary)"); }}
                                onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-secondary)"); (e.currentTarget.style.background = "transparent"); }}
                              >
                                <Icon className="w-3.5 h-3.5" /> {label}
                              </Link>
                            ))}
                            <button
                              onClick={() => toggleStatus(id, p.status as string)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                              style={{ color: "var(--color-text-secondary)" }}
                              onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.background = "var(--color-surface-secondary)"); }}
                              onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-secondary)"); (e.currentTarget.style.background = "transparent"); }}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              {p.status === "active" ? "Pause" : "Activate"}
                            </button>
                            <div style={{ borderTop: "1px solid var(--color-border)" }} />
                            <button
                              onClick={() => deleteProduct(id, p.name as string)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-500 transition-colors"
                              onMouseEnter={e => { (e.currentTarget.style.background = "rgba(239,68,68,0.05)"); }}
                              onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
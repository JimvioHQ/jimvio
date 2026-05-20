"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, TrendingUp, Edit, Trash2, Archive, RotateCcw,
  Package, AlertCircle, Store, MousePointer,
  Eye, Box, Loader2, ArrowUpRight, MoreHorizontal,
  Zap, ShoppingBag, ShoppingCart, Copy, Filter as FilterIcon,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";
import { Vend_Sans } from "next/font/google";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductStatus = "active" | "paused" | "draft" | "archived";

type Product = Pick<Database["public"]["Tables"]["products"]["Row"],
  | "id" | "name" | "slug" | "price" | "currency" | "status" | "product_type"
  | "images" | "inventory_quantity" | "sale_count" | "is_digital"
  | "created_at" | "vendor_id" | "is_active" | "view_count" | "rating"
  | "review_count" | "track_inventory" | "low_stock_threshold"
  | "deleted_at"
>;

type Vendor = Database["public"]["Tables"]["vendors"]["Row"];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<ProductStatus, { label: string; dot: string; badge: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  paused: { label: "Paused", dot: "bg-amber-500", badge: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" },
  draft: { label: "Draft", dot: "bg-slate-400", badge: "bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400" },
  archived: { label: "Archived", dot: "bg-rose-500", badge: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" },
};

const FILTERS = [
  "All", "Active", "Paused", "Draft", "Archived",
  "Digital", "Physical", "Low Stock", "Out of Stock",
] as const;

type Filter = typeof FILTERS[number];

const PAGE_SIZE = 24;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLowStock(p: Product): boolean {
  if (p.is_digital || !p.track_inventory) return false;
  const threshold = p.low_stock_threshold ?? 5;
  return (p.inventory_quantity ?? 0) <= threshold && (p.inventory_quantity ?? 0) > 0;
}

function getOutOfStock(p: Product): boolean {
  if (p.is_digital || !p.track_inventory) return false;
  return (p.inventory_quantity ?? 0) === 0;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, tone, value, label, href,
}: {
  icon: React.ElementType;
  tone: "orange" | "emerald" | "rose" | "sky";
  value: number | string;
  label: string;
  href?: string;
}) {
  const tones = {
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };

  const inner = (
    <div className="rounded-2xl p-5 flex flex-col gap-4 bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] transition-all">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", tones[tone])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
          {value}
        </p>
        <p className="text-[10px] uppercase tracking-widest font-medium mt-0.5 text-[var(--color-text-muted)]">
          {label}
        </p>
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter();
  const { formatMoney } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data: vendorRow, error: vendorError } = await supabase
      .from("vendors")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (vendorError) {
      console.error("Vendor lookup failed:", vendorError);
      toast.error("Couldn't load vendor profile");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setVendor(vendorRow);

    if (!vendorRow) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data: prods, error: prodsError } = await supabase
      .from("products")
      .select(
        `id, name, slug, price, currency, status, product_type, images,
         inventory_quantity, sale_count, is_digital, created_at, vendor_id,
         is_active, view_count, rating, review_count, track_inventory,
         low_stock_threshold, deleted_at`
      )
      .eq("vendor_id", vendorRow.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    console.log({ vendorRow, prodsError })
    if (prodsError) {
      console.error("Products query failed:", prodsError);
      toast.error("Couldn't load products");
    } else {
      setProducts((prods ?? []) as Product[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived: filtered list ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = products;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }

    switch (activeFilter) {
      case "Active": result = result.filter((p) => p.status === "active"); break;
      case "Paused": result = result.filter((p) => p.status === "paused"); break;
      case "Draft": result = result.filter((p) => p.status === "draft"); break;
      case "Archived": result = result.filter((p) => p.status === "archived"); break;
      case "Digital": result = result.filter((p) => p.is_digital); break;
      case "Physical": result = result.filter((p) => !p.is_digital); break;
      case "Low Stock": result = result.filter(getLowStock); break;
      case "Out of Stock": result = result.filter(getOutOfStock); break;
    }

    return result;
  }, [products, search, activeFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [search, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Stats (computed over full product list) ─────────────────────────────
  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === "active").length;
    const lowStock = products.filter(getLowStock).length;
    const outOfStock = products.filter(getOutOfStock).length;
    const digital = products.filter((p) => p.is_digital).length;
    const totalSales = products.reduce((s, p) => s + (p.sale_count ?? 0), 0);
    const totalViews = products.reduce((s, p) => s + (p.view_count ?? 0), 0);
    return { active, lowStock, outOfStock, digital, totalSales, totalViews };
  }, [products]);


  // ── Actions ──────────────────────────────────────────────────────────────
  const toggleStatus = useCallback(async (productId: string, currentStatus: ProductStatus) => {
    if (busyId) {
      toast.error("Please wait...");
      return;
    };
    setBusyId(productId);
    setOpenMenu(null);

    const newStatus: ProductStatus = currentStatus === "active" ? "paused" : "active";

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p))
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", productId);

    if (error) {
      console.error("Status update failed:", error);
      toast.error("Couldn't update status");
      // Roll back
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: currentStatus } : p))
      );
    } else {
      toast.success(newStatus === "active" ? "Product activated" : "Product paused");
    }

    setBusyId(null);
  }, [busyId]);

  const archiveProduct = useCallback(async (productId: string, name: string) => {
    if (busyId) return;
    if (!confirm(`Archive "${name}"? It will be hidden from your store but kept in your records.`)) return;

    setBusyId(productId);
    setOpenMenu(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ status: "archived", is_active: false })
      .eq("id", productId);

    if (error) {
      console.error("Archive failed:", error);
      toast.error("Couldn't archive product");
    } else {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, status: "archived" as ProductStatus, is_active: false } : p
        )
      );
      toast.success("Product archived");
    }

    setBusyId(null);
  }, [busyId]);

  const restoreProduct = useCallback(async (productId: string) => {
    if (busyId) return;
    setBusyId(productId);
    setOpenMenu(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ status: "draft", is_active: true })
      .eq("id", productId);

    if (error) {
      console.error("Restore failed:", error);
      toast.error("Couldn't restore product");
    } else {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, status: "draft" as ProductStatus, is_active: true } : p
        )
      );
      toast.success("Product restored as draft");
    }

    setBusyId(null);
  }, [busyId]);

  const deleteProduct = useCallback(async (productId: string, name: string) => {
    if (busyId) return;
    if (!confirm(`Permanently delete "${name}"?\n\nThis cannot be undone. Products with orders cannot be deleted.`)) return;

    setBusyId(productId);
    setOpenMenu(null);

    const supabase = createClient();

    // Soft delete via deleted_at — your guard_product_delete trigger blocks
    // hard deletes when orders reference. Soft delete preserves order history.
    const { error } = await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString(), is_active: false, status: "archived" })
      .eq("id", productId);

    if (error) {
      console.error("Delete failed:", error);
      toast.error("Couldn't delete product");
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Product deleted");
    }

    setBusyId(null);
  }, [busyId]);

  const duplicateProduct = useCallback(async (productId: string) => {
    if (busyId) return;
    setBusyId(productId);
    setOpenMenu(null);

    const supabase = createClient();
    const { data: source, error: fetchErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (fetchErr || !source) {
      toast.error("Couldn't duplicate product");
      setBusyId(null);
      return;
    }

    // Strip server-managed fields, generate a new slug
    const newSlug = `${source.slug}-copy-${Date.now().toString(36)}`;

    type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

    const payload: ProductInsert = {
      ...source,
      id: undefined as unknown as ProductInsert["id"],
      slug: newSlug,
      name: `${source.name} (Copy)`,
      status: "draft",
      sale_count: 0,
      view_count: 0,
      rating: 0,
      review_count: 0,
      wishlist_count: 0,
      published_at: null,
      created_at: undefined as unknown as ProductInsert["created_at"],
      updated_at: undefined as unknown as ProductInsert["updated_at"],
      deleted_at: null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (insertErr || !inserted) {
      console.error("Duplicate failed:", insertErr);
      toast.error("Couldn't duplicate product");
    } else {
      setProducts((prev) => [inserted as Product, ...prev]);
      toast.success("Product duplicated as draft");
    }

    setBusyId(null);
  }, [busyId]);

  // ── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[var(--color-bg)]">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
          <Box className="h-6 w-6 text-[var(--color-accent)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Loading products</p>
          <p className="text-xs mt-1 text-[var(--color-text-muted)]">Fetching your inventory…</p>
        </div>
        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  // ── No vendor account ───────────────────────────────────────────────────
  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--color-bg)]">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
            <Store className="h-7 w-7 text-[var(--color-text-muted)]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Vendor account required
            </h3>
            <p className="text-sm mt-2 leading-relaxed text-[var(--color-text-muted)]">
              You need an active vendor account to manage products.
            </p>
          </div>
          <Link
            href="/dashboard/activate/vendor"
            className="inline-flex w-full h-11 rounded-2xl text-sm font-semibold items-center justify-center transition-all bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
          >
            Become a vendor
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-bg)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--color-accent-light)]">
                <Package className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                Inventory
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              My Products
              <span className="ml-2.5 text-lg font-normal text-[var(--color-text-muted)] tabular-nums">
                ({products.length})
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => load()}
              disabled={refreshing}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm transition-all bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
              title="Refresh"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </button>

            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition-all bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shrink-0"
              style={{ boxShadow: "0 0 20px rgba(253,80,0,0.2)" }}
            >
              <Plus className="h-4 w-4" />
              Add product
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={ShoppingBag} tone="orange" value={stats.active.toLocaleString()} label="Active" />
          <StatCard icon={ShoppingCart} tone="emerald" value={stats.totalSales.toLocaleString()} label="Total sales" />
          <StatCard
            icon={AlertCircle}
            tone="rose"
            value={(stats.lowStock + stats.outOfStock).toLocaleString()}
            label={stats.outOfStock > 0 ? `${stats.outOfStock} out of stock` : "Low stock"}
          />
          <StatCard icon={MousePointer} tone="sky" value={stats.digital.toLocaleString()} label="Digital" />
        </div>

        {/* ── Filters bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Input
              value={search}
              icon={<Search className="w-3.5 h-3.5" />}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or slug…"
              className={cn(
                "w-full h-10 pl-9 pr-4 rounded-xl border text-sm font-medium outline-none transition-all duration-150",
                "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              )}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto">
            {FILTERS.map((f) => {
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    "shrink-0 px-4 h-10 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                    isActive
                      ? "bg-[var(--color-text-primary)] text-[var(--color-bg)]"
                      : "bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:ring-[var(--color-border-strong)]"
                  )}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Results summary ── */}
        {(search || activeFilter !== "All") && (
          <p className="text-xs text-[var(--color-text-muted)] -mt-3">
            Showing {filtered.length} of {products.length} products
            {search && ` matching "${search}"`}
            {activeFilter !== "All" && ` in ${activeFilter}`}
          </p>
        )}

        {/* ── Product list ── */}
        {pageItems.length === 0 ? (
          <EmptyState
            search={search}
            activeFilter={activeFilter}
            hasAnyProducts={products.length > 0}
          />
        ) : (
          <>
            <div className="space-y-2.5">
              {pageItems.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  openMenu={openMenu}
                  busyId={busyId}
                  setOpenMenu={setOpenMenu}
                  toggleStatus={toggleStatus}
                  archiveProduct={archiveProduct}
                  restoreProduct={restoreProduct}
                  deleteProduct={deleteProduct}
                  duplicateProduct={duplicateProduct}
                  formatMoney={formatMoney}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 px-3 rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 px-3 rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Product row ──────────────────────────────────────────────────────────────

function ProductRow({
  product: p,
  openMenu,
  busyId,
  setOpenMenu,
  toggleStatus,
  archiveProduct,
  restoreProduct,
  deleteProduct,
  duplicateProduct,
  formatMoney,
}: {
  product: Product;
  openMenu: string | null;
  busyId: string | null;
  setOpenMenu: (id: string | null) => void;
  toggleStatus: (id: string, status: ProductStatus) => void;
  archiveProduct: (id: string, name: string) => void;
  restoreProduct: (id: string) => void;
  deleteProduct: (id: string, name: string) => void;
  duplicateProduct: (id: string) => void;
  formatMoney: (amount: number, currency?: string) => string;
}) {
  const status = (p.status ?? "draft") as ProductStatus;
  const s = STATUS[status];
  const img = (p.images as string[] | null)?.[0];
  const isLowStock = getLowStock(p);
  const isOutOfStock = getOutOfStock(p);
  const isArchived = status === "archived";
  const isBusy = busyId === p.id;

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 rounded-2xl transition-all bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)]",
        isBusy && "opacity-60 pointer-events-none"
      )}
    >
      {/* Thumbnail */}
      <Link
        href={`/dashboard/products/${p.id}/edit`}
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)]"
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={p.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-[var(--color-border-strong)]" />
          </div>
        )}
        {p.is_digital && (
          <div className="absolute inset-0 flex items-end p-1">
            <span className="text-[8px] font-bold text-white px-1 py-0.5 rounded-md uppercase tracking-wide bg-[var(--color-accent)]">
              Digital
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <button
          onClick={() => !isArchived && toggleStatus(p.id, status)}
          disabled={isArchived || isBusy}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 text-[10px] font-semibold transition-all",
            !isArchived && !isBusy && "hover:opacity-75 cursor-pointer",
            isArchived && "cursor-not-allowed",
            s.badge
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
          {s.label}
        </button>

        <Link
          href={`/dashboard/products/${p.id}/edit`}
          className="block text-sm sm:text-base font-semibold truncate hover:text-orange-500 transition-colors text-[var(--color-text-primary)]"
        >
          {p.name}
        </Link>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="text-sm font-semibold font-mono text-[var(--color-text-primary)]">
            {Number(p.price) === 0 ? (
              <span className="text-emerald-500">Free</span>
            ) : (
              formatMoney(Number(p.price), p.currency ?? undefined)
            )}
          </span>

          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
            <TrendingUp className="w-3 h-3" />
            <span className="tabular-nums">{(p.sale_count ?? 0).toLocaleString()}</span> sales
          </span>

          {(p.view_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Eye className="w-3 h-3" />
              <span className="tabular-nums">{(p.view_count ?? 0).toLocaleString()}</span> views
            </span>
          )}

          {!p.is_digital && p.track_inventory && (
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium tabular-nums",
                isOutOfStock ? "text-rose-500" : isLowStock ? "text-amber-500" : "text-[var(--color-text-muted)]"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isOutOfStock ? "bg-rose-500 animate-pulse" :
                    isLowStock ? "bg-amber-500 animate-pulse" :
                      "bg-[var(--color-border-strong)]"
                )}
              />
              {(p.inventory_quantity ?? 0)} in stock
              {isOutOfStock && " — Out"}
              {isLowStock && " — Low"}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/dashboard/products/${p.id}/edit`}
          className="hidden sm:flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-xs font-semibold transition-all bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <Edit className="w-3 h-3" /> Edit
        </Link>

        {status === "active" && (
          <Link
            href={`/product/${p.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl transition-all bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            title="View live"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {/* Overflow menu */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
            disabled={isBusy}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreHorizontal className="w-4 h-4" />
            )}
          </button>

          {openMenu === p.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenMenu(null)}
              />
              <div className="absolute right-0 top-10 z-20 w-48 rounded-2xl shadow-xl overflow-hidden bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
                <MenuItem
                  href={`/dashboard/products/${p.id}/edit`}
                  icon={Edit}
                  label="Edit product"
                  onClick={() => setOpenMenu(null)}
                />

                {status === "active" && (
                  <MenuItem
                    href={`/product/${p.slug}`}
                    target="_blank"
                    icon={Eye}
                    label="View live"
                    onClick={() => setOpenMenu(null)}
                  />
                )}

                <MenuButton
                  icon={Copy}
                  label="Duplicate"
                  onClick={() => duplicateProduct(p.id)}
                />

                {!isArchived && (
                  <MenuButton
                    icon={Zap}
                    label={status === "active" ? "Pause" : "Activate"}
                    onClick={() => toggleStatus(p.id, status)}
                  />
                )}

                <div className="border-t border-[var(--color-border)]" />

                {isArchived ? (
                  <>
                    <MenuButton
                      icon={RotateCcw}
                      label="Restore as draft"
                      onClick={() => restoreProduct(p.id)}
                    />
                    <MenuButton
                      icon={Trash2}
                      label="Delete permanently"
                      onClick={() => deleteProduct(p.id, p.name)}
                      danger
                    />
                  </>
                ) : (
                  <MenuButton
                    icon={Archive}
                    label="Archive"
                    onClick={() => archiveProduct(p.id, p.name)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Menu items ───────────────────────────────────────────────────────────────

function MenuItem({
  href, icon: Icon, label, target, onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  target?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      target={target}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

function MenuButton({
  icon: Icon, label, onClick, danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
        danger
          ? "text-rose-500 hover:bg-rose-500/5"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  search, activeFilter, hasAnyProducts,
}: {
  search: string;
  activeFilter: Filter;
  hasAnyProducts: boolean;
}) {
  const hasFilters = search.length > 0 || activeFilter !== "All";

  return (
    <div className="py-24 text-center rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
      <Package className="h-8 w-8 mx-auto mb-4 text-[var(--color-border-strong)]" />
      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
        {!hasAnyProducts ? "No products yet" : hasFilters ? "No matches found" : "No products"}
      </h3>
      <p className="text-sm mt-1 text-[var(--color-text-muted)]">
        {!hasAnyProducts
          ? "Add your first product to start selling."
          : search
            ? `No products match "${search}"`
            : `No products in ${activeFilter}`}
      </p>
      {!hasAnyProducts && (
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition-all bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white mt-6"
        >
          <Plus className="h-4 w-4" />
          Add your first product
        </Link>
      )}
    </div>
  );
}
"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus, Search, Edit, Trash2, Archive, RotateCcw,
  Package, AlertCircle, Store, AlertTriangle,
  Eye, Box, Loader2, MoreHorizontal,
  Zap, Copy, FileText, Bell, BarChart3,
  ChevronRight, ChevronLeft, ChevronDown, LayoutGrid, List,
  RefreshCw, ArrowRight, SlidersHorizontal, Image as ImageIcon, Play, Tag,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn, getImage } from "@/lib/utils";
import { toast } from "sonner";
import { appConfirm } from "@/lib/app-dialog";
import type { Database } from "@/types/supabase";
import {
  lookupVendorsByUserId,
  vendorLookupToastMessage,
  type VendorRow,
} from "@/lib/vendor/lookup";
import { duplicateSellerProduct } from "@/lib/actions/seller-products";
import {
  MORE_PRODUCT_FILTERS,
  PRIMARY_PRODUCT_FILTERS,
  PRODUCT_PAGE_SIZES,
  PRODUCT_SORTS,
  TYPE_PRODUCT_FILTERS,
  compareCatalogProducts,
  countProductFilters,
  formatCatalogDate,
  isLowStock,
  isOutOfStock,
  matchesProductFilter,
  matchesProductSearch,
  productTypeLabel,
  showingProductsLabel,
  stockText,
  type ProductFilter,
  type ProductSortKey,
} from "@/lib/seller/product-inventory";

/** Columns the seller list shows (never cost or private file fields; those stay server-side). */
const SELLER_LIST_COLUMNS = `id, name, slug, price, currency, status, product_type, images,
         inventory_quantity, sale_count, is_digital, created_at, updated_at, vendor_id,
         is_active, view_count, rating, review_count, track_inventory,
         low_stock_threshold, deleted_at`;

type ProductStatus = "active" | "paused" | "draft" | "archived" | "pending_review" | "rejected";

type Product = Pick<Database["public"]["Tables"]["products"]["Row"],
  | "id" | "name" | "slug" | "price" | "currency" | "status" | "product_type"
  | "images" | "inventory_quantity" | "sale_count" | "is_digital"
  | "created_at" | "updated_at" | "vendor_id" | "is_active" | "view_count" | "rating"
  | "review_count" | "track_inventory" | "low_stock_threshold"
  | "deleted_at"
>;

type Vendor = VendorRow;

const STATUS: Record<ProductStatus, { label: string; dot: string; badge: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  paused: { label: "Paused", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
  draft: { label: "Draft", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600" },
  archived: { label: "Archived", dot: "bg-slate-600", badge: "bg-slate-100 text-slate-600" },
  pending_review: { label: "In review", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700" },
  rejected: { label: "Rejected", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700" },
};

function productImageUrl(images: unknown): string | null {
  const url = getImage(images);
  if (!url || url === "/placeholder.png") return null;
  return url;
}

function stockClass(text: string): string {
  if (text === "Out of stock") return "font-medium text-rose-600";
  if (text.startsWith("Low")) return "font-medium text-amber-600";
  if (text === "—") return "text-[#9CA3AF]";
  return "text-[#111827]";
}

export function SellerProductsPage() {
  const pathname = usePathname();
  const embedded = pathname.startsWith("/ugc/");
  const { formatMoney } = useCurrency();
  const searchId = useId();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendorLookupError, setVendorLookupError] = useState<string | null>(null);
  const [productLoadError, setProductLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProductFilter>("All");
  const [sort, setSort] = useState<ProductSortKey>("newest");
  const [view, setView] = useState<"list" | "grid">("list");
  const [pageSize, setPageSize] = useState<(typeof PRODUCT_PAGE_SIZES)[number]>(10);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const vendorLookup = await lookupVendorsByUserId(supabase, user.id, "*");
    if (!vendorLookup.ok) {
      const message = vendorLookupToastMessage(vendorLookup);
      console.error("Vendor lookup failed:", vendorLookup.code, vendorLookup.error);
      setVendorLookupError(message);
      toast.error(message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (vendorLookup.multipleMatches) {
      console.warn(
        `Multiple vendor profiles (${vendorLookup.vendors.length}) for user ${user.id}; using primary vendor ${vendorLookup.vendor?.id}`
      );
    }

    setVendorLookupError(null);
    setVendor(vendorLookup.vendor);

    if (!vendorLookup.vendor) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data: prods, error: prodsError } = await supabase
      .from("products")
      .select(SELLER_LIST_COLUMNS)
      .eq("vendor_id", vendorLookup.vendor.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (prodsError) {
      console.error("Products query failed:", prodsError);
      setProductLoadError("Couldn't load products. Check your connection and try again.");
      toast.error("Couldn't load products");
    } else {
      setProductLoadError(null);
      setProducts((prods ?? []) as Product[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    // Catalog data is fetched from Supabase after mount. This client page has no server payload.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const searched = useMemo(
    () => products.filter((p) => matchesProductSearch(p, search)),
    [products, search],
  );

  const filterCounts = useMemo(() => countProductFilters(searched), [searched]);

  const filtered = useMemo(() => {
    const result = activeFilter === "All"
      ? searched
      : searched.filter((p) => matchesProductFilter(p, activeFilter));
    return [...result].sort(compareCatalogProducts(sort));
  }, [searched, activeFilter, sort]);

  function resetPage() {
    setPage(1);
    setSelected([]);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageIds = pageItems.map((p) => p.id);
  const selectedOnPage = pageIds.filter((id) => selected.includes(id));
  const allPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected;

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === "active").length;
    const lowStock = products.filter(isLowStock).length;
    const outOfStock = products.filter(isOutOfStock).length;
    const digital = products.filter((p) => p.is_digital).length;
    const totalSales = products.reduce((s, p) => s + (p.sale_count ?? 0), 0);
    return { active, lowStock, outOfStock, digital, totalSales };
  }, [products]);

  const toggleStatus = useCallback(async (productId: string, currentStatus: ProductStatus, isDigital = false) => {
    if (busyId) {
      toast.error("Please wait...");
      return;
    }
    setBusyId(productId);
    setOpenMenu(null);

    if (currentStatus === "pending_review" || currentStatus === "rejected") {
      toast.error("Submitted products stay in review until an authorized reviewer publishes them.");
      setBusyId(null);
      return;
    }
    const newStatus: ProductStatus = currentStatus === "active" ? "paused" : "active";
    if (isDigital && newStatus === "active") {
      toast.error("Digital products are published from verification review, not from this switch.");
      setBusyId(null);
      return;
    }

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
    const archiveConfirmed = await appConfirm({
      title: "Archive product",
      description: `Archive "${name}"? It will be hidden from your store but kept in your records.`,
      confirmLabel: "Archive",
      variant: "default",
    });
    if (!archiveConfirmed) return;

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
    const deleteConfirmed = await appConfirm({
      title: "Delete product",
      description: `Permanently delete "${name}"? This cannot be undone. Products with orders cannot be deleted.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!deleteConfirmed) return;

    setBusyId(productId);
    setOpenMenu(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString(), is_active: false, status: "archived" })
      .eq("id", productId);

    if (error) {
      console.error("Delete failed:", error);
      toast.error("Couldn't delete product");
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setSelected((prev) => prev.filter((id) => id !== productId));
      toast.success("Product deleted");
    }

    setBusyId(null);
  }, [busyId]);

  const duplicateProduct = useCallback(async (productId: string) => {
    if (busyId) return;
    setBusyId(productId);
    setOpenMenu(null);

    const result = await duplicateSellerProduct(productId);
    if (!result.success) {
      toast.error(
        result.code === "business_verification_required"
          ? "Business verification is required to duplicate physical products."
          : result.error || "Couldn't duplicate product",
      );
      setBusyId(null);
      return;
    }

    const supabase = createClient();
    const { data: inserted } = await supabase
      .from("products")
      .select(SELLER_LIST_COLUMNS)
      .eq("id", result.id)
      .maybeSingle();
    if (inserted) {
      setProducts((prev) => [inserted as Product, ...prev]);
    }
    toast.success(result.message || "Product duplicated as draft");
    setBusyId(null);
  }, [busyId]);

  function togglePageSelection(on: boolean) {
    setSelected(on ? pageIds : []);
  }

  function toggleRowSelection(id: string, on: boolean) {
    setSelected((prev) => {
      const without = prev.filter((item) => item !== id && pageIds.includes(item));
      return on ? [...without, id] : without;
    });
  }

  const shell = (
    <div className={cn("overflow-x-clip bg-[#F8FAFC] text-[#111827]", embedded ? "min-w-0" : "min-h-[calc(100dvh-var(--navbar-height,72px))]")}>
      <div className={cn("mx-auto w-full max-w-[1440px]", embedded ? "py-1" : "px-4 py-6 sm:px-6 lg:px-8")}>
        {loading ? (
          <ProductsLoadingState />
        ) : vendorLookupError ? (
          <StatusPanel
            icon={<AlertCircle className="h-6 w-6 text-rose-500" />}
            title="Could not load vendor profile"
            message={vendorLookupError}
            action={<button type="button" onClick={() => load()} className={secondaryBtn}>Try again</button>}
          />
        ) : !vendor ? (
          <StatusPanel
            icon={<Store className="h-6 w-6 text-[#6B7280]" />}
            title="Vendor account required"
            message="No seller profile is linked to your account yet. Create one to manage products."
            action={<Link href="/activate/vendor" className={primaryBtn}>Become a vendor</Link>}
          />
        ) : (
          <div className="space-y-5">
            <ProductsHeader refreshing={refreshing} onRefresh={() => load()} />

            {/* Period-over-period deltas are omitted: the catalog query has no prior baseline. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Active listings"
                value={stats.active.toLocaleString()}
                hint="Live products in your catalog"
                icon={Box}
                iconClass="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Total sales"
                value={stats.totalSales.toLocaleString()}
                hint="All time"
                icon={BarChart3}
                iconClass="bg-[#FFF4ED] text-[#FF7A45]"
              />
              <StatCard
                label="Stock alerts"
                value={(stats.lowStock + stats.outOfStock).toLocaleString()}
                hint="Low or out of stock products"
                icon={Bell}
                iconClass="bg-rose-50 text-rose-500"
              />
              <StatCard
                label="Digital products"
                value={stats.digital.toLocaleString()}
                hint="Downloadable products"
                icon={FileText}
                iconClass="bg-violet-50 text-violet-600"
              />
            </div>

            <section className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="space-y-3 p-3 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <label htmlFor={searchId} className="sr-only">Search products by name or slug</label>
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      id={searchId}
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                      placeholder="Search products by name or slug..."
                      className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <span className="hidden sm:inline">Sort by</span>
                      <span className="relative">
                        <select
                          value={sort}
                          onChange={(e) => { setSort(e.target.value as ProductSortKey); resetPage(); }}
                          aria-label="Sort products"
                          className="h-10 w-[148px] appearance-none rounded-xl border border-[#E5E7EB] bg-white pl-3 pr-8 text-sm font-medium text-[#111827] outline-none focus:border-[#FF5A1F] sm:w-[180px]"
                        >
                          {PRODUCT_SORTS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Grid view"
                        aria-pressed={view === "grid"}
                        onClick={() => setView("grid")}
                        className={cn(viewBtn, view === "grid" && viewBtnOn)}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="List view"
                        aria-pressed={view === "list"}
                        onClick={() => setView("list")}
                        className={cn(viewBtn, view === "list" && viewBtnOn)}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none">
                    <div className="flex w-max items-center gap-2 pr-1">
                      {PRIMARY_PRODUCT_FILTERS.map((filter) => (
                        <FilterPill
                          key={filter}
                          filter={filter}
                          count={filterCounts[filter]}
                          active={activeFilter === filter}
                          onClick={() => { setActiveFilter(filter); setMoreOpen(false); resetPage(); }}
                        />
                      ))}
                      <span className="mx-1 h-5 w-px shrink-0 bg-[#E5E7EB]" aria-hidden />
                      {TYPE_PRODUCT_FILTERS.map((filter) => (
                        <FilterPill
                          key={filter}
                          filter={filter}
                          count={filterCounts[filter]}
                          active={activeFilter === filter}
                          onClick={() => { setActiveFilter(filter); setMoreOpen(false); resetPage(); }}
                        />
                      ))}
                      <button
                        ref={moreButtonRef}
                        type="button"
                        aria-expanded={moreOpen}
                        aria-haspopup="menu"
                        onClick={() => setMoreOpen((open) => !open)}
                        className={cn(
                          pillBase,
                          (MORE_PRODUCT_FILTERS as readonly string[]).includes(activeFilter)
                            ? "border-[#FF5A1F] bg-[#FF5A1F] text-white"
                            : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]",
                        )}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {(MORE_PRODUCT_FILTERS as readonly string[]).includes(activeFilter) ? activeFilter : "More filters"}
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      </button>
                    </div>
                  </div>
                </div>

                <AnchoredMenu open={moreOpen} onClose={() => setMoreOpen(false)} anchorRef={moreButtonRef} width={220}>
                  {MORE_PRODUCT_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => { setActiveFilter(filter); setMoreOpen(false); resetPage(); }}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-[#374151] hover:bg-[#F9FAFB]"
                    >
                      <span className="font-medium">{filter}</span>
                      <span className="tabular-nums text-[#6B7280]">{filterCounts[filter]}</span>
                    </button>
                  ))}
                </AnchoredMenu>

                {selectedOnPage.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-[#FFF7F4] px-3 py-2 text-sm">
                    <p className="text-[#111827]">
                      <span className="font-semibold">{selectedOnPage.length}</span> selected on this page
                    </p>
                    <button type="button" onClick={() => setSelected([])} className="font-semibold text-[#FF5A1F]">
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {productLoadError && products.length > 0 && (
                <div className="mx-3 mb-3 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:mx-4">
                  <p>{productLoadError}</p>
                  <button type="button" onClick={() => load()} className="shrink-0 font-semibold">Try again</button>
                </div>
              )}

              <InventoryBody
                view={view}
                pageItems={pageItems}
                productsCount={products.length}
                productLoadError={productLoadError}
                search={search}
                activeFilter={activeFilter}
                allPageSelected={allPageSelected}
                somePageSelected={somePageSelected}
                selectedOnPage={selectedOnPage}
                openMenu={openMenu}
                busyId={busyId}
                onTogglePage={togglePageSelection}
                onToggleRow={toggleRowSelection}
                setOpenMenu={setOpenMenu}
                toggleStatus={toggleStatus}
                archiveProduct={archiveProduct}
                restoreProduct={restoreProduct}
                deleteProduct={deleteProduct}
                duplicateProduct={duplicateProduct}
                formatMoney={formatMoney}
                onReset={() => { setSearch(""); setActiveFilter("All"); resetPage(); }}
                onRetry={() => load()}
              />

              <div className="flex flex-col gap-3 border-t border-[#F3F4F6] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <p className="text-[13px] text-[#6B7280]">
                  {showingProductsLabel({
                    productCount: products.length,
                    filteredCount: filtered.length,
                    page: safePage,
                    pageSize,
                    loadFailed: Boolean(productLoadError),
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={safePage <= 1}
                    onClick={() => { setSelected([]); setPage(Math.max(1, safePage - 1)); }}
                    className={pagerBtn}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#FF5A1F] px-2 text-sm font-semibold text-white">
                    {safePage}
                  </span>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={safePage >= totalPages}
                    onClick={() => { setSelected([]); setPage(Math.min(totalPages, safePage + 1)); }}
                    className={pagerBtn}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <label className="relative ml-1">
                    <span className="sr-only">Products per page</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value) as (typeof PRODUCT_PAGE_SIZES)[number]); resetPage(); }}
                      className="h-8 appearance-none rounded-lg border border-[#E5E7EB] bg-white pl-3 pr-7 text-[13px] font-medium text-[#374151] outline-none focus:border-[#FF5A1F]"
                    >
                      {PRODUCT_PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>{size} per page</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
                  </label>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );

  return shell;
}

const primaryBtn = "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FF5A1F] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#F04E14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]";
const secondaryBtn = "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#F9FAFB]";
const viewBtn = "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors hover:bg-[#F9FAFB]";
const viewBtnOn = "border-[#FF5A1F] bg-[#FF5A1F] text-white hover:bg-[#F04E14]";
const pillBase = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors";
const pagerBtn = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40";

function ProductsHeader({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[13px] text-[#9CA3AF]">
            <li>Dashboard</li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="font-medium text-[#6B7280]" aria-current="page">Inventory</li>
          </ol>
        </nav>
        <h1 className="mt-2 text-[32px] font-bold leading-none tracking-tight text-[#111827] sm:text-[34px]">
          My Products
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
          Manage your product catalog, track performance, and grow your business.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="hidden items-center gap-3 xl:flex">
          <CatalogHeroArt />
          <div className="max-w-[230px]">
            <p className="text-sm font-semibold leading-snug text-[#111827]">List physical or digital products</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
              Reach buyers and creators on Jimvio.
            </p>
            <Link
              href="/help/articles/create-listing"
              className="mt-2 inline-flex h-7 items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
            >
              Learn more
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh"
            aria-label="Refresh products"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
          <Link href="/marketplace/new" className={primaryBtn}>
            <Plus className="h-4 w-4" />
            Add product
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, hint, icon: Icon, iconClass,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconClass)}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <p className="text-[13px] font-medium text-[#6B7280]">{label}</p>
        </div>
        <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-[#111827]">{value}</p>
        <p className="mt-2 text-[12px] text-[#9CA3AF]">{hint}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" aria-hidden="true" />
    </div>
  );
}

function FilterPill({
  filter, count, active, onClick,
}: {
  filter: ProductFilter;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const meta = FILTER_VISUAL[filter];
  const Icon = meta.icon;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(pillBase, active ? "border-[#FF5A1F] bg-[#FF5A1F] text-white" : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]")}>
      {meta.dot && <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-white" : meta.dot)} />}
      {Icon && <Icon className={cn("h-3.5 w-3.5", active ? "text-white" : meta.iconClass)} />}
      {filter}
      <span className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
        active ? "bg-white text-[#FF5A1F]" : "bg-[#F3F4F6] text-[#6B7280]",
      )}>
        {count}
      </span>
    </button>
  );
}

const FILTER_VISUAL: Record<ProductFilter, { dot?: string; icon?: React.ElementType; iconClass?: string }> = {
  All: {},
  Active: { dot: "bg-emerald-500" },
  Paused: { dot: "bg-amber-500" },
  Draft: { dot: "bg-slate-400" },
  Archived: { dot: "bg-slate-700" },
  Digital: { icon: FileText, iconClass: "text-violet-500" },
  Physical: { icon: Box, iconClass: "text-slate-500" },
  "Low Stock": { icon: AlertTriangle, iconClass: "text-amber-500" },
  "Out of Stock": { icon: Package, iconClass: "text-rose-500" },
  "In review": { dot: "bg-sky-500" },
  Rejected: { dot: "bg-rose-500" },
};

function InventoryBody(props: {
  view: "list" | "grid";
  pageItems: Product[];
  productsCount: number;
  productLoadError: string | null;
  search: string;
  activeFilter: ProductFilter;
  allPageSelected: boolean;
  somePageSelected: boolean;
  selectedOnPage: string[];
  openMenu: string | null;
  busyId: string | null;
  onTogglePage: (on: boolean) => void;
  onToggleRow: (id: string, on: boolean) => void;
  setOpenMenu: (id: string | null) => void;
  toggleStatus: (id: string, status: ProductStatus, isDigital?: boolean) => void;
  archiveProduct: (id: string, name: string) => void;
  restoreProduct: (id: string) => void;
  deleteProduct: (id: string, name: string) => void;
  duplicateProduct: (id: string) => void;
  formatMoney: (amount: number, currency?: string) => string;
  onReset: () => void;
  onRetry: () => void;
}) {
  const emptyCatalog = props.productsCount === 0 && !props.productLoadError;
  const noResults = props.pageItems.length === 0 && props.productsCount > 0 && !props.productLoadError;
  const failedEmpty = Boolean(props.productLoadError) && props.productsCount === 0;

  if (props.view === "grid" && props.pageItems.length > 0) {
    return (
      <div className="px-3 pb-4 sm:px-4">
        <label className="mb-3 inline-flex items-center gap-2 text-sm text-[#6B7280]">
          <HeaderCheckbox
            checked={props.allPageSelected}
            indeterminate={props.somePageSelected}
            onChange={props.onTogglePage}
            label="Select all products on this page"
          />
          Select page
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {props.pageItems.map((product) => (
            <ProductGridCard key={product.id} product={product} {...props} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={cn(props.view === "list" ? "hidden md:block" : "hidden")}>
        <div className="overflow-x-auto">
          <table className={cn("w-full border-collapse text-left text-[13px]", props.pageItems.length > 0 && "min-w-[980px]")}>
            <thead>
              <tr className="bg-[#F8FAFC] text-[12px] font-medium text-[#6B7280]">
                <th className="w-12 px-4 py-3">
                  <HeaderCheckbox
                    checked={props.allPageSelected}
                    indeterminate={props.somePageSelected}
                    disabled={props.pageItems.length === 0}
                    onChange={props.onTogglePage}
                    label="Select all products on this page"
                  />
                </th>
                <th className="px-3 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Price</th>
                <th className="px-3 py-3 font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Sales</th>
                <th className="px-3 py-3 font-medium">Views</th>
                <th className="px-3 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            {props.pageItems.length > 0 && (
              <tbody>
                {props.pageItems.map((product) => (
                  <ProductTableRow key={product.id} product={product} {...props} />
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {props.pageItems.length > 0 && (
        <div className={cn("divide-y divide-[#F3F4F6] md:hidden", props.view === "grid" && "hidden")}>
          {props.pageItems.map((product) => (
            <ProductMobileCard key={product.id} product={product} {...props} />
          ))}
        </div>
      )}

      {props.pageItems.length === 0 && (
        <div className="px-4 py-12 sm:py-16">
          {failedEmpty ? (
            <MessageState
              title="Couldn't load products"
              message={props.productLoadError || "Something went wrong while loading your catalog."}
              primary={<button type="button" onClick={props.onRetry} className={primaryBtn}>Try again</button>}
            />
          ) : noResults ? (
            <MessageState
              title="No matching products"
              message={
                props.search.trim()
                  ? `Nothing matches “${props.search.trim()}”${props.activeFilter !== "All" ? ` in ${props.activeFilter}` : ""}.`
                  : `Nothing in your catalog is ${props.activeFilter.toLowerCase()}.`
              }
              primary={<button type="button" onClick={props.onReset} className={primaryBtn}>Clear filters</button>}
            />
          ) : emptyCatalog ? (
            <EmptyCatalogState />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProductTableRow(props: RowProps & { product: Product }) {
  const p = props.product;
  const status = (p.status ?? "draft") as ProductStatus;
  const img = productImageUrl(p.images);
  const stock = stockText(p);
  const isBusy = props.busyId === p.id;
  const checked = props.selectedOnPage.includes(p.id);

  return (
    <tr className={cn("border-t border-[#F3F4F6] transition-colors hover:bg-[#FCFCFD]", checked && "bg-[#FFF7F4]", isBusy && "pointer-events-none opacity-60")}>
      <td className="px-4 py-3">
        <RowCheckbox checked={checked} label={`Select ${p.name}`} onChange={(on) => props.onToggleRow(p.id, on)} />
      </td>
      <td className="px-3 py-3">
        <ProductIdentity product={p} img={img} />
      </td>
      <td className="px-3 py-3 text-[#4B5563]">{productTypeLabel(p)}</td>
      <td className="px-3 py-3"><PriceText product={p} formatMoney={props.formatMoney} /></td>
      <td className={cn("px-3 py-3 tabular-nums", stockClass(stock))}>{stock}</td>
      <td className="px-3 py-3">
        <StatusButton status={status} disabled={isBusy} onToggle={() => props.toggleStatus(p.id, status, Boolean(p.is_digital))} />
      </td>
      <td className="px-3 py-3 tabular-nums text-[#111827]">{(p.sale_count ?? 0).toLocaleString()}</td>
      <td className="px-3 py-3 tabular-nums text-[#111827]">{(p.view_count ?? 0).toLocaleString()}</td>
      <td className="px-3 py-3 text-[#6B7280]">{formatCatalogDate(p.updated_at ?? p.created_at)}</td>
      <td className="px-4 py-3 text-right">
        <RowMenu {...props} product={p} status={status} isBusy={isBusy} />
      </td>
    </tr>
  );
}

function ProductMobileCard(props: RowProps & { product: Product }) {
  const p = props.product;
  const status = (p.status ?? "draft") as ProductStatus;
  const img = productImageUrl(p.images);
  const stock = stockText(p);
  const isBusy = props.busyId === p.id;
  const checked = props.selectedOnPage.includes(p.id);
  return (
    <div className={cn("px-3 py-3", checked && "bg-[#FFF7F4]", isBusy && "pointer-events-none opacity-60")}>
      <div className="flex items-start gap-3">
        <RowCheckbox checked={checked} label={`Select ${p.name}`} onChange={(on) => props.onToggleRow(p.id, on)} />
        <ProductIdentity product={p} img={img} />
        <RowMenu {...props} product={p} status={status} isBusy={isBusy} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 pl-7 text-xs text-[#6B7280]">
        <span>{productTypeLabel(p)}</span>
        <span className="text-right"><PriceText product={p} formatMoney={props.formatMoney} /></span>
        <span className={stockClass(stock)}>Stock {stock}</span>
        <span className="text-right">{(p.sale_count ?? 0).toLocaleString()} sales · {(p.view_count ?? 0).toLocaleString()} views</span>
        <StatusButton status={status} disabled={isBusy} onToggle={() => props.toggleStatus(p.id, status, Boolean(p.is_digital))} />
        <span className="text-right">Updated {formatCatalogDate(p.updated_at ?? p.created_at)}</span>
      </div>
    </div>
  );
}

function ProductGridCard(props: RowProps & { product: Product }) {
  const p = props.product;
  const status = (p.status ?? "draft") as ProductStatus;
  const img = productImageUrl(p.images);
  const stock = stockText(p);
  const isBusy = props.busyId === p.id;
  const checked = props.selectedOnPage.includes(p.id);
  return (
    <article className={cn("overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white", checked && "ring-2 ring-[#FF5A1F]/40", isBusy && "pointer-events-none opacity-60")}>
      <div className="relative aspect-[4/3] bg-[#F8FAFC]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-[#D1D5DB]">
            <Package className="h-8 w-8" />
          </div>
        )}
        <div className="absolute left-2 top-2 rounded-md bg-white/95 p-1">
          <RowCheckbox checked={checked} label={`Select ${p.name}`} onChange={(on) => props.onToggleRow(p.id, on)} />
        </div>
        <div className="absolute right-2 top-2">
          <RowMenu {...props} product={p} status={status} isBusy={isBusy} />
        </div>
      </div>
      <div className="space-y-2 p-3">
        <ProductIdentity product={p} img={null} hideThumb />
        <div className="flex items-center justify-between gap-2">
          <PriceText product={p} formatMoney={props.formatMoney} />
          <StatusButton status={status} disabled={isBusy} onToggle={() => props.toggleStatus(p.id, status, Boolean(p.is_digital))} />
        </div>
        <p className="text-xs text-[#6B7280]">
          {productTypeLabel(p)} · <span className={stockClass(stock)}>{stock}</span>
          {" · "}{(p.sale_count ?? 0).toLocaleString()} sales · {(p.view_count ?? 0).toLocaleString()} views
        </p>
      </div>
    </article>
  );
}

type RowProps = {
  selectedOnPage: string[];
  openMenu: string | null;
  busyId: string | null;
  onToggleRow: (id: string, on: boolean) => void;
  setOpenMenu: (id: string | null) => void;
  toggleStatus: (id: string, status: ProductStatus, isDigital?: boolean) => void;
  archiveProduct: (id: string, name: string) => void;
  restoreProduct: (id: string) => void;
  deleteProduct: (id: string, name: string) => void;
  duplicateProduct: (id: string) => void;
  formatMoney: (amount: number, currency?: string) => string;
};

function ProductIdentity({ product: p, img, hideThumb = false }: { product: Product; img: string | null; hideThumb?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {!hideThumb && (
        <Link href={`/seller/products/${p.id}/edit`} aria-label={`Edit ${p.name}`} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6] ring-1 ring-[#E5E7EB]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#9CA3AF]">
              <Package className="h-4 w-4" />
            </span>
          )}
        </Link>
      )}
      <div className="min-w-0">
        <Link href={`/seller/products/${p.id}/edit`} className="block truncate text-sm font-medium text-[#111827] hover:text-[#FF5A1F]">
          {p.name}
        </Link>
        <p className="truncate font-mono text-[11px] text-[#9CA3AF]">{p.slug}</p>
      </div>
    </div>
  );
}

function PriceText({ product: p, formatMoney }: { product: Product; formatMoney: (amount: number, currency?: string) => string }) {
  if (Number(p.price) === 0) return <span className="font-medium text-emerald-600">Free</span>;
  return <span className="font-medium tabular-nums text-[#111827]">{formatMoney(Number(p.price), p.currency ?? undefined)}</span>;
}

function StatusButton({
  status, disabled, onToggle,
}: {
  status: ProductStatus;
  disabled: boolean;
  onToggle: () => void;
}) {
  const meta = STATUS[status] ?? STATUS.draft;
  const archived = status === "archived";
  return (
    <button
      type="button"
      onClick={() => { if (!archived) onToggle(); }}
      disabled={archived || disabled}
      title={archived ? meta.label : status === "active" ? "Pause product" : "Activate product"}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium", meta.badge, !archived && !disabled && "cursor-pointer")}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </button>
  );
}

function RowMenu(props: RowProps & { product: Product; status: ProductStatus; isBusy: boolean }) {
  const p = props.product;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const open = props.openMenu === p.id;
  const archived = props.status === "archived";
  return (
    <div className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Actions for ${p.name}`}
        aria-expanded={open}
        disabled={props.isBusy}
        onClick={() => props.setOpenMenu(open ? null : p.id)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-50"
      >
        {props.isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>
      <AnchoredMenu open={open} onClose={() => props.setOpenMenu(null)} anchorRef={buttonRef} width={196} estimatedHeight={280}>
        <MenuItem href={`/seller/products/${p.id}/edit`} icon={Edit} label="Edit product" onClick={() => props.setOpenMenu(null)} />
        {props.status === "active" && (
          <MenuItem href={`/marketplace/${p.slug}`} target="_blank" icon={Eye} label="View live" onClick={() => props.setOpenMenu(null)} />
        )}
        <MenuButton icon={Copy} label="Duplicate" onClick={() => props.duplicateProduct(p.id)} />
        {!archived && (
          <MenuButton icon={Zap} label={props.status === "active" ? "Pause" : "Activate"} onClick={() => props.toggleStatus(p.id, props.status, Boolean(p.is_digital))} />
        )}
        <div className="border-t border-[#F3F4F6]" />
        {archived ? (
          <>
            <MenuButton icon={RotateCcw} label="Restore as draft" onClick={() => props.restoreProduct(p.id)} />
            <MenuButton icon={Trash2} label="Delete permanently" onClick={() => props.deleteProduct(p.id, p.name)} danger />
          </>
        ) : (
          <MenuButton icon={Archive} label="Archive" onClick={() => props.archiveProduct(p.id, p.name)} />
        )}
      </AnchoredMenu>
    </div>
  );
}

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
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#374151] hover:bg-[#F9FAFB]"
    >
      <Icon className="h-3.5 w-3.5" />
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
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm",
        danger ? "text-rose-600 hover:bg-rose-50" : "text-[#374151] hover:bg-[#F9FAFB]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function HeaderCheckbox({
  checked, indeterminate, disabled, onChange, label,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-[#D1D5DB] accent-[#FF5A1F] disabled:opacity-40"
    />
  );
}

function RowCheckbox({
  checked, onChange, label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] accent-[#FF5A1F]"
    />
  );
}

function AnchoredMenu({
  open, onClose, anchorRef, width, estimatedHeight = 180, children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  width: number;
  estimatedHeight?: number;
  children: React.ReactNode;
}) {
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const node = anchorRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
      const below = rect.bottom + 8;
      const top = below + estimatedHeight > window.innerHeight
        ? Math.max(8, rect.top - estimatedHeight - 8)
        : below;
      setBox({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, width, estimatedHeight]);

  if (!open || !box || typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <div
        role="menu"
        className="fixed z-[80] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg"
        style={{ top: box.top, left: box.left, width }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

function EmptyCatalogState() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center text-center">
      <EmptyCatalogArt />
      <h2 className="mt-2 text-[22px] font-bold tracking-tight text-[#111827]">Your product catalog starts here</h2>
      <p className="mt-2 max-w-[440px] text-sm leading-6 text-[#6B7280]">
        List physical or digital products and reach buyers and creators on Jimvio.
      </p>
      <div className="mt-5 flex w-full flex-col items-center gap-2.5">
        <Link href="/marketplace/new" className={cn(primaryBtn, "min-w-[230px]")}>
          <Plus className="h-4 w-4" />
          Add your first product
        </Link>
        <Link href="/marketplace" className={cn(secondaryBtn, "min-w-[230px]")}>
          Browse marketplace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function MessageState({
  title, message, primary,
}: {
  title: string;
  message: string;
  primary: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF4ED] text-[#FF5A1F]">
        <Package className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-bold text-[#111827]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{message}</p>
      <div className="mt-4">{primary}</div>
    </div>
  );
}

function StatusPanel({
  icon, title, message, action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">{icon}</span>
      <h1 className="text-xl font-bold text-[#111827]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{message}</p>
      <div className="mt-5 w-full">{action}</div>
    </div>
  );
}

function ProductsLoadingState() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div>
        <div className="h-3 w-36 rounded bg-[#E5E7EB]" />
        <div className="mt-3 h-8 w-48 rounded bg-[#E5E7EB]" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-[#EEF0F3]" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[112px] rounded-2xl border border-[#E5E7EB] bg-white" />
        ))}
      </div>
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <Loader2 className="h-4 w-4 animate-spin text-[#FF5A1F]" />
          Loading products
        </div>
      </div>
    </div>
  );
}

function CatalogHeroArt() {
  return (
    <div className="relative h-[86px] w-[132px] shrink-0" aria-hidden="true">
      <div className="absolute inset-x-4 bottom-1 h-10 rounded-full bg-[#FFE1D2] blur-lg" />
      <span className="absolute left-1 top-2 h-1.5 w-1.5 rounded-full bg-[#FFB088]" />
      <span className="absolute right-2 top-1 h-1 w-1 rounded-full bg-[#FF8A5B]" />
      <span className="absolute left-7 top-0 h-1 w-1 rounded-full bg-[#FDBA74]" />
      <div className="absolute left-1 top-5 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[#F3E2DA]">
        <ImageIcon className="h-3.5 w-3.5 text-[#FF8A5B]" />
      </div>
      <div className="absolute right-1 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[#F3E2DA]">
        <Play className="h-3.5 w-3.5 fill-[#FF5A1F] text-[#FF5A1F]" />
      </div>
      <div className="absolute bottom-3 left-5 h-9 w-11 rounded-md bg-gradient-to-br from-[#FFB080] to-[#FF5A1F] shadow-sm" />
      <div className="absolute bottom-6 left-[52px] h-8 w-8 rounded-full bg-gradient-to-br from-[#FFD0A8] to-[#FF7A3C] shadow-sm" />
      <div className="absolute bottom-5 right-4 flex h-7 w-7 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-[#F6DDD2]">
        <FileText className="h-3.5 w-3.5 text-[#C4C9D4]" />
      </div>
    </div>
  );
}

function EmptyCatalogArt() {
  return (
    <div className="relative mx-auto h-[148px] w-[210px]" aria-hidden="true">
      <div className="absolute left-1/2 top-[78px] h-14 w-36 -translate-x-1/2 rounded-full bg-[#FFD8C4]/90 blur-xl" />
      <span className="absolute left-8 top-6 h-1.5 w-1.5 rotate-45 bg-[#FFB088]" />
      <span className="absolute right-10 top-3 h-1.5 w-1.5 rounded-full bg-[#FF8A5B]" />
      <span className="absolute right-6 top-16 h-1 w-1 rounded-full bg-[#FDBA74]" />
      <span className="absolute left-14 top-2 text-[10px] text-[#FFC7A8]">✦</span>
      <div className="absolute left-6 top-5 flex h-9 w-9 -rotate-6 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#F3E2DA]">
        <ImageIcon className="h-4 w-4 text-[#FF8A5B]" />
      </div>
      <div className="absolute right-8 top-2 flex h-9 w-9 rotate-6 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#F3E2DA]">
        <Play className="h-4 w-4 fill-[#FF5A1F] text-[#FF5A1F]" />
      </div>
      <div className="absolute right-3 top-12 flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF7F4] shadow-sm ring-1 ring-[#F6DDD2]">
        <FileText className="h-3.5 w-3.5 text-[#C4C9D4]" />
      </div>
      <div className="absolute bottom-4 left-1/2 w-[96px] -translate-x-1/2">
        <div className="absolute -top-3 left-1 h-5 w-10 origin-bottom -rotate-[16deg] rounded-sm bg-[#FF9A62]" />
        <div className="absolute -top-3 right-1 h-5 w-10 origin-bottom rotate-[16deg] rounded-sm bg-[#FFC29A]" />
        <div className="relative h-[52px] rounded-b-xl rounded-t-md bg-gradient-to-b from-[#FF8A4C] to-[#FF5A1F] shadow-sm">
          <div className="absolute inset-x-3 top-0 h-2.5 rounded-b-full bg-[#FF7A3C]" />
        </div>
        <Tag className="absolute -right-3 top-1 h-6 w-6 fill-[#FFE8D6] text-[#FF5A1F]" />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileEdit,
  Filter,
  Loader2,
  Package,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SelectInput } from "@/components/admin/form-primitive";
import { RefreshCJStockButton } from "@/components/admin/cj/refresh-cj-stock-button";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CJProduct {
  pid: string;
  productNameEn: string;
  productSku: string;
  bigImage: string;
  sellPrice: string;
  nowPrice: string;
  discountPrice: string;
  categoryName?: string;
  threeCategoryName?: string;
  addMarkStatus: number;
  isFreeShipping?: boolean;
  listedNum: number;
  warehouseInventoryNum?: number;
  verifiedWarehouse?: number;
  deliveryCycle?: string;
  countryCode?: string;
  isVideo?: number;
  productWeight?: number;
}

interface CJCategory {
  categoryId: string;
  categoryName: string;
}

interface Filters {
  keyWord: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  isFreeShipping: string;
  verifiedWarehouse: string;
  countryCode: string;
  deliveryTime: string;
  productFlag: string;
  sort: string;
  orderBy: string;
}

type ImportLogEntry = {
  pid: string;
  name: string;
  productId?: string;
  at: string;
  ok: boolean;
  message?: string;
};

const DEFAULT_FILTERS: Filters = {
  keyWord: "",
  categoryId: "",
  minPrice: "",
  maxPrice: "",
  isFreeShipping: "",
  verifiedWarehouse: "",
  countryCode: "",
  deliveryTime: "",
  productFlag: "",
  sort: "desc",
  orderBy: "createAt",
};

const WAREHOUSE_LABELS: Record<string, string> = {
  CN: "China",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  AU: "Australia",
};

const ALL = "all";

const cardCls = "rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]";

// ─── API ─────────────────────────────────────────────────────────────────────

async function fetchCJProducts(filters: Filters, page: number, pageSize: number) {
  const params = new URLSearchParams();
  params.set("pageNum", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.keyWord) params.set("productNameEn", filters.keyWord);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.isFreeShipping) params.set("isFreeShipping", filters.isFreeShipping);
  if (filters.verifiedWarehouse) params.set("verifiedWarehouse", filters.verifiedWarehouse);
  if (filters.productFlag !== "") params.set("searchType", filters.productFlag);
  if (filters.countryCode) params.set("countryCode", filters.countryCode);
  if (filters.deliveryTime) params.set("deliveryTime", filters.deliveryTime);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.orderBy) params.set("orderBy", filters.orderBy);

  const res = await fetch(`/api/cj/products?${params.toString()}`);
  if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Could not load CJ catalog");
  return { products: json.products as CJProduct[], total: json.total as number };
}

async function fetchCJCategories(): Promise<CJCategory[]> {
  const res = await fetch("/api/cj/categories");
  if (!res.ok) return [];
  const json = await res.json();
  return json.categories || [];
}

function productPrice(p: CJProduct) {
  return parseFloat(p.discountPrice || p.nowPrice || p.sellPrice || "0");
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied"),
    () => toast.error("Copy failed")
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function CJImportBrowser({
  cjDraftCount = 0,
  cjTotalCount = 0,
}: {
  cjDraftCount?: number;
  cjTotalCount?: number;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [products, setProducts] = useState<CJProduct[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 24, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<CJCategory[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importedMap, setImportedMap] = useState<Record<string, string>>({});
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [selectedPids, setSelectedPids] = useState<Set<string>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [directPid, setDirectPid] = useState("");
  const [hideImported, setHideImported] = useState(false);
  const [preview, setPreview] = useState<CJProduct | null>(null);
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [draftReviewQuery, setDraftReviewQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCJCategories().then(setCategories);
    fetch("/api/admin/cj/imported")
      .then((r) => r.json())
      .then((data) => {
        if (data?.map && typeof data.map === "object") setImportedMap(data.map);
      })
      .catch(() => {});
  }, []);

  const importedCount = Object.keys(importedMap).length;
  const sessionOk = importLog.filter((e) => e.ok).length;

  const load = useCallback(
    async (f: Filters, page: number, pageSize = pagination.pageSize) => {
      setLoading(true);
      setError("");
      setHasSearched(true);
      try {
        const { products: rows, total } = await fetchCJProducts(f, page, pageSize);
        setProducts(rows);
        setPagination((prev) => ({ ...prev, page, pageSize, total }));
        setSelectedPids(new Set());
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        setError((e as Error).message);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [pagination.pageSize]
  );

  function goToDraftReview(query = draftReviewQuery) {
    const q = query.trim();
    const params = new URLSearchParams({ status: "draft", source: "cj" });
    if (q) params.set("q", q);
    router.push(`/admin/products?${params.toString()}`);
  }

  const applySearch = () => {
    setFilters(draft);
    load(draft, 1);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    load(DEFAULT_FILTERS, 1);
  };

  const visibleProducts = useMemo(
    () => (hideImported ? products.filter((p) => !importedMap[p.pid]) : products),
    [products, hideImported, importedMap]
  );

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));

  async function runImport(pid: string, name: string, resync = false) {
    setImportingPid(pid);
    try {
      const res = await fetch("/api/cj/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (json.productId) {
        setImportedMap((prev) => ({ ...prev, [pid]: json.productId }));
      }

      setImportLog((prev) => [
        {
          pid,
          name,
          productId: json.productId,
          at: new Date().toISOString(),
          ok: true,
        },
        ...prev.slice(0, 19),
      ]);

      toast.success(resync ? "Re-synced from CJ" : "Imported as draft", {
        action: json.productId
          ? { label: "Open", onClick: () => { window.location.href = `/admin/products/${json.productId}`; } }
          : undefined,
      });
    } catch (e) {
      const message = (e as Error).message;
      setImportLog((prev) => [
        { pid, name, at: new Date().toISOString(), ok: false, message },
        ...prev.slice(0, 19),
      ]);
      toast.error(message);
    } finally {
      setImportingPid(null);
    }
  }

  async function importDirectPid() {
    const pid = directPid.trim();
    if (!pid) {
      toast.error("Enter a CJ product ID");
      return;
    }
    await runImport(pid, `PID ${pid}`);
    setDirectPid("");
  }

  async function importSelected() {
    const pids = Array.from(selectedPids).filter((pid) => !importedMap[pid]);
    if (pids.length === 0) {
      toast.error("No new products selected");
      return;
    }
    setBulkImporting(true);
    let ok = 0;
    let failed = 0;
    for (const pid of pids) {
      const product = products.find((p) => p.pid === pid);
      try {
        const res = await fetch("/api/cj/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pid }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        if (json.productId) setImportedMap((prev) => ({ ...prev, [pid]: json.productId }));
        setImportLog((prev) => [
          { pid, name: product?.productNameEn ?? pid, productId: json.productId, at: new Date().toISOString(), ok: true },
          ...prev.slice(0, 19),
        ]);
        ok += 1;
      } catch (e) {
        failed += 1;
        setImportLog((prev) => [
          { pid, name: product?.productNameEn ?? pid, at: new Date().toISOString(), ok: false, message: (e as Error).message },
          ...prev.slice(0, 19),
        ]);
      }
    }
    setBulkImporting(false);
    setSelectedPids(new Set());
    if (ok) toast.success(`Imported ${ok} draft${ok === 1 ? "" : "s"}`);
    if (failed) toast.error(`${failed} failed`);
  }

  function toggleSelect(pid: string) {
    setSelectedPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  function selectAllVisible() {
    const importable = visibleProducts.filter((p) => !importedMap[p.pid]).map((p) => p.pid);
    if (importable.length === 0) return;
    setSelectedPids(new Set(importable));
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Products
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Import from CJ
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)] max-w-xl">
            Search the CJ catalog, import products as drafts, then review and publish from your product list.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatChip label="CJ in catalog" value={String(cjTotalCount)} />
          <StatChip label="Drafts" value={String(cjDraftCount)} href="/admin/products?status=draft&source=cj" />
          <StatChip label="Mapped" value={String(importedCount)} />
          {sessionOk > 0 && <StatChip label="This session" value={`+${sessionOk}`} accent />}
        </div>
      </div>

      {/* Workflow note */}
      <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-4 py-3 text-[13px] text-[var(--color-text-secondary)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p>
          Imports land as <strong className="font-medium text-[var(--color-text-primary)]">drafts</strong> with variants and shipping synced.
          Open each draft to check pricing, then publish when ready.
        </p>
        <RefreshCJStockButton disabled={cjTotalCount === 0} />
      </div>

      {/* Toolbar */}
      <div className={cn(cardCls, "p-4 space-y-3")}>
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="flex-1">
            <Input
              ref={searchRef}
              inputSize="sm"
              value={draft.keyWord}
              onChange={(e) => setDraft((d) => ({ ...d, keyWord: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="Search by product name…"
              icon={<Search className="h-4 w-4" />}
              iconRight={
                draft.keyWord ? (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, keyWord: "" }))}
                    className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <kbd className="hidden h-5 items-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-1.5 text-[10.5px] font-mono font-medium text-[var(--color-text-muted)] sm:inline-flex pointer-events-none">
                    ↵
                  </kbd>
                )
              }
              className="h-9"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={applySearch}
              disabled={loading}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search catalog
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={cn(
                "h-9 px-3 rounded-md border text-[13px] font-medium inline-flex items-center gap-2 transition-colors",
                filtersOpen
                  ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-[var(--color-border)]">
          <div className="flex-1 min-w-[200px]">
            <Input
              inputSize="sm"
              value={directPid}
              onChange={(e) => setDirectPid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && importDirectPid()}
              placeholder="Or paste CJ product ID (PID)…"
              icon={<Package className="h-3.5 w-3.5" />}
              iconRight={
                directPid.trim() ? (
                  <button
                    type="button"
                    onClick={() => setDirectPid("")}
                    className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                    aria-label="Clear PID"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : undefined
              }
              className="h-9"
            />
          </div>
          <button
            type="button"
            onClick={importDirectPid}
            disabled={!directPid.trim() || importingPid === directPid.trim()}
            className="h-8 px-3 rounded-md border border-[var(--color-border)] text-[12.5px] font-medium hover:bg-[var(--color-surface-secondary)] disabled:opacity-50"
          >
            Import by PID
          </button>
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[var(--color-border)]">
            <Field label="Category">
              <SelectInput
                searchable
                value={draft.categoryId || ALL}
                onChange={(v) => setDraft((d) => ({ ...d, categoryId: v === ALL ? "" : v }))}
                options={[
                  { value: ALL, label: "All" },
                  ...categories.map((c) => ({ value: c.categoryId, label: c.categoryName })),
                ]}
              />
            </Field>
            <Field label="Price min (USD)">
              <Input
                type="number"
                min={0}
                inputSize="sm"
                value={draft.minPrice}
                onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))}
                className="h-9 tabular-nums"
              />
            </Field>
            <Field label="Price max (USD)">
              <Input
                type="number"
                min={0}
                inputSize="sm"
                value={draft.maxPrice}
                onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))}
                className="h-9 tabular-nums"
              />
            </Field>
            <Field label="Ships from">
              <SelectInput
                value={draft.countryCode || ALL}
                onChange={(v) => setDraft((d) => ({ ...d, countryCode: v === ALL ? "" : v }))}
                options={[
                  { value: ALL, label: "Any" },
                  ...Object.entries(WAREHOUSE_LABELS).map(([code, label]) => ({ value: code, label })),
                ]}
              />
            </Field>
            <Field label="Shipping">
              <SelectInput
                value={draft.isFreeShipping || ALL}
                onChange={(v) => setDraft((d) => ({ ...d, isFreeShipping: v === ALL ? "" : v }))}
                options={[
                  { value: ALL, label: "Any" },
                  { value: "1", label: "Free only" },
                  { value: "0", label: "Paid only" },
                ]}
              />
            </Field>
            <Field label="Supplier">
              <SelectInput
                value={draft.verifiedWarehouse || ALL}
                onChange={(v) => setDraft((d) => ({ ...d, verifiedWarehouse: v === ALL ? "" : v }))}
                options={[
                  { value: ALL, label: "Any" },
                  { value: "1", label: "Verified" },
                  { value: "2", label: "Unverified" },
                ]}
              />
            </Field>
            <Field label="Sort by">
              <SelectInput
                value={draft.orderBy}
                onChange={(v) => setDraft((d) => ({ ...d, orderBy: v }))}
                options={[
                  { value: "createAt", label: "Date listed" },
                  { value: "listedNum", label: "Store listings" },
                ]}
              />
            </Field>
            <Field label="Order">
              <SelectInput
                value={draft.sort}
                onChange={(v) => setDraft((d) => ({ ...d, sort: v }))}
                options={[
                  { value: "desc", label: "Newest first" },
                  { value: "asc", label: "Oldest first" },
                ]}
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
              <button type="button" onClick={applySearch} className="h-8 px-3 rounded-md bg-[var(--color-text-primary)] text-[var(--color-surface)] text-[12.5px] font-medium">
                Apply filters
              </button>
              <button type="button" onClick={resetFilters} className="h-8 px-3 rounded-md border border-[var(--color-border)] text-[12.5px] font-medium">
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results bar */}
      {hasSearched && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {loading ? "Loading…" : (
              <>
                <span className="font-medium text-[var(--color-text-primary)] tabular-nums">
                  {pagination.total.toLocaleString()}
                </span>{" "}
                results · page {pagination.page} of {totalPages}
                {hideImported && visibleProducts.length !== products.length && (
                  <> · showing {visibleProducts.length} not yet imported</>
                )}
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-[var(--color-border)] text-[12.5px] cursor-pointer">
              <input
                type="checkbox"
                checked={hideImported}
                onChange={(e) => setHideImported(e.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              Hide imported
            </label>
            <button type="button" onClick={selectAllVisible} className="h-8 px-3 rounded-md border border-[var(--color-border)] text-[12.5px] font-medium hover:bg-[var(--color-surface-secondary)]">
              Select page
            </button>
            {selectedPids.size > 0 && (
              <button
                type="button"
                onClick={importSelected}
                disabled={bulkImporting}
                className="h-8 px-3 rounded-md bg-[var(--color-accent)] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {bulkImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                Import {selectedPids.size}
              </button>
            )}
            <div className="w-[118px]">
              <SelectInput
                value={String(pagination.pageSize)}
                onChange={(v) => {
                  const size = Number(v);
                  setPagination((p) => ({ ...p, pageSize: size }));
                  load(filters, 1, size);
                }}
                options={[12, 24, 48].map((n) => ({ value: String(n), label: `${n} / page` }))}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-sm border border-rose-200 bg-rose-50 text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold">Could not load catalog</p>
            <p className="text-[12px] mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Empty / initial */}
      {!hasSearched && !loading && (
        <div className={cn(cardCls, "border-dashed py-16 px-6 text-center")}>
          <div className="mx-auto w-12 h-12 rounded-sm bg-[var(--color-surface-secondary)] flex items-center justify-center mb-4">
            <Filter className="h-5 w-5 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Search the CJ catalog</h3>
          <p className="mt-2 text-[13px] text-[var(--color-text-muted)] max-w-md mx-auto">
            Enter a product name or open filters, then run a search. You can also import directly if you have a CJ PID.
          </p>
          <button
            type="button"
            onClick={() => { searchRef.current?.focus(); applySearch(); }}
            className="mt-5 h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-semibold"
          >
            Search all products
          </button>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && hasSearched && visibleProducts.length === 0 && !error && (
        <div className={cn(cardCls, "py-12 text-center text-[13px] text-[var(--color-text-muted)]")}>
          No products match. Try different filters or turn off “Hide imported”.
        </div>
      )}

      {!loading && visibleProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibleProducts.map((product) => (
            <ProductRow
              key={product.pid}
              product={product}
              imported={Boolean(importedMap[product.pid])}
              importedProductId={importedMap[product.pid]}
              importing={importingPid === product.pid}
              selected={selectedPids.has(product.pid)}
              onToggleSelect={() => toggleSelect(product.pid)}
              onPreview={() => setPreview(product)}
              onImport={() => runImport(product.pid, product.productNameEn)}
              onResync={() => runImport(product.pid, product.productNameEn, true)}
            />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && hasSearched && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <PageBtn disabled={pagination.page <= 1} onClick={() => load(filters, pagination.page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </PageBtn>
          <span className="text-[13px] text-[var(--color-text-muted)] tabular-nums px-2">
            {pagination.page} / {totalPages}
          </span>
          <PageBtn disabled={pagination.page >= totalPages} onClick={() => load(filters, pagination.page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </PageBtn>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {importLog.length > 0 && (
          <div className={cn("lg:col-span-2 overflow-hidden", cardCls)}>
            <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
              <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Session import log</h2>
            </div>
            <ul className="divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto">
              {importLog.map((entry, i) => (
                <li key={`${entry.pid}-${entry.at}-${i}`} className="px-4 py-2.5 flex items-center justify-between gap-3 text-[12.5px]">
                  <div className="min-w-0">
                    <p className={cn("font-medium truncate", entry.ok ? "text-[var(--color-text-primary)]" : "text-rose-600")}>
                      {entry.ok ? "Imported" : "Failed"} · {entry.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] font-mono truncate">{entry.pid}</p>
                    {!entry.ok && entry.message && (
                      <p className="text-[11px] text-rose-600 mt-0.5">{entry.message}</p>
                    )}
                  </div>
                  {entry.productId && (
                    <Link href={`/admin/products/${entry.productId}`} className="shrink-0 text-[12px] font-medium text-[var(--color-accent)] hover:underline">
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={cn(cardCls, "p-4 space-y-3")}>
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">After import</h2>
          <ol className="text-[12.5px] text-[var(--color-text-muted)] space-y-2 list-decimal list-inside">
            <li>Product saved as a draft with variants</li>
            <li>Review pricing and images in admin</li>
            <li>Publish when ready for the storefront</li>
          </ol>
          <Input
            inputSize="sm"
            value={draftReviewQuery}
            onChange={(e) => setDraftReviewQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToDraftReview()}
            placeholder="Search CJ drafts to review…"
            icon={<FileEdit className="h-3.5 w-3.5" />}
            iconRight={
              <button
                type="button"
                onClick={() => goToDraftReview()}
                className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
              >
                Open
              </button>
            }
            className="h-9"
          />
          <Link
            href="/admin/products?status=draft&source=cj"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-[var(--color-border)] text-[13px] font-medium hover:bg-[var(--color-surface-secondary)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            All CJ drafts
          </Link>
        </div>
      </div>

      {preview && (
        <PreviewPanel
          product={preview}
          imported={Boolean(importedMap[preview.pid])}
          importedProductId={importedMap[preview.pid]}
          importing={importingPid === preview.pid}
          onClose={() => setPreview(null)}
          onImport={() => runImport(preview.pid, preview.productNameEn)}
          onResync={() => runImport(preview.pid, preview.productNameEn, true)}
        />
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: string;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "rounded-sm border px-3 py-2 min-w-[100px]",
        accent
          ? "border-[var(--color-accent)]/30 bg-[var(--color-accent-light)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
  if (href) return <Link href={href} className="hover:opacity-90 transition-opacity">{inner}</Link>;
  return inner;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 w-9 rounded-md border border-[var(--color-border)] inline-flex items-center justify-center disabled:opacity-40 hover:bg-[var(--color-surface-secondary)]"
    >
      {children}
    </button>
  );
}

function ProductRow({
  product,
  imported,
  importedProductId,
  importing,
  selected,
  onToggleSelect,
  onPreview,
  onImport,
  onResync,
}: {
  product: CJProduct;
  imported: boolean;
  importedProductId?: string;
  importing: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onImport: () => void;
  onResync: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const price = productPrice(product);
  const stock = product.warehouseInventoryNum;

  return (
    <article
      className={cn(
        "flex gap-3 p-3 rounded-sm border bg-[var(--color-surface)] transition-colors",
        selected ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20" : "border-[var(--color-border)]",
        imported && "bg-emerald-50/30 dark:bg-emerald-950/10"
      )}
    >
      <button
        type="button"
        onClick={onToggleSelect}
        disabled={imported}
        className={cn(
          "mt-1 h-4 w-4 shrink-0 rounded border flex items-center justify-center",
          selected ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white" : "border-[var(--color-border)]",
          imported && "opacity-40 cursor-not-allowed"
        )}
        aria-label={selected ? "Deselect" : "Select"}
      >
        {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </button>

      <button type="button" onClick={onPreview} className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)]">
        {product.bigImage && !imgErr ? (
          <Image src={product.bigImage} alt="" fill className="object-cover" onError={() => setImgErr(true)} unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-5 w-5 text-[var(--color-text-muted)]/50" />
          </div>
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <button type="button" onClick={onPreview} className="text-left">
          <p className="text-[13px] font-medium text-[var(--color-text-primary)] line-clamp-2 leading-snug hover:text-[var(--color-accent)]">
            {product.productNameEn}
          </p>
        </button>
        <p className="text-[11px] font-mono text-[var(--color-text-muted)] truncate">{product.productSku}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">${price.toFixed(2)}</span>
          {stock != null && <span>Stock {stock}</span>}
          {product.countryCode && <span>{WAREHOUSE_LABELS[product.countryCode] ?? product.countryCode}</span>}
          {(product.isFreeShipping || product.addMarkStatus === 1) && (
            <span className="inline-flex items-center gap-0.5 text-emerald-600">
              <Truck className="h-3 w-3" /> Free ship
            </span>
          )}
          {product.verifiedWarehouse === 1 && <span className="text-sky-600">Verified</span>}
          {imported && <span className="text-emerald-600 font-medium">In catalog</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1 shrink-0 justify-center">
        {imported && importedProductId ? (
          <>
            <Link
              href={`/admin/products/${importedProductId}`}
              className="h-8 px-2.5 rounded-md text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 inline-flex items-center justify-center"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={onResync}
              disabled={importing}
              title="Re-sync from CJ"
              className="h-8 w-full rounded-md border border-[var(--color-border)] inline-flex items-center justify-center"
            >
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onImport}
            disabled={importing}
            className="h-8 px-3 rounded-md bg-[var(--color-text-primary)] text-[var(--color-surface)] text-[11px] font-semibold hover:bg-[var(--color-accent)] disabled:opacity-60"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Import"}
          </button>
        )}
      </div>
    </article>
  );
}

function PreviewPanel({
  product,
  imported,
  importedProductId,
  importing,
  onClose,
  onImport,
  onResync,
}: {
  product: CJProduct;
  imported: boolean;
  importedProductId?: string;
  importing: boolean;
  onClose: () => void;
  onImport: () => void;
  onResync: () => void;
}) {
  const price = productPrice(product);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">Product preview</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-[var(--color-surface-secondary)] inline-flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="relative aspect-square rounded-sm overflow-hidden bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)]">
            {product.bigImage ? (
              <Image src={product.bigImage} alt={product.productNameEn} fill className="object-contain p-2" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="h-10 w-10 text-[var(--color-text-muted)]/40" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug">{product.productNameEn}</h3>
            <p className="mt-2 text-2xl font-bold tabular-nums">${price.toFixed(2)} <span className="text-[13px] font-normal text-[var(--color-text-muted)]">USD cost</span></p>
          </div>

          <dl className="space-y-2 text-[13px]">
            <PreviewRow label="PID" value={product.pid} mono copyable />
            <PreviewRow label="SKU" value={product.productSku} mono copyable />
            <PreviewRow label="Category" value={product.threeCategoryName || product.categoryName || "—"} />
            <PreviewRow label="Stock" value={product.warehouseInventoryNum != null ? String(product.warehouseInventoryNum) : "—"} />
            <PreviewRow label="Listed on stores" value={product.listedNum ? String(product.listedNum) : "—"} />
            <PreviewRow label="Warehouse" value={product.countryCode ? (WAREHOUSE_LABELS[product.countryCode] ?? product.countryCode) : "—"} />
            <PreviewRow label="Dispatch" value={product.deliveryCycle ? `${product.deliveryCycle} days` : "—"} />
            <PreviewRow label="Free shipping" value={product.isFreeShipping || product.addMarkStatus === 1 ? "Yes" : "No"} />
            <PreviewRow label="Verified supplier" value={product.verifiedWarehouse === 1 ? "Yes" : "No"} />
          </dl>
        </div>

        <div className="p-4 border-t border-[var(--color-border)] space-y-2 bg-[var(--color-surface-secondary)]/30">
          {imported && importedProductId ? (
            <>
              <Link
                href={`/admin/products/${importedProductId}`}
                className="flex h-10 items-center justify-center rounded-md bg-emerald-600 text-white text-[13px] font-semibold"
              >
                Open in admin
              </Link>
              <button
                type="button"
                onClick={onResync}
                disabled={importing}
                className="w-full h-10 rounded-md border border-[var(--color-border)] text-[13px] font-medium inline-flex items-center justify-center gap-2"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Re-sync from CJ
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onImport}
              disabled={importing}
              className="w-full h-10 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-semibold disabled:opacity-60"
            >
              {importing ? "Importing…" : "Import as draft"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

function PreviewRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-[var(--color-border)]/50 last:border-0">
      <dt className="text-[var(--color-text-muted)] shrink-0">{label}</dt>
      <dd className={cn("text-right flex items-center gap-1 min-w-0", mono && "font-mono text-[12px]")}>
        <span className="truncate">{value}</span>
        {copyable && (
          <button type="button" onClick={() => copyText(value)} className="shrink-0 p-1 rounded-md hover:bg-[var(--color-surface-secondary)]" title="Copy">
            <Copy className="h-3 w-3 text-[var(--color-text-muted)]" />
          </button>
        )}
      </dd>
    </div>
  );
}

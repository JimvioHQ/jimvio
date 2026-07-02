"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ClipboardPaste,
  ExternalLink,
  FileEdit,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { publishAdminProduct } from "@/lib/actions/admin-products";
import { RefreshCJStockButton } from "@/components/admin/cj/refresh-cj-stock-button";
import { FilterSidebar } from "@/components/admin/cj/import-intelligence/filter-sidebar";
import { VirtualizedProductGrid } from "@/components/admin/cj/import-intelligence/virtualized-product-grid";
import { SmartSearchBar } from "@/components/admin/cj/import-intelligence/smart-search-bar";
import { BulkActionsBar } from "@/components/admin/cj/import-intelligence/bulk-actions-bar";
import { PreviewDrawer } from "@/components/admin/cj/import-intelligence/preview-drawer";
import { ImportSettingsPanel } from "@/components/admin/cj/import-intelligence/import-settings-panel";
import { QuickFiltersRow } from "@/components/admin/cj/import-intelligence/quick-filters-row";
import { SavedPresetsBar } from "@/components/admin/cj/import-intelligence/saved-presets-bar";
import { SessionAnalytics } from "@/components/admin/cj/import-intelligence/session-analytics";
import { SortSelector } from "@/components/admin/cj/import-intelligence/sort-selector";
import { ImportQueueMonitor } from "@/components/admin/cj/import-intelligence/import-queue-monitor";
import {
  PublishSafetyDialog,
  PublishSummaryModal,
} from "@/components/admin/cj/import-intelligence/publish-summary-modal";
import {
  fetchCJProducts,
  fetchCJCategories,
  fetchImportedMap,
  invalidateCJCache,
} from "@/lib/cj/import-intelligence/api";
import {
  activeQuickFilterKeys,
  applyIntelligenceFilters,
  computeFilterCounts,
  DEFAULT_CJ_FILTERS,
  DEFAULT_INTELLIGENCE_FILTERS,
  enrichProduct,
  enrichProductBatch,
  getQuickFilterCountPool,
  intelligenceFilterCount,
  toggleQuickFilter,
  trendingToApiFilters,
  type QuickFilterKey,
} from "@/lib/cj/import-intelligence/filters";
import {
  DEFAULT_IMPORT_SETTINGS,
  loadImportSettings,
  saveImportSettings,
} from "@/lib/cj/import-intelligence/import-settings";
import {
  loadActivePresetIds,
  togglePreset,
} from "@/lib/cj/import-intelligence/presets";
import {
  checkPublishEligibility,
  createQueueState,
  shouldPublishProduct,
  type ImportQueueState,
  type PublishSummary,
} from "@/lib/cj/import-intelligence/publish-rules";
import {
  computeSessionAnalytics,
  sortProducts,
  type SortOption,
} from "@/lib/cj/import-intelligence/sorting";
import {
  filterBySmartSearch,
  getSearchSuggestions,
  loadRecentSearches,
  saveRecentSearch,
} from "@/lib/cj/import-intelligence/search";
import { mergeIntelligenceIntoProducts } from "@/lib/cj/import-intelligence/enrichment-merge";
import { useLazyCjEnrichment } from "@/lib/cj/import-intelligence/use-lazy-cj-enrichment";
import type {
  CJApiFilters,
  EnrichedProduct,
  ImportLogEntry,
  ImportedMap,
  ImportMode,
  ImportSettings,
  IntelligenceFilters,
} from "@/lib/cj/import-intelligence/types";

const PAGE_SIZE = 48;
const SCHEDULED_KEY = "jimvio:cj-scheduled-publishes";

function useIsLgScreen(): boolean {
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isLg;
}

function saveScheduledPublish(productId: string, name: string, at: string, tz?: string) {
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push({ productId, name, at, tz });
    localStorage.setItem(SCHEDULED_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export default function CJImportBrowser({
  cjDraftCount = 0,
  cjTotalCount = 0,
}: {
  cjDraftCount?: number;
  cjTotalCount?: number;
}) {
  const [cjFilters] = useState<CJApiFilters>(DEFAULT_CJ_FILTERS);
  const [intelFilters, setIntelFilters] = useState<IntelligenceFilters>(
    DEFAULT_INTELLIGENCE_FILTERS
  );
  const [activePresetIds, setActivePresetIds] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("default");
  const [importMode, setImportMode] = useState<ImportMode>("draft");
  const [searchQuery, setSearchQuery] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [importedMap, setImportedMap] = useState<ImportedMap>({});
  const [skuIndex, setSkuIndex] = useState<Record<string, string>>({});
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [selectedPids, setSelectedPids] = useState<Set<string>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [preview, setPreview] = useState<EnrichedProduct | null>(null);
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);
  const [importSettings, setImportSettings] = useState<ImportSettings>(
    DEFAULT_IMPORT_SETTINGS
  );
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [directPid, setDirectPid] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importQueue, setImportQueue] = useState<ImportQueueState | null>(null);
  const [publishSummary, setPublishSummary] = useState<PublishSummary | null>(null);
  const [safetyDialog, setSafetyDialog] = useState<{
    open: boolean;
    qualified: EnrichedProduct[];
    unqualified: EnrichedProduct[];
    mode: ImportMode;
  } | null>(null);
  const [sessionPublished, setSessionPublished] = useState(0);
  const isLgScreen = useIsLgScreen();

  const {
    enrichmentMap,
    version: enrichmentVersion,
    pendingCount: enrichmentPending,
    scheduleVisible,
    enrichedCount,
  } = useLazyCjEnrichment(hasSearched);

  useEffect(() => {
    setImportSettings(loadImportSettings());
    setRecentSearches(loadRecentSearches());
    setActivePresetIds(loadActivePresetIds());
    fetchImportedMap()
      .then((map) => setImportedMap(map))
      .catch(() => {});
    fetch("/api/admin/cj/imported")
      .then((r) => r.json())
      .then((data) => {
        if (data?.map) {
          const map: ImportedMap = {};
          for (const [pid, val] of Object.entries(data.map)) {
            if (typeof val === "string") map[pid] = { productId: val };
            else map[pid] = val as ImportedMap[string];
          }
          setImportedMap(map);
        }
        if (data?.skuIndex) setSkuIndex(data.skuIndex);
      })
      .catch(() => {});
    fetchCJCategories().catch(() => {});
  }, []);

  const handleImportSettingsChange = (s: ImportSettings) => {
    setImportSettings(s);
    saveImportSettings(s);
    setImportMode(s.defaultImportMode);
  };

  const sessionImports = importLog.filter((e) => e.ok).length;
  const activeFilterCount = intelligenceFilterCount(intelFilters);
  const quickFilterActive = useMemo(
    () => activeQuickFilterKeys(intelFilters),
    [intelFilters]
  );

  const enrichedCatalog = useMemo(
    () => mergeIntelligenceIntoProducts(products, enrichmentMap, importedMap),
    [products, enrichmentMap, importedMap, enrichmentVersion]
  );

  const countPool = useMemo(
    () =>
      getQuickFilterCountPool(
        enrichedCatalog,
        intelFilters,
        localSearch,
        importedMap
      ),
    [enrichedCatalog, intelFilters, localSearch, importedMap]
  );

  const filterCounts = useMemo(
    () => computeFilterCounts(countPool, intelFilters),
    [countPool, intelFilters]
  );

  const sessionStats = useMemo(
    () =>
      computeSessionAnalytics(products, sessionImports, sessionPublished),
    [products, sessionImports, sessionPublished]
  );

  const loadPage = useCallback(
    async (pageNum: number, append = false) => {
      const apiFilters = trendingToApiFilters(intelFilters, {
        ...cjFilters,
        keyWord: searchQuery,
      });

      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError("");
        setHasSearched(true);
      }

      try {
        const { products: rows, total: t } = await fetchCJProducts(
          apiFilters,
          pageNum,
          PAGE_SIZE
        );

        const enriched = enrichProductBatch(
          rows.map((p) => ({
            ...p,
            variantCount:
              p.variantCount ??
              (p.productType && p.productType !== "ORDINARY" ? 2 : 1),
          })),
          importedMap
        );

        setProducts((prev) => (append ? [...prev, ...enriched] : enriched));
        setTotal(t);
        setPage(pageNum);
        if (!append) setSelectedPids(new Set());
      } catch (e) {
        setError((e as Error).message);
        if (!append) setProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cjFilters, intelFilters, searchQuery, importedMap]
  );

  const runSearch = useCallback(() => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      setRecentSearches(loadRecentSearches());
    }
    invalidateCJCache();
    loadPage(1, false);
  }, [searchQuery, loadPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    if (page * PAGE_SIZE < total) loadPage(page + 1, true);
  }, [loading, loadingMore, page, total, loadPage]);

  const hasMore = page * PAGE_SIZE < total;

  const suggestions = useMemo(
    () => getSearchSuggestions(products, searchQuery),
    [products, searchQuery]
  );

  const visibleProducts = useMemo(() => {
    let result = applyIntelligenceFilters(enrichedCatalog, intelFilters);
    if (localSearch.trim()) {
      result = filterBySmartSearch(result, localSearch).map((p) =>
        enrichProduct(p, importedMap)
      );
    }
    return sortProducts(result, sortOption);
  }, [enrichedCatalog, intelFilters, localSearch, importedMap, sortOption]);

  const handleVisiblePidsChange = useCallback(
    (pids: string[]) => {
      scheduleVisible(pids);
    },
    [scheduleVisible]
  );

  const tryPublish = useCallback(
    async (
      product: EnrichedProduct,
      productId: string,
      mode: ImportMode
    ): Promise<{ published: boolean; drafted: boolean; reasons: string[] }> => {
      const decision = shouldPublishProduct(
        product,
        mode,
        importSettings.autoPublishRules
      );

      if (importSettings.publishVisibility === "hidden") {
        return { published: false, drafted: true, reasons: ["Hidden visibility"] };
      }

      if (importSettings.publishVisibility === "scheduled") {
        if (importSettings.scheduledAt) {
          saveScheduledPublish(
            productId,
            product.productNameEn,
            importSettings.scheduledAt,
            importSettings.scheduledTimezone
          );
          toast.info(`Scheduled: ${product.productNameEn}`);
        }
        return { published: false, drafted: true, reasons: ["Scheduled for later"] };
      }

      if (decision.action !== "publish") {
        return { published: false, drafted: true, reasons: decision.reasons };
      }

      const pub = await publishAdminProduct(productId);
      if (!pub.success) {
        return {
          published: false,
          drafted: true,
          reasons: [pub.error ?? "Publish failed"],
        };
      }
      return { published: true, drafted: false, reasons: [] };
    },
    [importSettings]
  );

  const importOne = useCallback(
    async (
      product: EnrichedProduct,
      mode: ImportMode = "draft",
      resync = false
    ) => {
      setImportingPid(product.pid);
      try {
        const res = await fetch("/api/cj/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pid: product.pid }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        let published = false;
        if (json.productId && mode !== "draft" && !resync) {
          const outcome = await tryPublish(product, json.productId, mode);
          published = outcome.published;
        }

        if (json.productId) {
          setImportedMap((prev) => ({
            ...prev,
            [product.pid]: {
              productId: json.productId,
              name: product.productNameEn,
            },
          }));
          setProducts((prev) =>
            prev.map((p) =>
              p.pid === product.pid
                ? enrichProduct(p, {
                    ...importedMap,
                    [product.pid]: {
                      productId: json.productId,
                      name: product.productNameEn,
                    },
                  })
                : p
            )
          );
        }

        if (published) setSessionPublished((n) => n + 1);

        setImportLog((prev) => [
          {
            pid: product.pid,
            name: product.productNameEn,
            productId: json.productId,
            at: new Date().toISOString(),
            ok: true,
            published,
          },
          ...prev.slice(0, 49),
        ]);

        toast.success(
          resync
            ? "Re-synced from CJ"
            : published
              ? "Imported & published"
              : "Imported as draft",
          {
            action: json.productId
              ? {
                  label: "Open",
                  onClick: () => {
                    window.location.href = `/admin/products/${json.productId}`;
                  },
                }
              : undefined,
          }
        );
        return { ok: true, published, productId: json.productId as string };
      } catch (e) {
        const message = (e as Error).message;
        setImportLog((prev) => [
          {
            pid: product.pid,
            name: product.productNameEn,
            at: new Date().toISOString(),
            ok: false,
            message,
          },
          ...prev.slice(0, 49),
        ]);
        toast.error(message);
        return { ok: false, published: false };
      } finally {
        setImportingPid(null);
      }
    },
    [importedMap, tryPublish]
  );

  const runBulkImport = useCallback(
    async (items: EnrichedProduct[], mode: ImportMode) => {
      if (items.length === 0) return;

      setBulkImporting(true);
      const queue = createQueueState(items.length);
      setImportQueue(queue);

      const summary: PublishSummary = {
        published: 0,
        drafted: 0,
        skipped: 0,
        skipReasons: {},
      };
      const skipReasonsList: Array<{ reasons: string[] }> = [];

      for (const product of items) {
        setImportQueue((q) =>
          q ? { ...q, currentName: product.productNameEn } : q
        );

        const result = await importOne(product, mode);
        queue.completed += 1;

        if (result.ok) {
          queue.succeeded += 1;
          if (result.published) {
            queue.published += 1;
            summary.published += 1;
          } else {
            queue.drafted += 1;
            summary.drafted += 1;
          }
        } else {
          queue.failed += 1;
          summary.skipped += 1;
          skipReasonsList.push({ reasons: ["Import failed"] });
        }

        setImportQueue({ ...queue });
      }

      for (const item of skipReasonsList) {
        for (const r of item.reasons) {
          summary.skipReasons[r] = (summary.skipReasons[r] ?? 0) + 1;
        }
      }

      setImportQueue((q) => (q ? { ...q, active: false, currentName: undefined } : q));
      setBulkImporting(false);
      setSelectedPids(new Set());
      setPublishSummary(summary);

      if (summary.published) toast.success(`Published ${summary.published} products`);
      if (summary.drafted) toast.info(`${summary.drafted} saved as drafts`);
    },
    [importOne]
  );

  function startBulkImport(mode: ImportMode) {
    const items = visibleProducts.filter(
      (p) => selectedPids.has(p.pid) && !p.intelligence.isImported
    );
    if (items.length === 0) {
      toast.error("No new products selected");
      return;
    }

    if (mode === "publish" || mode === "auto") {
      const qualified = items.filter((p) => checkPublishEligibility(p).eligible);
      const unqualified = items.filter((p) => !checkPublishEligibility(p).eligible);
      if (unqualified.length > 0) {
        setSafetyDialog({ open: true, qualified, unqualified, mode });
        return;
      }
    }

    void runBulkImport(items, mode);
  }

  function handleQuickFilterToggle(key: QuickFilterKey) {
    setIntelFilters((f) => toggleQuickFilter(key, f));
  }

  function handlePresetToggle(id: string) {
    const { activeIds, filters } = togglePreset(id, activePresetIds);
    setActivePresetIds(activeIds);
    setIntelFilters(filters);
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
    setSelectedPids(
      new Set(
        visibleProducts
          .filter((p) => !p.intelligence.isImported)
          .map((p) => p.pid)
      )
    );
  }

  function getDuplicateInfo(product: EnrichedProduct) {
    const byPid = Boolean(importedMap[product.pid]);
    const bySku = Boolean(
      product.productSku &&
        skuIndex[product.productSku.toLowerCase()] &&
        skuIndex[product.productSku.toLowerCase()] !== product.pid
    );
    return {
      byPid,
      bySku,
      byName: false,
      existingProductId: importedMap[product.pid]?.productId,
      existingName: importedMap[product.pid]?.name,
    };
  }

  return (
    <div className="space-y-3 pb-10">
      {/* Header + session analytics */}
      <div className="relative overflow-hidden rounded-sm border border-[var(--color-border)] bg-gradient-to-br from-[#111827] via-[#1a2332] to-[#111827] p-4 text-white">
        <div className="relative flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div>
              <Link
                href="/admin/products"
                className="inline-flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white mb-2"
              >
                <ArrowLeft className="h-3 w-3" />
                Products
              </Link>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#FF5A1F]" />
                <h1 className="text-lg font-bold tracking-tight">
                  Import Intelligence Command Center
                </h1>
              </div>
              <p className="text-[12px] text-white/65 mt-1 max-w-lg">
                Profit, shipping, supplier trust & publish readiness — in 3 seconds per product.
              </p>
            </div>
          </div>
          <SessionAnalytics
            todaysImports={sessionStats.todaysImports}
            publishedProducts={sessionStats.publishedProducts}
            draftProducts={sessionStats.draftProducts}
            averageMargin={sessionStats.averageMargin}
            averageShippingDays={sessionStats.averageShippingDays}
            averageProfit={sessionStats.averageProfit}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-xl p-3 space-y-2">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="flex-1">
            <SmartSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={runSearch}
              suggestions={suggestions}
              recentSearches={recentSearches}
              loading={loading}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={runSearch}
              disabled={loading}
              className="h-9 px-3 rounded-sm bg-[#FF5A1F] text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Search
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="h-9 px-2.5 rounded-sm border border-[var(--color-border)] text-[12px] lg:hidden inline-flex items-center gap-1"
            >
              {sidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className={cn(
                "h-9 px-2.5 rounded-sm border text-[12px]",
                settingsOpen
                  ? "border-[#FF5A1F]/40 bg-[#FF5A1F]/10 text-[#FF5A1F]"
                  : "border-[var(--color-border)]"
              )}
            >
              Settings
            </button>
          </div>
        </div>

        {hasSearched && products.length > 0 && (
          <Input
            inputSize="sm"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Fuzzy filter loaded results…"
            className="h-8 text-[11px]"
          />
        )}

        <div className="flex gap-2 pt-1 border-t border-[var(--color-border)]">
          <Input
            inputSize="sm"
            value={directPid}
            onChange={(e) => setDirectPid(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && directPid.trim()) {
                const pid = directPid.trim();
                void (async () => {
                  setImportingPid(pid);
                  try {
                    const res = await fetch("/api/cj/import", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ pid }),
                    });
                    const json = await res.json();
                    if (!json.success) throw new Error(json.error);
                    toast.success("Imported as draft");
                    if (json.productId) {
                      setImportedMap((prev) => ({
                        ...prev,
                        [pid]: { productId: json.productId },
                      }));
                    }
                  } catch (err) {
                    toast.error((err as Error).message);
                  } finally {
                    setImportingPid(null);
                  }
                })();
                setDirectPid("");
              }
            }}
            placeholder="Paste CJ PID…"
            icon={<ClipboardPaste className="h-3.5 w-3.5 opacity-60" />}
            className="h-8 flex-1"
          />
          <RefreshCJStockButton disabled={cjTotalCount === 0} />
        </div>

        {settingsOpen && (
          <ImportSettingsPanel
            settings={importSettings}
            onChange={handleImportSettingsChange}
            compact
          />
        )}
      </div>

      {importQueue?.active && <ImportQueueMonitor queue={importQueue} />}

      {hasSearched && (
        <>
          <QuickFiltersRow
            counts={filterCounts}
            activeKeys={quickFilterActive}
            onToggle={handleQuickFilterToggle}
            hasCatalogResults={hasSearched && !loading}
            visibleCount={visibleProducts.length}
            isEnriching={enrichmentPending > 0}
            enrichedCount={enrichedCount}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SavedPresetsBar
              activePresetIds={activePresetIds}
              onTogglePreset={handlePresetToggle}
            />
            <SortSelector value={sortOption} onChange={setSortOption} />
          </div>
          <BulkActionsBar
            selectedCount={selectedPids.size}
            totalVisible={
              visibleProducts.filter((p) => !p.intelligence.isImported).length
            }
            bulkImporting={bulkImporting}
            importMode={importMode}
            onImportModeChange={(m) => {
              setImportMode(m);
              setImportSettings((s) => {
                const next = { ...s, defaultImportMode: m };
                saveImportSettings(next);
                return next;
              });
            }}
            onSelectAll={selectAllVisible}
            onImportDraft={() => startBulkImport("draft")}
            onImportAndPublish={() => startBulkImport(importMode === "draft" ? "publish" : importMode)}
            onSyncSelected={async () => {
              const pids = Array.from(selectedPids).filter((pid) => importedMap[pid]);
              for (const pid of pids) {
                const p = products.find((x) => x.pid === pid);
                if (p) await importOne(p, "draft", true);
              }
            }}
          />
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-sm border border-rose-200 bg-rose-50 text-rose-800 text-[12px]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!hasSearched && !loading ? (
        <EmptyState onSearch={runSearch} />
      ) : (
        <div className="flex gap-3">
          {sidebarOpen && isLgScreen && (
            <div className="shrink-0 w-[240px]">
              <FilterSidebar
                filters={intelFilters}
                onChange={setIntelFilters}
                activeCount={activeFilterCount}
              />
            </div>
          )}

          {sidebarOpen && !isLgScreen && (
            <div
              className="fixed inset-0 z-30 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            >
              <div
                className="absolute left-0 top-0 h-full w-[260px] p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <FilterSidebar
                  filters={intelFilters}
                  onChange={setIntelFilters}
                  activeCount={activeFilterCount}
                />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {hasSearched && !loading && (
              <p className="text-[11px] text-[var(--color-text-muted)] mb-2 tabular-nums">
                <strong className="text-[var(--color-text-primary)]">
                  {visibleProducts.length.toLocaleString()}
                </strong>{" "}
                shown · {total.toLocaleString()} in catalog
                {activeFilterCount > 0 && (
                  <span className="ml-2 text-[#FF5A1F]">
                    {activeFilterCount} filters
                  </span>
                )}
              </p>
            )}
            <VirtualizedProductGrid
              products={visibleProducts}
              loading={loading}
              loadingMore={loadingMore}
              importingPid={importingPid}
              selectedPids={selectedPids}
              importMode={importMode}
              onToggleSelect={toggleSelect}
              onPreview={setPreview}
              onImport={(p) => void importOne(p, "draft")}
              onImportAndPublish={(p) => void importOne(p, importMode === "draft" ? "publish" : importMode)}
              onResync={(p) => void importOne(p, "draft", true)}
              onLoadMore={loadMore}
              hasMore={hasMore}
              onVisiblePidsChange={handleVisiblePidsChange}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {importLog.length > 0 && (
          <div className="lg:col-span-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
              <h2 className="text-[12px] font-semibold">Session Log</h2>
            </div>
            <ul className="divide-y divide-[var(--color-border)] max-h-40 overflow-y-auto">
              {importLog.slice(0, 15).map((entry, i) => (
                <li
                  key={`${entry.pid}-${entry.at}-${i}`}
                  className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0 truncate">
                    <span className={entry.ok ? "" : "text-rose-600"}>
                      {entry.ok ? (entry.published ? "↑" : "✓") : "✗"}{" "}
                      {entry.name}
                    </span>
                  </div>
                  {entry.productId && (
                    <Link
                      href={`/admin/products/${entry.productId}`}
                      className="text-[#FF5A1F] shrink-0 hover:underline"
                    >
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2">
          <h2 className="text-[12px] font-semibold">Catalog</h2>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {cjTotalCount} CJ products · {cjDraftCount} drafts pending
          </p>
          <Link
            href="/admin/products?status=draft&source=cj"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border border-[var(--color-border)] text-[11px] font-medium hover:bg-[var(--color-surface-secondary)]"
          >
            <FileEdit className="h-3 w-3" />
            Review Drafts
            <ExternalLink className="h-3 w-3 opacity-50" />
          </Link>
        </div>
      </div>

      {preview && (
        <PreviewDrawer
          product={preview}
          importing={importingPid === preview.pid}
          importSettings={importSettings}
          onImportSettingsChange={handleImportSettingsChange}
          duplicateInfo={getDuplicateInfo(preview)}
          onClose={() => setPreview(null)}
          onImport={() => void importOne(preview, "draft")}
          onImportAndPublish={() =>
            void importOne(
              preview,
              importMode === "draft" ? "publish" : importMode
            )
          }
          onResync={() => void importOne(preview, "draft", true)}
        />
      )}

      {publishSummary && (
        <PublishSummaryModal
          summary={publishSummary}
          onClose={() => setPublishSummary(null)}
        />
      )}

      {safetyDialog?.open && (
        <PublishSafetyDialog
          open
          qualifiedCount={safetyDialog.qualified.length}
          unqualifiedCount={safetyDialog.unqualified.length}
          onPublishQualified={() => {
            const { qualified, unqualified, mode } = safetyDialog;
            setSafetyDialog(null);
            void (async () => {
              await runBulkImport(qualified, mode);
              if (unqualified.length > 0) {
                await runBulkImport(unqualified, "draft");
              }
            })();
          }}
          onDraftUnqualified={() => {
            const all = [...safetyDialog.qualified, ...safetyDialog.unqualified];
            setSafetyDialog(null);
            void runBulkImport(all, "draft");
          }}
          onCancel={() => setSafetyDialog(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="rounded-sm border border-dashed border-[var(--color-border)] py-16 px-6 text-center">
      <Sparkles className="h-8 w-8 text-[#FF5A1F] mx-auto mb-3" />
      <h3 className="text-[15px] font-bold">Global Sourcing Command Center</h3>
      <p className="mt-1 text-[12px] text-[var(--color-text-muted)] max-w-sm mx-auto">
        Search CJ to evaluate profit, shipping, and publish readiness instantly.
      </p>
      <button
        type="button"
        onClick={onSearch}
        className="mt-4 h-9 px-4 rounded-sm bg-[#FF5A1F] text-white text-[12px] font-semibold"
      >
        Search Catalog
      </button>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ClipboardPaste,
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
import {
  FilterSidebar,
  loadFilterSidebarCollapsed,
  saveFilterSidebarCollapsed,
  type IntelligenceFilterChangeHandler,
} from "@/components/admin/cj/import-intelligence/filter-sidebar";
import { VirtualizedProductGrid } from "@/components/admin/cj/import-intelligence/virtualized-product-grid";
import { SmartSearchBar } from "@/components/admin/cj/import-intelligence/smart-search-bar";
import { BulkActionsBar } from "@/components/admin/cj/import-intelligence/bulk-actions-bar";
import { PreviewDrawer } from "@/components/admin/cj/import-intelligence/preview-drawer";
import { ImportSettingsPanel } from "@/components/admin/cj/import-intelligence/import-settings-panel";
import { QuickFiltersRow } from "@/components/admin/cj/import-intelligence/quick-filters-row";
import { SavedPresetsBar } from "@/components/admin/cj/import-intelligence/saved-presets-bar";
import { SessionAnalytics } from "@/components/admin/cj/import-intelligence/session-analytics";
import { SortSelector } from "@/components/admin/cj/import-intelligence/sort-selector";
import { PremiumCatalogBar } from "@/components/admin/cj/import-intelligence/premium-catalog-bar";
import { IntelligenceMonitor } from "@/components/admin/cj/import-intelligence/intelligence-monitor";
import { ImportQueueMonitor } from "@/components/admin/cj/import-intelligence/import-queue-monitor";
import {
  PublishSafetyDialog,
  PublishSummaryModal,
} from "@/components/admin/cj/import-intelligence/publish-summary-modal";
import {
  fetchCJProducts,
  fetchCatalogIntelligenceBatch,
  fetchCJCategories,
  fetchImportedMap,
  invalidateCJCache,
  triggerCatalogSync,
} from "@/lib/cj/import-intelligence/api";
import { useDebouncedValue } from "@/lib/cj/import-intelligence/use-debounced";
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
  countCatalogTiers,
  sortPremiumCatalog,
} from "@/lib/cj/import-intelligence/quality-engine";
import {
  filterBySmartSearch,
  getSearchSuggestions,
  loadRecentSearches,
  saveRecentSearch,
} from "@/lib/cj/import-intelligence/search";
import { mergeIntelligenceIntoProducts } from "@/lib/cj/import-intelligence/enrichment-merge";
import { logFilterDebug } from "@/lib/cj/import-intelligence/filter-debug";
import { useLazyCjEnrichment } from "@/lib/cj/import-intelligence/use-lazy-cj-enrichment";
import { StickyBulkPublishBar } from "@/components/admin/cj/import-intelligence/sticky-bulk-publish-bar";
import type {
  CJApiFilters,
  CatalogTier,
  EnrichedProduct,
  ImportLogEntry,
  ImportedMap,
  ImportMode,
  ImportSettings,
  IntelligenceFilters,
} from "@/lib/cj/import-intelligence/types";

const PAGE_SIZE = 48;
const SCHEDULED_KEY = "jimvio:cj-scheduled-publishes";

function dedupeProducts(
  prev: EnrichedProduct[],
  next: EnrichedProduct[],
  append: boolean
): EnrichedProduct[] {
  const map = new Map<string, EnrichedProduct>();
  for (const p of append ? [...prev, ...next] : next) {
    map.set(p.pid, p);
  }
  return [...map.values()];
}

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
  const [visibleTiers, setVisibleTiers] = useState<Set<CatalogTier>>(
    () => new Set<CatalogTier>(["ELITE", "PREMIUM", "PENDING", "STANDARD"])
  );
  const [showAllTiers, setShowAllTiers] = useState(false);
  const [catalogSyncing, setCatalogSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [dbTierCounts, setDbTierCounts] = useState<ReturnType<typeof countCatalogTiers> | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("default");
  const [importMode, setImportMode] = useState<ImportMode>("publish");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [localSearch, setLocalSearch] = useState("");
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
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
  const [filterCollapsed, setFilterCollapsed] = useState(false);
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
  const [vendorConfigured, setVendorConfigured] = useState<boolean | null>(null);
  const [vendorSetupMessage, setVendorSetupMessage] = useState("");
  const [vendorInstructions, setVendorInstructions] = useState<{
    optionA?: { title: string; steps: string[] };
    optionB?: { title: string; sql: string };
  } | null>(null);
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
    setFilterCollapsed(loadFilterSidebarCollapsed());
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
    fetch("/api/admin/cj/setup-status")
      .then((r) => r.json())
      .then((data) => {
        setVendorConfigured(Boolean(data?.vendorConfigured));
        if (data?.message) setVendorSetupMessage(data.message);
        if (data?.instructions) setVendorInstructions(data.instructions);
      })
      .catch(() => {
        setVendorConfigured(false);
        setVendorSetupMessage("Could not verify CJ vendor configuration.");
      });

    void (async () => {
      try {
        setCatalogSyncing(true);
        setError("");
        setHasSearched(true);

        let result = await fetchCJProducts(DEFAULT_CJ_FILTERS, 1, PAGE_SIZE, {
          tiers: ["ELITE", "PREMIUM", "PENDING", "STANDARD"],
        });

        if (result.needsSync || (result.products as unknown as EnrichedProduct[]).length === 0) {
          await fetch("/api/admin/cj/catalog/bootstrap", { method: "POST" });
          invalidateCJCache();
          result = await fetchCJProducts(DEFAULT_CJ_FILTERS, 1, PAGE_SIZE, {
            tiers: ["ELITE", "PREMIUM", "PENDING", "STANDARD"],
          });
        }

        const enriched = (result.products as unknown as EnrichedProduct[]).map(
          (p) => (p.intelligence ? p : enrichProduct(p, {}))
        );
        setProducts(enriched);
        setTotal(result.total);
        setNextCursor(result.nextCursor ?? null);
        if (result.tierCounts) {
          const tc = result.tierCounts;
          setDbTierCounts({
            elite: tc.ELITE ?? 0,
            premium: tc.PREMIUM ?? 0,
            standard: tc.STANDARD ?? 0,
            pending: tc.PENDING ?? 0,
            hidden: tc.HIDDEN ?? 0,
            curated: (tc.ELITE ?? 0) + (tc.PREMIUM ?? 0),
            total: result.total,
          });
        }
        if (result.lastSyncAt) setLastSyncAt(result.lastSyncAt);
        setPage(1);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setCatalogSyncing(false);
      }
    })();
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

  const averageRoi = useMemo(() => {
    if (products.length === 0) return 0;
    const sum = products.reduce((acc, p) => acc + p.intelligence.profit.roi, 0);
    return Math.round(sum / products.length);
  }, [products]);

  const effectiveVisibleTiers = useMemo(() => {
    if (showAllTiers) {
      return new Set<CatalogTier>([
        "ELITE",
        "PREMIUM",
        "STANDARD",
        "PENDING",
        "HIDDEN",
      ]);
    }
    return visibleTiers;
  }, [showAllTiers, visibleTiers]);

  const tierList = useMemo(
    () => Array.from(effectiveVisibleTiers),
    [effectiveVisibleTiers]
  );

  const loadPage = useCallback(
    async (
      pageNum: number,
      append = false,
      filtersOverride?: IntelligenceFilters,
      opts?: { cursor?: string | null; search?: string }
    ) => {
      const activeIntel = filtersOverride ?? intelFilters;
      const apiFilters = trendingToApiFilters(activeIntel, {
        ...cjFilters,
        keyWord: opts?.search ?? debouncedSearch,
      });

      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError("");
        setHasSearched(true);
      }

      try {
        const result = await fetchCJProducts(
          apiFilters,
          pageNum,
          PAGE_SIZE,
          {
            tiers: tierList,
            cursor: append ? (opts?.cursor ?? nextCursor) : null,
          }
        );

        if (result.tierCounts) {
          const tc = result.tierCounts;
          setDbTierCounts({
            elite: tc.ELITE ?? 0,
            premium: tc.PREMIUM ?? 0,
            standard: tc.STANDARD ?? 0,
            pending: tc.PENDING ?? 0,
            hidden: tc.HIDDEN ?? 0,
            curated: (tc.ELITE ?? 0) + (tc.PREMIUM ?? 0),
            total: result.total,
          });
        }

        if (result.needsSync && pageNum === 1 && !append) {
          setCatalogSyncing(true);
          try {
            await triggerCatalogSync();
            invalidateCJCache();
          } finally {
            setCatalogSyncing(false);
          }
        }

        const rows = result.products as unknown as EnrichedProduct[];
        const enriched = rows.map((p) => {
          if (!p.intelligence) return enrichProduct(p, importedMap);
          const imported = importedMap[p.pid];
          return {
            ...p,
            intelligence: {
              ...p.intelligence,
              isImported: Boolean(imported),
              importedProductId: imported?.productId,
            },
          };
        });

        setProducts((prev) => dedupeProducts(prev, enriched, append));
        setTotal(result.total);
        setNextCursor(result.nextCursor ?? null);
        if (result.lastSyncAt) setLastSyncAt(result.lastSyncAt);
        setPage(pageNum);
      } catch (e) {
        setError((e as Error).message);
        if (!append) setProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cjFilters, intelFilters, debouncedSearch, importedMap, tierList, nextCursor]
  );

  const skipTierReload = useRef(true);
  useEffect(() => {
    if (!hasSearched) return;
    if (skipTierReload.current) {
      skipTierReload.current = false;
      return;
    }
    invalidateCJCache();
    setNextCursor(null);
    void loadPage(1, false);
  }, [tierList.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipSearchReload = useRef(true);
  useEffect(() => {
    if (!hasSearched) return;
    if (skipSearchReload.current) {
      skipSearchReload.current = false;
      return;
    }
    invalidateCJCache();
    setNextCursor(null);
    void loadPage(1, false);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback(() => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      setRecentSearches(loadRecentSearches());
    }
    invalidateCJCache();
    setSelectedPids(new Set());
    setNextCursor(null);
    loadPage(1, false, undefined, { search: searchQuery });
  }, [searchQuery, loadPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    if (nextCursor) {
      loadPage(page + 1, true, undefined, { cursor: nextCursor });
    } else if (page * PAGE_SIZE < total) {
      loadPage(page + 1, true);
    }
  }, [loading, loadingMore, page, total, loadPage, nextCursor]);

  const hasMore = Boolean(nextCursor) || page * PAGE_SIZE < total;

  const suggestions = useMemo(
    () => getSearchSuggestions(products, searchQuery),
    [products, searchQuery]
  );

  const catalogTierCounts = useMemo(
    () => dbTierCounts ?? countCatalogTiers(enrichedCatalog),
    [dbTierCounts, enrichedCatalog]
  );

  const visibleProducts = useMemo(() => {
    const hasClientFilters =
      activeFilterCount > 0 || localSearch.trim().length > 0 || sortOption !== "default";

    if (!hasClientFilters) {
      return enrichedCatalog;
    }

    let result = applyIntelligenceFilters(enrichedCatalog, intelFilters);
    if (localSearch.trim()) {
      result = filterBySmartSearch(result, localSearch).map((p) =>
        enrichProduct(p, importedMap)
      );
    }
    if (sortOption === "default") {
      return sortPremiumCatalog(result);
    }
    return sortProducts(result, sortOption);
  }, [
    enrichedCatalog,
    intelFilters,
    localSearch,
    importedMap,
    sortOption,
    activeFilterCount,
  ]);

  useEffect(() => {
    if (!hasSearched || products.length === 0) return;
    if (visibleProducts.length === 0) {
      logFilterDebug("no-visible-products", intelFilters, {
        loaded: products.length,
        visible: 0,
        poolSize: countPool.length,
      });
    }
  }, [
    hasSearched,
    products.length,
    visibleProducts.length,
    intelFilters,
    countPool.length,
  ]);

  const getSelectedProducts = useCallback(() => {
    return enrichedCatalog.filter(
      (p) => selectedPids.has(p.pid) && !p.intelligence.isImported
    );
  }, [enrichedCatalog, selectedPids]);

  const handleVisiblePidsChange = useCallback(
    (pids: string[]) => {
      scheduleVisible(pids);
      void fetchCatalogIntelligenceBatch(pids).then((items) => {
        if (Object.keys(items).length === 0) return;
        setProducts((prev) =>
          prev.map((p) => {
            const row = items[p.pid] as Record<string, unknown> | undefined;
            if (!row) return p;
            return {
              ...p,
              intelligence: {
                ...p.intelligence,
                catalogTier: (row.catalog_tier as CatalogTier) ?? p.intelligence.catalogTier,
                healthScore: Number(row.health_score ?? p.intelligence.healthScore),
                catalogBadges:
                  (row.badges as EnrichedProduct["intelligence"]["catalogBadges"]) ??
                  p.intelligence.catalogBadges,
                enrichmentStatus:
                  (row.enrichment_status as EnrichedProduct["intelligence"]["enrichmentStatus"]) ??
                  p.intelligence.enrichmentStatus,
              },
            };
          })
        );
      });
    },
    [scheduleVisible]
  );

  const tryPublish = useCallback(
    async (
      product: EnrichedProduct,
      productId: string,
      mode: ImportMode
    ): Promise<{ published: boolean; drafted: boolean; reasons: string[] }> => {
      if (mode === "publish") {
        const pub = await publishAdminProduct(productId);
        if (!pub.success) {
          return {
            published: false,
            drafted: true,
            reasons: [pub.error ?? "Publish failed"],
          };
        }
        return { published: true, drafted: false, reasons: [] };
      }

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
              ? "Published to marketplace"
              : mode === "publish"
                ? "Imported — publish pending"
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
    const items = getSelectedProducts();
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

  const handleIntelFiltersChange: IntelligenceFilterChangeHandler = useCallback(
    (next) => {
      setIntelFilters((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        const videoChanged = resolved.hasVideo !== prev.hasVideo;
        if (hasSearched && videoChanged) {
          invalidateCJCache();
          setSelectedPids(new Set());
          void loadPage(1, false, resolved);
        }
        return resolved;
      });
    },
    [hasSearched, loadPage]
  );

  function handleQuickFilterToggle(key: QuickFilterKey) {
    handleIntelFiltersChange(toggleQuickFilter(key, intelFilters));
  }

  function handlePresetToggle(id: string) {
    const { activeIds, filters } = togglePreset(id, activePresetIds);
    setActivePresetIds(activeIds);
    handleIntelFiltersChange(filters);
  }

  function toggleSelect(pid: string) {
    setSelectedPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  function clearSelection() {
    setSelectedPids(new Set());
  }

  function publishSelected() {
    startBulkImport("publish");
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
    <div className="flex w-full min-w-0 flex-col">
      <div className="sticky top-0 z-30 space-y-2 border-b border-[#E5E7EB] bg-[#FAFAFA]/95 pb-2 backdrop-blur-xl">
        <div className="flex h-[56px] max-h-[72px] items-center justify-between gap-3 pt-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/admin/products"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827]"
              title="Back to products"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold tracking-tight text-[#111827]">
                Import Intelligence
              </h1>
              <p className="truncate text-[10px] text-[#9CA3AF]">
                Jimvio Premium Catalog · {cjTotalCount.toLocaleString()} CJ products
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/admin/products?status=draft&source=cj"
              className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-[#E5E7EB] bg-white px-2 text-[10px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
            >
              <FileEdit className="h-3 w-3" />
              <span className="hidden sm:inline">Drafts</span>
              <span className="tabular-nums">({cjDraftCount})</span>
            </Link>
            <RefreshCJStockButton disabled={cjTotalCount === 0} />
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className={cn(
                "inline-flex h-8 items-center rounded-[10px] border px-2.5 text-[10px] font-medium",
                settingsOpen
                  ? "border-[#FF5A1F]/40 bg-[#FF5A1F]/10 text-[#FF5A1F]"
                  : "border-[#E5E7EB] bg-white text-[#374151]"
              )}
            >
              Settings
            </button>
          </div>
        </div>

        <SessionAnalytics
          publishedProducts={sessionStats.publishedProducts}
          catalogSize={total || cjTotalCount}
          highProfitCount={filterCounts.highProfit}
          trendingCount={filterCounts.trending}
          videoCount={filterCounts.hasVideo}
          averageRoi={averageRoi}
          averageMargin={sessionStats.averageMargin}
        />

        <IntelligenceMonitor />

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SmartSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={runSearch}
              suggestions={suggestions}
              recentSearches={recentSearches}
              loading={loading}
            />
          </div>
          <button
            type="button"
            onClick={runSearch}
            disabled={loading}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] bg-[#FF5A1F] px-3.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Search
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="inline-flex h-9 shrink-0 items-center rounded-[12px] border border-[#E5E7EB] bg-white px-2.5 lg:hidden"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5 text-[#374151]" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5 text-[#374151]" />
            )}
          </button>
        </div>

        {settingsOpen && (
          <div className="space-y-2 rounded-[12px] border border-[#E5E7EB] bg-white p-2.5">
            {hasSearched && products.length > 0 && (
              <Input
                inputSize="sm"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Filter loaded results…"
                className="h-8 rounded-[10px] border-[#E5E7EB] text-[11px]"
              />
            )}
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
              icon={<ClipboardPaste className="h-3.5 w-3.5 opacity-50" />}
              className="h-8 rounded-[10px] border-[#E5E7EB]"
            />
            <ImportSettingsPanel
              settings={importSettings}
              onChange={handleImportSettingsChange}
              compact
            />
          </div>
        )}

        {hasSearched && (
          <PremiumCatalogBar
            counts={catalogTierCounts}
            visibleTiers={effectiveVisibleTiers}
            onToggleTier={(tier) => {
              setShowAllTiers(false);
              setVisibleTiers((prev) => {
                const next = new Set(prev);
                if (next.has(tier)) next.delete(tier);
                else next.add(tier);
                return next;
              });
            }}
            showAllTiers={showAllTiers}
            onShowAllTiersChange={setShowAllTiers}
            visibleCount={visibleProducts.length}
            syncing={catalogSyncing}
            lastSyncAt={lastSyncAt}
          />
        )}

        {hasSearched && (
          <QuickFiltersRow
            counts={filterCounts}
            activeKeys={quickFilterActive}
            onToggle={handleQuickFilterToggle}
            hasCatalogResults={hasSearched && !loading}
            visibleCount={visibleProducts.length}
            isEnriching={enrichmentPending > 0}
            enrichedCount={enrichedCount}
          />
        )}
      </div>

      {importQueue?.active && <ImportQueueMonitor queue={importQueue} />}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-[14px] border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {vendorConfigured === false && (
        <div className="mt-2 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
          <p className="font-semibold">CJ vendor not configured</p>
          <p className="mt-1 text-amber-800">
            {vendorSetupMessage ||
              "Catalog sync works without a vendor id. Publishing requires CJ_VENDOR_ID or platform_settings.cj_vendor_id."}
          </p>
          {vendorInstructions?.optionA && (
            <p className="mt-2 text-[11px] text-amber-800">
              <strong>{vendorInstructions.optionA.title}:</strong>{" "}
              {vendorInstructions.optionA.steps.join(" → ")}
            </p>
          )}
          <Link
            href="/admin/settings"
            className="mt-2 inline-flex text-[11px] font-semibold text-[#FF5A1F] hover:underline"
          >
            Open platform settings →
          </Link>
        </div>
      )}

      <div className="w-full min-w-0 pt-2">
        {!hasSearched && !loading ? (
          <EmptyState onSearch={runSearch} />
        ) : (
          <div className="flex w-full min-w-0 items-start gap-3">
            {isLgScreen && (
              <FilterSidebar
                filters={intelFilters}
                onChange={handleIntelFiltersChange}
                activeCount={activeFilterCount}
                collapsed={filterCollapsed}
                onCollapsedChange={(v) => {
                  setFilterCollapsed(v);
                  saveFilterSidebarCollapsed(v);
                }}
              />
            )}

            {sidebarOpen && !isLgScreen && (
              <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              >
                <div
                  className="absolute left-0 top-0 h-full p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FilterSidebar
                    filters={intelFilters}
                    onChange={handleIntelFiltersChange}
                    activeCount={activeFilterCount}
                    collapsed={false}
                    onCollapsedChange={() => {}}
                  />
                </div>
              </div>
            )}

            <div className="min-w-0 flex-1">
              {hasSearched && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] tabular-nums text-[#9CA3AF]">
                    <strong className="font-semibold text-[#111827]">
                      {visibleProducts.length.toLocaleString()}
                    </strong>{" "}
                    shown · {total.toLocaleString()} catalog
                    {activeFilterCount > 0 && (
                      <span className="ml-1.5 text-[#FF5A1F]">
                        · {activeFilterCount} filters
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <SavedPresetsBar
                      activePresetIds={activePresetIds}
                      onTogglePreset={handlePresetToggle}
                    />
                    <SortSelector value={sortOption} onChange={setSortOption} />
                  </div>
                </div>
              )}

              {hasSearched && (
                <BulkActionsBar
                  selectedCount={selectedPids.size}
                  totalVisible={
                    visibleProducts.filter((p) => !p.intelligence.isImported)
                      .length
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
                  onImportAndPublish={() =>
                    startBulkImport(
                      importMode === "draft" ? "publish" : importMode
                    )
                  }
                  onSyncSelected={async () => {
                    const pids = Array.from(selectedPids).filter(
                      (pid) => importedMap[pid]
                    );
                    for (const pid of pids) {
                      const p = products.find((x) => x.pid === pid);
                      if (p) await importOne(p, "draft", true);
                    }
                  }}
                  className="mb-2"
                />
              )}

              <VirtualizedProductGrid
                products={visibleProducts}
                loading={loading}
                loadingMore={loadingMore}
                importingPid={importingPid}
                selectedPids={selectedPids}
                onToggleSelect={toggleSelect}
                onPreview={setPreview}
                onPublish={(p) => void importOne(p, "publish")}
                onResync={(p) => void importOne(p, "draft", true)}
                onLoadMore={loadMore}
                hasMore={hasMore}
                onVisiblePidsChange={handleVisiblePidsChange}
              />
            </div>
          </div>
        )}

        {importLog.length > 0 && (
          <details className="mt-3 rounded-[12px] border border-[#E5E7EB] bg-white">
            <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-[#111827]">
              Session log ({importLog.length})
            </summary>
            <ul className="max-h-32 divide-y divide-[#F3F4F6] overflow-y-auto">
              {importLog.slice(0, 15).map((entry, i) => (
                <li
                  key={`${entry.pid}-${entry.at}-${i}`}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px]"
                >
                  <span
                    className={cn(
                      "min-w-0 truncate",
                      !entry.ok && "text-rose-600"
                    )}
                  >
                    {entry.ok ? (entry.published ? "↑" : "✓") : "✗"}{" "}
                    {entry.name}
                  </span>
                  {entry.productId && (
                    <Link
                      href={`/admin/products/${entry.productId}`}
                      className="shrink-0 text-[#FF5A1F] hover:underline"
                    >
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
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

      <StickyBulkPublishBar
        selectedCount={selectedPids.size}
        publishing={bulkImporting}
        onPublish={publishSelected}
        onClear={clearSelection}
      />
    </div>
  );
}

function EmptyState({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[#E5E7EB] bg-white py-20 px-6 text-center shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#FF5A1F]/10">
        <Sparkles className="h-6 w-6 text-[#FF5A1F]" />
      </div>
      <h3 className="text-[16px] font-bold text-[#111827]">
        Global Sourcing Intelligence
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#9CA3AF]">
        Search the CJ catalog to evaluate profit, shipping, and publish readiness instantly.
      </p>
      <button
        type="button"
        onClick={onSearch}
        className="mt-5 inline-flex h-10 items-center rounded-[14px] bg-[#FF5A1F] px-5 text-[13px] font-semibold text-white shadow-sm hover:opacity-90"
      >
        Search Catalog
      </button>
    </div>
  );
}

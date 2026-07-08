import { getCached, setCached } from "./catalog-cache";
import { timedQuery } from "./query-timing";
import { getCatalogDB } from "./db";
import {
  applyIntelFiltersStandalone,
  getAutoPublishQueuePids,
  getRawSearchPids,
  getWarehouseFilterPids,
  type CatalogFilterIndex,
} from "./catalog-filter-index";
import { searchIndexPids } from "./search-index";
import type {
  CatalogCursor,
  CatalogListParams,
  CatalogListResult,
  CatalogTier,
  CjProductIntelligenceRow,
  CjRawProductRow,
} from "./types";

const TIER_ORDER: CatalogTier[] = [
  "ELITE",
  "PREMIUM",
  "STANDARD",
  "PENDING",
  "HIDDEN",
];

const MAX_ENRICHMENT_ATTEMPTS = 5;

export function makePendingIntelligence(pid: string): CjProductIntelligenceRow {
  const now = new Date().toISOString();
  return {
    pid,
    enrichment_status: "pending",
    enrichment_attempts: 0,
    enriched_at: null,
    last_error: null,
    has_video: false,
    video_count: 0,
    image_count: 0,
    description_length: 0,
    delivery_days: null,
    rating: null,
    review_count: 0,
    supplier_verified: false,
    verified_warehouse: null,
    margin_percent: null,
    health_score: 0,
    confidence_score: 50,
    quality_scores: {},
    opportunity_score: 0,
    catalog_tier: "PENDING",
    trending: false,
    badges: [],
    scored_at: null,
    auto_publish_ready: false,
    auto_publish_score: 0,
    auto_publish_status: "PENDING_ENRICHMENT",
    auto_publish_failures: [],
    pending_enrichment_reasons: [],
    last_auto_publish_check: null,
    created_at: now,
    updated_at: now,
  };
}

export async function upsertRawProducts(
  rows: Array<Omit<CjRawProductRow, "created_at" | "updated_at" | "list_synced_at">>
): Promise<number> {
  if (rows.length === 0) return 0;
  const db = getCatalogDB();
  const now = new Date().toISOString();
  const payload = rows.map((r) => ({
    ...r,
    list_synced_at: now,
    updated_at: now,
  }));

  const { error } = await db.from("cj_raw_products").upsert(payload, { onConflict: "pid" });
  if (error) throw new Error(error.message);

  await ensureIntelligenceRows(rows.map((r) => r.pid));
  return rows.length;
}

export async function ensureIntelligenceRows(pids: string[]): Promise<void> {
  if (pids.length === 0) return;
  const db = getCatalogDB();
  const rows = pids.map((pid) => ({
    pid,
    enrichment_status: "pending" as const,
    catalog_tier: "PENDING" as const,
    auto_publish_status: "PENDING_ENRICHMENT" as const,
    auto_publish_ready: false,
  }));

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await db
      .from("cj_product_intelligence")
      .upsert(chunk, { onConflict: "pid", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
}

/** Create PENDING intelligence for every raw product missing a row. */
export async function backfillIntelligenceFromRaw(): Promise<number> {
  const db = getCatalogDB();
  let backfilled = 0;
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data: rawRows, error } = await db
      .from("cj_raw_products")
      .select("pid")
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!rawRows?.length) break;

    const pids = rawRows.map((r) => r.pid as string);
    const { data: existing } = await db
      .from("cj_product_intelligence")
      .select("pid")
      .in("pid", pids);

    const have = new Set((existing ?? []).map((r) => r.pid as string));
    const missing = pids.filter((pid) => !have.has(pid));

    if (missing.length > 0) {
      await ensureIntelligenceRows(missing);
      backfilled += missing.length;
    }

    if (rawRows.length < pageSize) break;
    offset += pageSize;
  }

  return backfilled;
}

export async function enqueueEnrichment(
  pids: string[],
  priority = 0
): Promise<number> {
  if (pids.length === 0) return 0;
  const db = getCatalogDB();
  const now = new Date().toISOString();
  const rows = pids.map((pid) => ({
    pid,
    priority,
    status: "pending" as const,
    next_attempt_at: now,
    attempts: 0,
  }));

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db
      .from("cj_enrichment_queue")
      .upsert(rows.slice(i, i + BATCH), { onConflict: "pid" });
    if (error) throw new Error(error.message);
  }
  return pids.length;
}

/** Enqueue all products not complete in intelligence table. */
export async function enqueueMissingEnrichment(): Promise<number> {
  const db = getCatalogDB();
  let enqueued = 0;
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await db
      .from("cj_product_intelligence")
      .select("pid")
      .in("enrichment_status", ["pending", "failed", "dead_letter", "processing"])
      .order("pid")
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    const pids = data.map((r) => r.pid as string);
    enqueued += await enqueueEnrichment(pids, 0);

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return enqueued;
}

/** Reset intelligence rows incorrectly marked REQUIREMENTS_MISSING before enrichment. */
export async function realignPendingEnrichmentStatus(limit = 500): Promise<number> {
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_product_intelligence")
    .select("pid")
    .neq("enrichment_status", "complete")
    .eq("auto_publish_status", "REQUIREMENTS_MISSING")
    .limit(limit);

  if (!data?.length) return 0;

  const pids = data.map((r) => r.pid as string);
  const { error } = await db
    .from("cj_product_intelligence")
    .update({
      auto_publish_status: "PENDING_ENRICHMENT",
      auto_publish_ready: false,
      updated_at: new Date().toISOString(),
    })
    .in("pid", pids);

  if (error) throw new Error(error.message);
  return pids.length;
}

const STUCK_ENRICHMENT_MS = 15 * 60_000;

/** Reset enrichment jobs stuck in processing state. */
export async function resetStuckEnrichmentJobs(): Promise<number> {
  const db = getCatalogDB();
  const cutoff = new Date(Date.now() - STUCK_ENRICHMENT_MS).toISOString();
  let reset = 0;

  const { data: intelRows } = await db
    .from("cj_product_intelligence")
    .update({
      enrichment_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("enrichment_status", "processing")
    .lt("updated_at", cutoff)
    .select("pid");

  reset += intelRows?.length ?? 0;

  const { data: queueRows } = await db
    .from("cj_enrichment_queue")
    .update({
      status: "pending",
      next_attempt_at: new Date().toISOString(),
      last_error: "Reset from stuck processing",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("updated_at", cutoff)
    .select("pid");

  reset += queueRows?.length ?? 0;
  return reset;
}

export async function getTierCounts(): Promise<Record<CatalogTier, number>> {
  const cached = getCached<Record<CatalogTier, number>>("tier-counts");
  if (cached) return cached;

  const counts = await timedQuery("getTierCounts", async () => {
    const db = getCatalogDB();
    const entries = await Promise.all(
      TIER_ORDER.map(async (tier) => {
        const { count } = await db
          .from("cj_product_intelligence")
          .select("pid", { count: "exact", head: true })
          .eq("catalog_tier", tier);
        return [tier, count ?? 0] as const;
      })
    );

    const result = Object.fromEntries(entries) as Record<CatalogTier, number>;
    const rawTotal = await getRawCatalogTotal().catch(() => 0);
    const intelSum = TIER_ORDER.reduce((s, t) => s + result[t], 0);
    if (rawTotal > intelSum) {
      result.PENDING += rawTotal - intelSum;
    }
    return result;
  });

  setCached("tier-counts", counts);
  return counts;
}

function parseCursor(raw?: string | null): CatalogCursor | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CatalogCursor;
  } catch {
    return null;
  }
}

function encodeCursor(row: CjRawProductRow, intel: CjProductIntelligenceRow): string {
  return JSON.stringify({
    orders: row.orders,
    pid: row.pid,
    health_score: intel.health_score,
  });
}

const DEFAULT_VISIBLE_TIERS: CatalogTier[] = [
  "ELITE",
  "PREMIUM",
  "STANDARD",
  "PENDING",
];

function hasWarehouseFilters(filters: CatalogFilterIndex): boolean {
  return Boolean(filters.usWarehouse || filters.euWarehouse || filters.ukWarehouse);
}

export async function getCatalogPage(
  params: CatalogListParams
): Promise<CatalogListResult> {
  return timedQuery("getCatalogPage", async () => {
    const db = getCatalogDB();
    const pageSize = Math.min(100, Math.max(1, params.pageSize));
    const page = Math.max(1, params.page);
    const sortKey = params.sort ?? "curated";
    const filters: CatalogFilterIndex = params.filters ?? {};
    let tiers = params.tiers?.length ? params.tiers : DEFAULT_VISIBLE_TIERS;
    if (filters.isHidden && !tiers.includes("HIDDEN")) {
      tiers = [...tiers, "HIDDEN"];
    }
    const cursor = parseCursor(params.cursor);

    let pidFilter: string[] | null = null;

    if (filters.publishQueueStatus) {
      pidFilter = await getAutoPublishQueuePids(filters.publishQueueStatus);
      if (pidFilter.length === 0) {
        return { products: [], total: 0, nextCursor: null };
      }
    }

    if (hasWarehouseFilters(filters)) {
      const warehousePids = await getWarehouseFilterPids(filters);
      if (warehousePids.length === 0) {
        return { products: [], total: 0, nextCursor: null };
      }
      pidFilter = pidFilter
        ? pidFilter.filter((p) => warehousePids.includes(p))
        : warehousePids;
      if (pidFilter.length === 0) {
        return { products: [], total: 0, nextCursor: null };
      }
    }

    if (params.search?.trim()) {
      const term = params.search.trim();
      const indexPids = await searchIndexPids(term, 1000);
      const searchPids =
        indexPids.length > 0 ? indexPids : await getRawSearchPids(term, 1000);
      if (searchPids.length === 0) {
        return { products: [], total: 0, nextCursor: null };
      }
      pidFilter = pidFilter
        ? pidFilter.filter((p) => searchPids.includes(p))
        : searchPids;
      if (pidFilter.length === 0) {
        return { products: [], total: 0, nextCursor: null };
      }
    }

    let intelQuery = db.from("cj_product_intelligence").select("*", {
      count: page === 1 && !cursor ? "exact" : undefined,
    });

    intelQuery = intelQuery.in("catalog_tier", tiers);
    intelQuery = applyIntelFiltersStandalone(intelQuery, filters);

    if (pidFilter) {
      intelQuery = intelQuery.in("pid", pidFilter.slice(0, 5000));
    }

    if (cursor) {
      intelQuery = intelQuery.or(
        `health_score.lt.${cursor.health_score ?? 0},and(health_score.eq.${cursor.health_score ?? 0},pid.lt.${cursor.pid})`
      );
    }

    switch (sortKey) {
      case "health":
      case "curated":
        intelQuery = intelQuery
          .order("health_score", { ascending: false })
          .order("pid", { ascending: false });
        break;
      case "margin":
        intelQuery = intelQuery
          .order("margin_percent", { ascending: false, nullsFirst: false })
          .order("pid", { ascending: false });
        break;
      case "newest":
        intelQuery = intelQuery
          .order("created_at", { ascending: false })
          .order("pid", { ascending: false });
        break;
      default:
        intelQuery = intelQuery.order("pid", { ascending: false });
        break;
    }

    if (cursor) {
      intelQuery = intelQuery.limit(pageSize);
    } else {
      const from = (page - 1) * pageSize;
      intelQuery = intelQuery.range(from, from + pageSize - 1);
    }

    const { data: intelRows, count, error } = await intelQuery;
    if (error) throw new Error(error.message);

    const intelList = (intelRows ?? []) as CjProductIntelligenceRow[];
    if (intelList.length === 0) {
      return { products: [], total: count ?? 0, nextCursor: null };
    }

    const pids = intelList.map((r) => r.pid);
    const { data: rawRows, error: rawError } = await db
      .from("cj_raw_products")
      .select("*")
      .in("pid", pids);

    if (rawError) throw new Error(rawError.message);

    const rawMap = new Map(
      (rawRows ?? []).map((r) => [r.pid as string, r as CjRawProductRow])
    );
    const intelMap = new Map(intelList.map((r) => [r.pid, r]));

    const products = pids
      .map((pid) => {
        const raw = rawMap.get(pid);
        if (!raw) return null;
        return {
          ...raw,
          intelligence: intelMap.get(pid) ?? makePendingIntelligence(pid),
        };
      })
      .filter(Boolean) as Array<CjRawProductRow & { intelligence: CjProductIntelligenceRow }>;

    const last = products[products.length - 1];
    const nextCursor =
      products.length === pageSize && last
        ? encodeCursor(last, last.intelligence)
        : null;

    return {
      products,
      total: count ?? -1,
      nextCursor,
    };
  });
}

export async function getRawCatalogTotal(): Promise<number> {
  const db = getCatalogDB();
  const { count, error } = await db
    .from("cj_raw_products")
    .select("pid", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getIntelligenceTotal(): Promise<number> {
  const db = getCatalogDB();
  const { count, error } = await db
    .from("cj_product_intelligence")
    .select("pid", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Skip full-table scan when every raw product already has intelligence. */
export async function ensureIntelligenceBackfill(): Promise<void> {
  const [rawTotal, intelTotal] = await Promise.all([
    getRawCatalogTotal(),
    getIntelligenceTotal(),
  ]);
  if (rawTotal > intelTotal) {
    await backfillIntelligenceFromRaw();
  }
}

export async function updateIntelligence(
  pid: string,
  patch: Partial<CjProductIntelligenceRow>
): Promise<void> {
  const db = getCatalogDB();
  const { error } = await db
    .from("cj_product_intelligence")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("pid", pid);
  if (error) throw new Error(error.message);
}

export async function startSyncRun(jobType: string): Promise<string | null> {
  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_catalog_sync_runs")
    .insert({ job_type: jobType, status: "running" })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("schema cache") || error.message.includes("does not exist")) {
      return null;
    }
    throw new Error(error.message);
  }
  return data.id as string;
}

export async function finishSyncRun(
  id: string | null,
  result: {
    status: "success" | "partial" | "failed";
    total_fetched?: number;
    total_saved?: number;
    total_errors?: number;
    error_message?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  if (!id) return;
  const db = getCatalogDB();
  await db
    .from("cj_catalog_sync_runs")
    .update({
      ...result,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function getLastListSyncAt(): Promise<string | null> {
  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_catalog_sync_runs")
    .select("finished_at")
    .eq("job_type", "list_sync")
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.finished_at ?? null;
}

export async function getLastEnrichmentAt(): Promise<string | null> {
  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_catalog_sync_runs")
    .select("finished_at")
    .eq("job_type", "enrichment")
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.finished_at ?? null;
}

export async function pollEnrichmentJobs(limit = 15) {
  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_enrichment_queue")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("next_attempt_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markQueueJob(
  pid: string,
  patch: Record<string, unknown>
): Promise<void> {
  const db = getCatalogDB();
  await db.from("cj_enrichment_queue").update(patch).eq("pid", pid);
}

export async function getRawProduct(pid: string): Promise<CjRawProductRow | null> {
  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_raw_products")
    .select("*")
    .eq("pid", pid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as CjRawProductRow | null;
}

export interface CatalogMonitoring {
  tierCounts: Record<CatalogTier, number>;
  rawTotal: number;
  queuePending: number;
  queueFailed: number;
  queueDeadLetter: number;
  avgHealthScore: number;
  lastSyncAt: string | null;
  lastEnrichmentAt: string | null;
  schemaReady: boolean;
  missingTables: string[];
}

export async function getCatalogMonitoring(): Promise<CatalogMonitoring> {
  const cached = getCached<CatalogMonitoring>("catalog-monitoring");
  if (cached) return cached;

  const result = await timedQuery("getCatalogMonitoring", async () => {
    const { getSchemaHealth } = await import("./schema-health");
    const health = await getSchemaHealth();

    if (!health.ready) {
      return {
        tierCounts: { ELITE: 0, PREMIUM: 0, STANDARD: 0, PENDING: 0, HIDDEN: 0 },
        rawTotal: 0,
        queuePending: 0,
        queueFailed: 0,
        queueDeadLetter: 0,
        avgHealthScore: 0,
        lastSyncAt: null,
        lastEnrichmentAt: null,
        schemaReady: false,
        missingTables: health.missingTables,
      };
    }

    const db = getCatalogDB();
    const [tierCounts, rawTotal, lastSyncAt, lastEnrichmentAt] = await Promise.all([
      getTierCounts(),
      getRawCatalogTotal(),
      getLastListSyncAt(),
      getLastEnrichmentAt(),
    ]);

    const countQueue = async (status: string) => {
      const { count } = await db
        .from("cj_enrichment_queue")
        .select("pid", { count: "exact", head: true })
        .eq("status", status);
      return count ?? 0;
    };

    const [queuePending, queueFailed, queueDeadLetter] = await Promise.all([
      countQueue("pending"),
      countQueue("failed"),
      countQueue("dead_letter"),
    ]);

    const { data: healthRows } = await db
      .from("cj_product_intelligence")
      .select("health_score")
      .eq("enrichment_status", "complete")
      .limit(5000);

    const scores = (healthRows ?? []).map((r) => Number(r.health_score) || 0);
    const avgHealthScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    return {
      tierCounts,
      rawTotal,
      queuePending,
      queueFailed,
      queueDeadLetter,
      avgHealthScore,
      lastSyncAt,
      lastEnrichmentAt,
      schemaReady: true,
      missingTables: [],
    };
  });

  setCached("catalog-monitoring", result, 45_000);
  return result;
}

export async function retryFailedEnrichments(limit = 50): Promise<number> {
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_enrichment_queue")
    .select("pid")
    .eq("status", "failed")
    .limit(limit);

  if (!data?.length) return 0;

  const now = new Date().toISOString();
  for (const row of data) {
    await markQueueJob(row.pid as string, {
      status: "pending",
      next_attempt_at: now,
      last_error: null,
    });
    await updateIntelligence(row.pid as string, {
      enrichment_status: "pending",
    });
  }
  return data.length;
}

export { MAX_ENRICHMENT_ATTEMPTS };

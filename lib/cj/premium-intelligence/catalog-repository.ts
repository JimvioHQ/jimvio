import { getCached, setCached } from "./catalog-cache";
import { timedQuery } from "./query-timing";
import { getCatalogDB } from "./db";
import {
  applyGlobalSearch,
  applyIntelFiltersToQuery,
  applyRawFiltersToQuery,
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
    auto_publish_status: "REQUIREMENTS_MISSING",
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

/** Enqueue all products not complete/dead_letter in intelligence table. */
export async function enqueueMissingEnrichment(): Promise<number> {
  const db = getCatalogDB();
  let enqueued = 0;
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await db
      .from("cj_product_intelligence")
      .select("pid")
      .in("enrichment_status", ["pending", "failed"])
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

export async function getCatalogPage(
  params: CatalogListParams
): Promise<CatalogListResult> {
  return timedQuery("getCatalogPage", async () => {
    const db = getCatalogDB();
    const pageSize = Math.min(100, Math.max(1, params.pageSize));
    const page = Math.max(1, params.page);
    const tiers = params.tiers?.length ? params.tiers : DEFAULT_VISIBLE_TIERS;
    const cursor = parseCursor(params.cursor);
    const sortKey = params.sort ?? "curated";
    const filters: CatalogFilterIndex = params.filters ?? {};

    let query = db
      .from("cj_raw_products")
      .select("*, cj_product_intelligence!inner(*)", {
        count: page === 1 && !cursor ? "exact" : undefined,
      });

    if (params.search?.trim()) {
      const term = params.search.trim();
      const indexPids = await searchIndexPids(term, 1000);
      if (indexPids.length > 0) {
        query = query.in("pid", indexPids);
      } else {
        query = applyGlobalSearch(query, term);
      }
    }

    query = query.in("cj_product_intelligence.catalog_tier", tiers);
    query = applyIntelFiltersToQuery(query, filters);
    query = applyRawFiltersToQuery(query, filters);

    if (cursor) {
      query = query.or(
        `orders.lt.${cursor.orders},and(orders.eq.${cursor.orders},pid.lt.${cursor.pid})`
      );
    }

    switch (sortKey) {
      case "health":
      case "curated":
        query = query
          .order("health_score", {
            ascending: false,
            foreignTable: "cj_product_intelligence",
          })
          .order("pid", { ascending: false });
        break;
      case "margin":
        query = query
          .order("margin_percent", {
            ascending: false,
            nullsFirst: false,
            foreignTable: "cj_product_intelligence",
          })
          .order("pid", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false }).order("pid", {
          ascending: false,
        });
        break;
      default:
        query = query.order("orders", { ascending: false }).order("pid", {
          ascending: false,
        });
    }

    if (cursor) {
      query = query.limit(pageSize);
    } else {
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const products = (data ?? []).map((row: Record<string, unknown>) => {
      const raw = row as unknown as CjRawProductRow;
      const intelJoin = row.cj_product_intelligence;
      const intel = Array.isArray(intelJoin) ? intelJoin[0] : intelJoin;
      return {
        ...raw,
        intelligence:
          (intel as CjProductIntelligenceRow | null) ??
          makePendingIntelligence(raw.pid),
      };
    });

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

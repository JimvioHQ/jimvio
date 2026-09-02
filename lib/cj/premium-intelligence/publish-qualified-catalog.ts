/**
 * Select qualified CJ catalog products and publish them through the existing
 * import + system-publish pipeline. Does not replace auto-publish scoring.
 */

import { getServiceClient } from "@/lib/cj/client";
import { ensureCjProductImported } from "./system-import";
import { publishProductSystem } from "./system-publish";
import { updateIntelligence } from "./catalog-repository";
import type { CatalogTier } from "./types";

export const QUALIFIED_PUBLISH_TARGET = 1000;
export const QUALIFIED_PUBLISH_BATCH_SIZE = 100;
export const QUALIFIED_VIDEO_TARGET = 400;

type CandidateRow = {
  pid: string;
  has_video: boolean | null;
  supplier_verified: boolean | null;
  verified_warehouse: number | null;
  trending: boolean | null;
  image_count: number | null;
  description_length: number | null;
  supplier_reputation_score: number | null;
  linked_product_id: string | null;
  catalog_tier: string | null;
  stock: number | null;
  sell_price: number | null;
  orders: number | null;
  title: string | null;
  image: string | null;
  sku: string | null;
  category_name: string | null;
};

export interface QualifiedPublishStats {
  evaluated: number;
  selected: number;
  processed: number;
  imported: number;
  published: number;
  skipped: number;
  duplicates: number;
  failed: number;
  withVideo: number;
  verifiedSuppliers: number;
  trending: number;
  inStock: number;
  failures: Array<{ pid: string; error: string }>;
}

export interface QualifiedPublishOptions {
  target?: number;
  batchSize?: number;
  dryRun?: boolean;
  onBatch?: (stats: QualifiedPublishStats, batchIndex: number) => void;
}

const FAMILY_CAPS: Record<string, number> = {
  fashion: 180,
  accessories: 140,
  home: 140,
  kitchen: 80,
  electronics: 80,
  "phone-accessories": 70,
  beauty: 80,
  fitness: 70,
  outdoor: 70,
  kids: 80,
  pet: 40,
  automotive: 50,
  gadgets: 70,
  lifestyle: 80,
};

function httpImage(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith("http");
}

export function categoryFamily(raw: string | null | undefined): string {
  const s = (raw ?? "").toLowerCase();
  if (/phone|mobile/.test(s) && /accessor/.test(s)) return "phone-accessories";
  if (/consumer electronic|gadget|computer|laptop|electronic/.test(s)) {
    return /phone|mobile/.test(s) ? "electronics" : "gadgets";
  }
  if (/phone|mobile/.test(s)) return "electronics";
  if (/beauty|hair|health|cosmetic|skin/.test(s)) return "beauty";
  if (/kitchen|cook|dining/.test(s)) return "kitchen";
  if (/home|garden|furniture|office storage|improvement/.test(s)) return "home";
  if (/fitness|gym|yoga/.test(s)) return "fitness";
  if (/sport|outdoor/.test(s)) return "outdoor";
  if (/pet/.test(s)) return "pet";
  if (/kid|baby|toy/.test(s)) return "kids";
  if (/auto|motor|car\b/.test(s)) return "automotive";
  if (/women|men|clothing|fashion|apparel|dress|shirt|jean/.test(s)) return "fashion";
  if (/bag|shoe|jewel|watch|accessor/.test(s)) return "accessories";
  return "lifestyle";
}

function emptyStats(): QualifiedPublishStats {
  return {
    evaluated: 0,
    selected: 0,
    processed: 0,
    imported: 0,
    published: 0,
    skipped: 0,
    duplicates: 0,
    failed: 0,
    withVideo: 0,
    verifiedSuppliers: 0,
    trending: 0,
    inStock: 0,
    failures: [],
  };
}

function isVerified(row: CandidateRow): boolean {
  return (
    row.supplier_verified === true ||
    row.verified_warehouse === 1 ||
    Number(row.supplier_reputation_score ?? 0) >= 75
  );
}

function isTrending(row: CandidateRow): boolean {
  return row.trending === true || Number(row.orders ?? 0) >= 50;
}

function diversifyCandidates(
  rows: CandidateRow[],
  target: number
): CandidateRow[] {
  const byFamily = new Map<string, CandidateRow[]>();
  for (const row of rows) {
    const family = categoryFamily(row.category_name);
    const list = byFamily.get(family) ?? [];
    list.push(row);
    byFamily.set(family, list);
  }
  for (const list of byFamily.values()) {
    list.sort((a, b) => {
      const videoDelta = Number(Boolean(b.has_video)) - Number(Boolean(a.has_video));
      if (videoDelta !== 0) return videoDelta;
      const verifiedDelta = Number(isVerified(b)) - Number(isVerified(a));
      if (verifiedDelta !== 0) return verifiedDelta;
      return Number(b.orders ?? 0) - Number(a.orders ?? 0);
    });
  }

  const selected: CandidateRow[] = [];
  const counts = new Map<string, number>();
  const seen = new Set<string>();

  const takeNext = (): boolean => {
    let progressed = false;
    for (const [family, list] of byFamily) {
      if (selected.length >= target) return false;
      const used = counts.get(family) ?? 0;
      const cap = FAMILY_CAPS[family] ?? 80;
      if (used >= cap) continue;
      const next = list.shift();
      if (!next || seen.has(next.pid)) continue;
      seen.add(next.pid);
      selected.push(next);
      counts.set(family, used + 1);
      progressed = true;
    }
    return progressed;
  };

  while (selected.length < target && takeNext()) {
    /* round-robin until caps or pool exhausted */
  }

  if (selected.length < target) {
    for (const row of rows) {
      if (selected.length >= target) break;
      if (seen.has(row.pid)) continue;
      seen.add(row.pid);
      selected.push(row);
    }
  }

  return selected;
}

type IntelRow = {
  pid: string;
  has_video: boolean | null;
  supplier_verified: boolean | null;
  verified_warehouse: number | null;
  trending: boolean | null;
  image_count: number | null;
  description_length: number | null;
  supplier_reputation_score: number | null;
  linked_product_id: string | null;
  catalog_tier: string | null;
};

async function fetchIntelligenceByFilter(
  filter: "video" | "trending" | "verified" | "warehouse",
  maxRows: number
): Promise<IntelRow[]> {
  const db = getServiceClient();
  const selectCols =
    "pid, has_video, supplier_verified, verified_warehouse, trending, image_count, description_length, supplier_reputation_score, linked_product_id, catalog_tier";
  const pageSize = 1000;
  const rows: IntelRow[] = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize - 1, maxRows - 1);
    let query = db
      .from("cj_product_intelligence")
      .select(selectCols)
      .neq("catalog_tier", "HIDDEN")
      .or("duplicate_blocked.is.null,duplicate_blocked.eq.false");

    if (filter === "video") query = query.eq("has_video", true);
    if (filter === "trending") query = query.eq("trending", true);
    if (filter === "verified") query = query.eq("supplier_verified", true);
    if (filter === "warehouse") query = query.eq("verified_warehouse", 1);

    const { data, error } = await query.range(from, to);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as IntelRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function fetchIntelligencePage(limit: number): Promise<IntelRow[]> {
  const [videoRows, trendingRows, verifiedRows, warehouseRows] = await Promise.all([
    fetchIntelligenceByFilter("video", Math.min(500, limit)),
    fetchIntelligenceByFilter("trending", limit),
    fetchIntelligenceByFilter("verified", limit),
    fetchIntelligenceByFilter("warehouse", limit),
  ]);

  const byPid = new Map<string, IntelRow>();
  for (const row of [...videoRows, ...trendingRows, ...verifiedRows, ...warehouseRows]) {
    if (row.pid) byPid.set(row.pid, row);
  }
  return [...byPid.values()];
}

async function fetchRawByPids(pids: string[]): Promise<Map<string, Record<string, unknown>>> {
  const db = getServiceClient();
  const byPid = new Map<string, Record<string, unknown>>();
  const CHUNK = 200;
  for (let i = 0; i < pids.length; i += CHUNK) {
    const slice = pids.slice(i, i + CHUNK);
    const { data, error } = await db
      .from("cj_raw_products")
      .select("pid, stock, sell_price, orders, title, image, sku, raw_payload")
      .in("pid", slice);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      byPid.set(row.pid as string, row as Record<string, unknown>);
    }
  }
  return byPid;
}

async function fetchCandidatePool(limit = 4000): Promise<CandidateRow[]> {
  const intelRows = await fetchIntelligencePage(limit);
  const rawByPid = await fetchRawByPids(intelRows.map((row) => row.pid));

  const mapped: CandidateRow[] = [];
  for (const row of intelRows) {
    const rawRow = rawByPid.get(row.pid);
    if (!rawRow) continue;
    const payload = (rawRow.raw_payload as Record<string, unknown> | null) ?? {};
    const categoryName =
      (typeof payload.categoryName === "string" && payload.categoryName) ||
      (typeof payload.threeCategoryName === "string" && payload.threeCategoryName) ||
      (typeof payload.twoCategoryName === "string" && payload.twoCategoryName) ||
      "";

    mapped.push({
      pid: row.pid,
      has_video: row.has_video,
      supplier_verified: row.supplier_verified,
      verified_warehouse: row.verified_warehouse,
      trending: row.trending,
      image_count: row.image_count,
      description_length: row.description_length,
      supplier_reputation_score: row.supplier_reputation_score,
      linked_product_id: row.linked_product_id,
      catalog_tier: row.catalog_tier,
      stock: Number(rawRow.stock ?? 0),
      sell_price: Number(rawRow.sell_price ?? 0),
      orders: Number(rawRow.orders ?? 0),
      title: typeof rawRow.title === "string" ? rawRow.title : null,
      image: typeof rawRow.image === "string" ? rawRow.image : null,
      sku: typeof rawRow.sku === "string" ? rawRow.sku : null,
      category_name: categoryName,
    });
  }

  return mapped.filter((row) => {
    if (!row.pid || !row.title?.trim()) return false;
    if (Number(row.stock) <= 0 || Number(row.sell_price) <= 0) return false;
    const goodImages = Number(row.image_count ?? 0) >= 3 || httpImage(row.image);
    if (!goodImages) return false;
    if (!isVerified(row)) return false;
    if (!isTrending(row) && row.has_video !== true) return false;
    return true;
  });
}

function hasPublishableImages(images: unknown): boolean {
  return (
    Array.isArray(images) &&
    images.some((url) => typeof url === "string" && url.startsWith("http"))
  );
}

async function productHasStoredVideo(productId: string): Promise<boolean> {
  const db = getServiceClient();
  const { count } = await db
    .from("product_videos")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  return (count ?? 0) > 0;
}

async function importAndPublishPid(
  pid: string,
  stats: QualifiedPublishStats,
  candidate: CandidateRow
): Promise<void> {
  const supabase = getServiceClient();

  const { data: mapped } = await supabase
    .from("cj_product_map")
    .select("product_id")
    .eq("cj_pid", pid)
    .maybeSingle();

  let productId = (mapped?.product_id as string | undefined) ?? candidate.linked_product_id ?? null;

  if (productId) {
    const { data: existing } = await supabase
      .from("products")
      .select("id, status, is_active, images, inventory_quantity, vendor_id, deleted_at")
      .eq("id", productId)
      .maybeSingle();

    if (existing?.id && !existing.deleted_at) {
      if (existing.status === "active" && existing.is_active) {
        stats.duplicates += 1;
        stats.skipped += 1;
        if (await productHasStoredVideo(existing.id)) stats.withVideo += 1;
        if (isVerified(candidate)) stats.verifiedSuppliers += 1;
        if (isTrending(candidate)) stats.trending += 1;
        if (Number(existing.inventory_quantity ?? 0) > 0 || Number(candidate.stock ?? 0) > 0) {
          stats.inStock += 1;
        }
        return;
      }
    }
  }

  const importedId = await ensureCjProductImported(pid, {
    fetchDetail: false,
  });
  if (!importedId) {
    stats.failed += 1;
    stats.failures.push({ pid, error: "Import returned no product id" });
    return;
  }
  productId = importedId;
  stats.imported += 1;

  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("id, status, is_active, images, inventory_quantity, vendor_id, price, description, deleted_at")
    .eq("id", productId)
    .maybeSingle();

  if (fetchErr || !product || product.deleted_at) {
    stats.failed += 1;
    stats.failures.push({
      pid,
      error: fetchErr?.message ?? "Imported product not found",
    });
    return;
  }

  if (!hasPublishableImages(product.images)) {
    stats.skipped += 1;
    return;
  }

  if (Number(product.price ?? 0) <= 0) {
    stats.skipped += 1;
    return;
  }

  if (Number(product.inventory_quantity ?? 0) <= 0 && Number(candidate.stock ?? 0) > 0) {
    await supabase
      .from("products")
      .update({
        inventory_quantity: Number(candidate.stock),
        track_inventory: true,
      })
      .eq("id", productId);
  }

  const published = await publishProductSystem(productId);
  if (!published.success) {
    stats.failed += 1;
    stats.failures.push({ pid, error: published.error ?? "Publish failed" });
    return;
  }

  stats.published += 1;
  if (isVerified(candidate)) stats.verifiedSuppliers += 1;
  if (isTrending(candidate)) stats.trending += 1;
  stats.inStock += 1;
  if (await productHasStoredVideo(productId)) {
    stats.withVideo += 1;
  }

  const nextTier: CatalogTier =
    candidate.catalog_tier === "ELITE" || candidate.catalog_tier === "PREMIUM"
      ? candidate.catalog_tier
      : "STANDARD";

  await updateIntelligence(pid, {
    linked_product_id: productId,
    is_published_active: true,
    catalog_tier: nextTier,
    auto_publish_status: "READY",
    auto_publish_ready: true,
  });
}

export async function publishQualifiedCjCatalog(
  options: QualifiedPublishOptions = {}
): Promise<QualifiedPublishStats> {
  const target = options.target ?? QUALIFIED_PUBLISH_TARGET;
  const batchSize = options.batchSize ?? QUALIFIED_PUBLISH_BATCH_SIZE;
  const stats = emptyStats();

  const pool = await fetchCandidatePool(Math.max(4000, target * 4));
  stats.evaluated = pool.length;

  const selected = diversifyCandidates(pool, target);
  stats.selected = selected.length;

  if (options.dryRun) {
    stats.withVideo = selected.filter((row) => row.has_video).length;
    stats.verifiedSuppliers = selected.filter(isVerified).length;
    stats.trending = selected.filter(isTrending).length;
    stats.inStock = selected.filter((row) => Number(row.stock) > 0).length;
    return stats;
  }

  let batchIndex = 0;
  for (let i = 0; i < selected.length; i += batchSize) {
    const batch = selected.slice(i, i + batchSize);
    batchIndex += 1;
    for (const row of batch) {
      stats.processed += 1;
      try {
        await importAndPublishPid(row.pid, stats, row);
      } catch (err) {
        stats.failed += 1;
        stats.failures.push({
          pid: row.pid,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    options.onBatch?.(stats, batchIndex);
  }

  return stats;
}

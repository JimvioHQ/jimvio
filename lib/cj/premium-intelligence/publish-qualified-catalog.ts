import { isPermanentUnpublishReason } from "@/lib/cj/import-intelligence/progressive-publish";
/**
 * Select qualified CJ catalog products and publish them through the existing
 * import + system-publish pipeline. Does not replace auto-publish scoring.
 */

import { getCJToken, getServiceClient } from "@/lib/cj/client";
import { ensureCjProductImported } from "./system-import";
import { publishProductSystem } from "./system-publish";
import { updateIntelligence } from "./catalog-repository";
import type { CatalogTier } from "./types";
import { catalogVariantRecords } from "@/lib/cj/catalog-variants";
import { normalizeCjVid } from "@/lib/cj/variant-vid";
import {
  extractVideosFromHtml,
  mergeProductVideoUrls,
  normalizeCjVideoUrls,
} from "@/lib/cj/product-videos";
import { fetchCjProductVideoUrls } from "@/lib/cj/fetch-product-videos";
import { syncProductVideos } from "@/lib/product-videos";
import { classifyTrend } from "@/lib/cj/trend-classification";

export const QUALIFIED_PUBLISH_TARGET = 1000;
export const QUALIFIED_PUBLISH_BATCH_SIZE = 100;
export const QUALIFIED_VIDEO_TARGET = 400;
export const CURATED_PUBLISH_TARGET = 300;
export const CURATED_VIDEO_TARGET = 150;

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
  has_catalog_vid: boolean;
  payload_videos: string[];
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
  publishedVideo: number;
  publishedNoVideo: number;
  failures: Array<{ pid: string; error: string }>;
}

export interface QualifiedPublishOptions {
  target?: number;
  batchSize?: number;
  dryRun?: boolean;
  additionalOnly?: boolean;
  videoTarget?: number;
  videoDiscoveryBudget?: number;
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
    publishedVideo: 0,
    publishedNoVideo: 0,
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
  return row.trending === true;
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
      const verifiedDelta = Number(isVerified(b)) - Number(isVerified(a));
      if (verifiedDelta !== 0) return verifiedDelta;
      const trendingDelta = Number(isTrending(b)) - Number(isTrending(a));
      if (trendingDelta !== 0) return trendingDelta;
      const videoDelta = Number(Boolean(b.has_video) || b.payload_videos.length > 0) - Number(Boolean(a.has_video) || a.payload_videos.length > 0);
      if (videoDelta !== 0) return videoDelta;
      const descDelta = Number(b.description_length ?? 0) - Number(a.description_length ?? 0);
      if (descDelta !== 0) return descDelta;
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
    fetchIntelligenceByFilter("video", Math.min(1500, limit)),
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

async function fetchMappedPids(): Promise<Set<string>> {
  const db = getServiceClient();
  const pids = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("cj_product_map")
      .select("cj_pid")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    for (const row of page) {
      if (typeof row.cj_pid === "string" && row.cj_pid) pids.add(row.cj_pid);
    }
    if (page.length < pageSize) break;
  }
  return pids;
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

async function fetchCandidatePool(
  limit = 4000,
  options: { excludeMapped?: boolean } = {}
): Promise<CandidateRow[]> {
  const intelRows = await fetchIntelligencePage(limit);
  const mappedPids = options.excludeMapped ? await fetchMappedPids() : new Set<string>();
  const unmappedIntel = options.excludeMapped
    ? intelRows.filter((row) => !mappedPids.has(row.pid) && !row.linked_product_id)
    : intelRows;
  const rawByPid = await fetchRawByPids(unmappedIntel.map((row) => row.pid));

  const mapped: CandidateRow[] = [];
  for (const row of unmappedIntel) {
    const rawRow = rawByPid.get(row.pid);
    if (!rawRow) continue;
    const payload = (rawRow.raw_payload as Record<string, unknown> | null) ?? {};
    const categoryName =
      (typeof payload.categoryName === "string" && payload.categoryName) ||
      (typeof payload.threeCategoryName === "string" && payload.threeCategoryName) ||
      (typeof payload.twoCategoryName === "string" && payload.twoCategoryName) ||
      "";
    const payloadVideos = mergeProductVideoUrls(
      normalizeCjVideoUrls(payload.productVideo),
      normalizeCjVideoUrls(payload.videoList),
      normalizeCjVideoUrls(payload.videoUrl),
      typeof payload.description === "string" ? extractVideosFromHtml(payload.description) : [],
    );
    const hasCatalogVid = catalogVariantRecords(payload).some((variant) => Boolean(normalizeCjVid(variant.vid)));

    mapped.push({
      pid: row.pid,
      has_video: row.has_video === true || payloadVideos.length > 0,
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
      has_catalog_vid: hasCatalogVid,
      payload_videos: payloadVideos,
    });
  }

  return mapped.filter((row) => {
    if (!row.pid || !row.title?.trim()) return false;
    if (Number(row.stock) <= 0 || Number(row.sell_price) <= 0) return false;
    const goodImages = Number(row.image_count ?? 0) >= 3 || httpImage(row.image);
    if (!goodImages) return false;
    if (Number(row.description_length ?? 0) < 40) return false;
    const hasVideo = Boolean(row.has_video) || row.payload_videos.length > 0;
    if (!row.has_catalog_vid && !hasVideo) return false;
    if (hasVideo) return true;
    if (!isVerified(row)) return false;
    if (!isTrending(row)) return false;
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

async function persistCandidateVideos(
  productId: string,
  candidate: CandidateRow,
  fetchRemote: boolean
): Promise<boolean> {
  const supabase = getServiceClient();
  const urls = [...candidate.payload_videos];

  if (fetchRemote && urls.length === 0) {
    try {
      const token = await getCJToken(supabase);
      const { videos } = await fetchCjProductVideoUrls(token, candidate.pid, {
        productVideo: candidate.payload_videos,
        videoList: candidate.payload_videos,
      });
      urls.push(...videos);
    } catch (err) {
      console.warn(
        `[CJ publish] video lookup skipped for ${candidate.pid}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  const unique = mergeProductVideoUrls(urls);
  if (unique.length === 0) {
    return productHasStoredVideo(productId);
  }

  const result = await syncProductVideos(supabase, productId, unique);
  if (result.error) {
    console.warn(`[CJ publish] video sync failed for ${candidate.pid}:`, result.error);
    return productHasStoredVideo(productId);
  }
  return true;
}

async function mergeIntelligenceFlags(productId: string, candidate: CandidateRow): Promise<void> {
  const supabase = getServiceClient();
  const { data: product } = await supabase
    .from("products")
    .select("source_metadata")
    .eq("id", productId)
    .maybeSingle();
  const meta =
    product?.source_metadata && typeof product.source_metadata === "object" && !Array.isArray(product.source_metadata)
      ? { ...(product.source_metadata as Record<string, unknown>) }
      : {};
  if (candidate.supplier_verified === true) meta.cj_supplier_verified = true;
  if (candidate.verified_warehouse === 1) meta.cj_verified_warehouse = 1;
  const trend = classifyTrend({
    supplierTrendingFlag: candidate.trending === true,
    cjOrderCount: Number(candidate.orders ?? 0),
  });
  meta.trend_classification = trend.classification;
  meta.trend_evidence = trend.evidence;
  if (trend.verifiedTrending) meta.cj_trending = true;
  else delete meta.cj_trending;
  await supabase.from("products").update({ source_metadata: meta }).eq("id", productId);
}

async function importAndPublishPid(
  pid: string,
  stats: QualifiedPublishStats,
  candidate: CandidateRow,
  options: { requireVideo?: boolean; additionalOnly?: boolean; enforceVideoMix?: boolean } = {}
): Promise<"published" | "skipped" | "failed"> {
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
      .select("id, status, is_active, images, inventory_quantity, vendor_id, deleted_at, auto_unpublish_reason")
      .eq("id", productId)
      .maybeSingle();

    // Removed on purpose (owner curation, supplier removal, blacklist): never bring it back automatically.
    if (existing?.id && !existing.deleted_at && isPermanentUnpublishReason(existing.auto_unpublish_reason as string | null)) {
      stats.skipped += 1;
      return "skipped";
    }

    if (existing?.id && !existing.deleted_at) {
      if (existing.status === "active" && existing.is_active) {
        stats.duplicates += 1;
        stats.skipped += 1;
        if (!options.additionalOnly) {
          if (await productHasStoredVideo(existing.id)) stats.withVideo += 1;
          if (isVerified(candidate)) stats.verifiedSuppliers += 1;
          if (isTrending(candidate)) stats.trending += 1;
          if (Number(existing.inventory_quantity ?? 0) > 0 || Number(candidate.stock ?? 0) > 0) {
            stats.inStock += 1;
          }
        }
        return "skipped";
      }
    }
  }

  const importedId = await ensureCjProductImported(pid, {
    fetchDetail: false,
  });
  if (!importedId) {
    stats.failed += 1;
    stats.failures.push({ pid, error: "Import returned no product id" });
    return "failed";
  }
  productId = importedId;
  stats.imported += 1;

  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("id, status, is_active, images, inventory_quantity, vendor_id, price, description, deleted_at, source_metadata")
    .eq("id", productId)
    .maybeSingle();

  if (fetchErr || !product || product.deleted_at) {
    stats.failed += 1;
    stats.failures.push({
      pid,
      error: fetchErr?.message ?? "Imported product not found",
    });
    return "failed";
  }

  if (!hasPublishableImages(product.images)) {
    stats.skipped += 1;
    return "skipped";
  }

  if (Number(product.price ?? 0) <= 0) {
    stats.skipped += 1;
    return "skipped";
  }

  const { count: vidCount } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .not("cj_vid", "is", null);
  if ((vidCount ?? 0) <= 0) {
    stats.skipped += 1;
    return "skipped";
  }

  const descriptionText = typeof product.description === "string"
    ? product.description.replace(/<[^>]+>/g, " ").trim()
    : "";
  if (descriptionText.length < 40 && Number(candidate.description_length ?? 0) < 40) {
    stats.skipped += 1;
    return "skipped";
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

  const storedVideo = await persistCandidateVideos(productId, candidate, false);

  if (options.enforceVideoMix) {
    if (options.requireVideo && !storedVideo) {
      stats.skipped += 1;
      return "skipped";
    }
    if (!options.requireVideo && storedVideo) {
      stats.skipped += 1;
      return "skipped";
    }
  }

  await mergeIntelligenceFlags(productId, candidate);

  const published = await publishProductSystem(productId);
  if (!published.success) {
    stats.failed += 1;
    stats.failures.push({ pid, error: published.error ?? "Publish failed" });
    return "failed";
  }

  stats.published += 1;
  if (isVerified(candidate)) stats.verifiedSuppliers += 1;
  if (isTrending(candidate)) stats.trending += 1;
  stats.inStock += 1;
  if (storedVideo) {
    stats.withVideo += 1;
    stats.publishedVideo += 1;
  } else {
    stats.publishedNoVideo += 1;
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
    ...(storedVideo ? { has_video: true } : {}),
    ...(candidate.supplier_verified === true ? { supplier_verified: true } : {}),
    ...(candidate.trending === true ? { trending: true } : {}),
  });

  return "published";
}

async function discoverRemoteVideos(
  candidates: CandidateRow[],
  needed: number,
  budget: number,
  onProgress?: (found: number, scanned: number) => void
): Promise<CandidateRow[]> {
  if (needed <= 0 || budget <= 0) return [];
  const supabase = getServiceClient();
  const token = await getCJToken(supabase);
  const found: CandidateRow[] = [];
  let scanned = 0;

  for (const row of candidates) {
    if (found.length >= needed || scanned >= budget) break;
    scanned += 1;
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const { videos } = await fetchCjProductVideoUrls(token, row.pid);
      if (videos.length === 0) continue;
      found.push({
        ...row,
        has_video: true,
        payload_videos: mergeProductVideoUrls(row.payload_videos, videos),
      });
      onProgress?.(found.length, scanned);
    } catch {
      /* keep scanning; do not invent videos */
    }
  }

  return found;
}

export async function publishQualifiedCjCatalog(
  options: QualifiedPublishOptions = {}
): Promise<QualifiedPublishStats> {
  const target = options.target ?? QUALIFIED_PUBLISH_TARGET;
  const videoTarget = options.videoTarget;
  const noVideoTarget = videoTarget != null ? Math.max(0, target - videoTarget) : null;
  const batchSize = options.batchSize ?? QUALIFIED_PUBLISH_BATCH_SIZE;
  const additionalOnly = options.additionalOnly === true;
  const stats = emptyStats();

  const pool = await fetchCandidatePool(Math.max(4000, target * 6), {
    excludeMapped: additionalOnly,
  });
  stats.evaluated = pool.length;

  const videoPool = pool.filter((row) => row.has_video || row.payload_videos.length > 0);
  const noVideoPool = pool.filter((row) => !row.has_video && row.payload_videos.length === 0);

  const selectedVideo = videoTarget != null
    ? diversifyCandidates(videoPool, Math.max(videoTarget * 3, videoTarget))
    : [];
  const selectedNoVideo = noVideoTarget != null
    ? diversifyCandidates(noVideoPool, Math.max(noVideoTarget * 3, noVideoTarget))
    : diversifyCandidates(pool, target * 3);
  const selected = videoTarget != null ? [...selectedVideo, ...selectedNoVideo] : selectedNoVideo;
  stats.selected = selected.length;

  if (options.dryRun) {
    stats.withVideo = (videoTarget != null ? selectedVideo : selected).filter(
      (row) => row.has_video || row.payload_videos.length > 0
    ).length;
    stats.publishedVideo = Math.min(videoTarget ?? stats.withVideo, stats.withVideo);
    stats.publishedNoVideo = videoTarget != null
      ? Math.min(noVideoTarget ?? 0, selectedNoVideo.length)
      : selected.length - stats.publishedVideo;
    stats.verifiedSuppliers = selected.filter(isVerified).length;
    stats.trending = selected.filter(isTrending).length;
    stats.inStock = selected.filter((row) => Number(row.stock) > 0).length;
    return stats;
  }

  const publishBatch = async (
    rows: CandidateRow[],
    requireVideo: boolean,
    quota: number | null
  ) => {
    let batchIndex = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      if (quota != null) {
        const published = requireVideo ? stats.publishedVideo : stats.publishedNoVideo;
        if (published >= quota) break;
      }
      const batch = rows.slice(i, i + batchSize);
      batchIndex += 1;
      for (const row of batch) {
        if (quota != null) {
          const published = requireVideo ? stats.publishedVideo : stats.publishedNoVideo;
          if (published >= quota) break;
        }
        stats.processed += 1;
        try {
          await importAndPublishPid(row.pid, stats, row, {
            requireVideo,
            additionalOnly,
            enforceVideoMix: videoTarget != null,
          });
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
  };

  if (videoTarget != null) {
    await publishBatch(selectedVideo, true, videoTarget);

    if (stats.publishedVideo < videoTarget) {
      const discoverySource = noVideoPool.filter(
        (row) => isVerified(row) && isTrending(row) && !selectedVideo.some((v) => v.pid === row.pid)
      );
      const discovered = await discoverRemoteVideos(
        discoverySource,
        videoTarget - stats.publishedVideo,
        options.videoDiscoveryBudget ?? 200
      );
      await publishBatch(discovered, true, videoTarget);
    }

    await publishBatch(selectedNoVideo, false, noVideoTarget);
  } else {
    await publishBatch(selected, false, target);
  }

  return stats;
}


/* ------------------------------------------------------------------ */
/* Strategy import (2026–2030 categories): same gates as the qualified */
/* catalog publisher, fed by fresh CJ keyword searches.                */
/* ------------------------------------------------------------------ */

export type StrategyCandidateSignals = {
  trending: boolean;
  supplierVerified: boolean;
  verifiedWarehouse: number | null;
  imageCount: number;
  descriptionLength: number;
};

/** Candidate row built from a CJ list row, exactly like the catalog pool builds it. */
export function strategyCandidateFromRaw(
  rawRow: { pid: string; title: string | null; image: string | null; sku: string | null; stock: number; sell_price: number; orders: number; raw_payload: Record<string, unknown> },
  signals: StrategyCandidateSignals,
): CandidateRow {
  const payload = rawRow.raw_payload ?? {};
  const categoryName =
    (typeof payload.categoryName === "string" && payload.categoryName) ||
    (typeof payload.threeCategoryName === "string" && payload.threeCategoryName) ||
    (typeof payload.twoCategoryName === "string" && payload.twoCategoryName) ||
    "";
  const payloadVideos = mergeProductVideoUrls(
    normalizeCjVideoUrls(payload.productVideo),
    normalizeCjVideoUrls(payload.videoList),
    normalizeCjVideoUrls(payload.videoUrl),
    typeof payload.description === "string" ? extractVideosFromHtml(payload.description) : [],
  );
  return {
    pid: rawRow.pid,
    has_video: payloadVideos.length > 0,
    supplier_verified: signals.supplierVerified,
    verified_warehouse: signals.verifiedWarehouse,
    trending: signals.trending,
    image_count: signals.imageCount,
    description_length: signals.descriptionLength,
    supplier_reputation_score: null,
    linked_product_id: null,
    catalog_tier: null,
    stock: rawRow.stock,
    sell_price: rawRow.sell_price,
    orders: rawRow.orders,
    title: rawRow.title,
    image: rawRow.image,
    sku: rawRow.sku,
    category_name: categoryName,
    has_catalog_vid: catalogVariantRecords(payload).some((variant) => Boolean(normalizeCjVid(variant.vid))),
    payload_videos: payloadVideos,
  };
}

/** Adds genuine CJ videos (detail lookup) when the list row carried none. Never invents one. */
export async function withCjVideos(candidate: CandidateRow): Promise<CandidateRow> {
  if (candidate.payload_videos.length > 0) return candidate;
  try {
    const token = await getCJToken(getServiceClient());
    const { videos } = await fetchCjProductVideoUrls(token, candidate.pid);
    if (videos.length === 0) return candidate;
    return { ...candidate, has_video: true, payload_videos: mergeProductVideoUrls(candidate.payload_videos, videos) };
  } catch {
    return candidate;
  }
}

/** Imports (pricing formula, variants, stock) and publishes only if every Jimvio gate passes, video required. */
export async function importAndPublishStrategyCandidate(candidate: CandidateRow): Promise<{ outcome: "published" | "skipped" | "failed"; stats: QualifiedPublishStats }> {
  const stats = emptyStats();
  const outcome = await importAndPublishPid(candidate.pid, stats, candidate, {
    requireVideo: true,
    additionalOnly: true,
    enforceVideoMix: true,
  });
  return { outcome, stats };
}

export type { CandidateRow as StrategyCandidateRow };

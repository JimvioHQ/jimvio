/**
 * Global Search Index v5 — denormalized search for 500k+ CJ products.
 */

import { getCatalogDB } from "./db";

const INDEX_BATCH = 300;

export interface SearchIndexResult {
  indexed: number;
  remaining: boolean;
  lastPid: string;
}

async function schemaReady(): Promise<boolean> {
  try {
    const db = getCatalogDB();
    const { error } = await db.from("cj_product_search_index").select("pid").limit(1);
    return !error;
  } catch {
    return false;
  }
}

function buildSearchText(parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .slice(0, 8000);
}

function extractCategory(rawPayload: Record<string, unknown> | null): string {
  if (!rawPayload) return "";
  const names = [
    rawPayload.categoryName,
    rawPayload.threeCategoryName,
    rawPayload.categoryId,
  ];
  return names.filter((n) => typeof n === "string").join(" ");
}

function extractTags(rawPayload: Record<string, unknown> | null): string[] {
  if (!rawPayload) return [];
  const tags = rawPayload.productTags ?? rawPayload.tags;
  if (Array.isArray(tags)) {
    return tags.filter((t): t is string => typeof t === "string").slice(0, 20);
  }
  return [];
}

export async function indexProductSearchRow(
  pid: string,
  raw: {
    title?: string | null;
    sku?: string | null;
    supplier?: string | null;
    warehouse?: string | null;
    raw_payload?: Record<string, unknown> | null;
  },
  intel?: {
    linked_product_id?: string | null;
    description_length?: number;
  },
  descriptionSnippet?: string
): Promise<void> {
  if (!(await schemaReady())) return;

  const db = getCatalogDB();
  const category = extractCategory(raw.raw_payload ?? null);
  const tags = extractTags(raw.raw_payload ?? null);
  const snippet = (descriptionSnippet ?? "").slice(0, 500);

  const searchText = buildSearchText([
    pid,
    raw.title,
    raw.sku,
    raw.supplier,
    raw.warehouse,
    category,
    ...tags,
    snippet,
  ]);

  await db.from("cj_product_search_index").upsert(
    {
      pid,
      search_text: searchText,
      title: raw.title ?? null,
      sku: raw.sku ?? null,
      supplier: raw.supplier ?? null,
      warehouse: raw.warehouse ?? null,
      category: category || null,
      tags,
      description_snippet: snippet || null,
      linked_product_id: intel?.linked_product_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pid" }
  );
}

/** Index next batch of products (cursor by pid). */
export async function refreshSearchIndexBatch(
  afterPid = "",
  limit = INDEX_BATCH
): Promise<SearchIndexResult> {
  const empty: SearchIndexResult = { indexed: 0, remaining: false, lastPid: "" };
  if (!(await schemaReady())) return empty;

  const db = getCatalogDB();
  let query = db
    .from("cj_raw_products")
    .select("pid, title, sku, supplier, warehouse, raw_payload")
    .order("pid", { ascending: true })
    .limit(limit);

  if (afterPid) query = query.gt("pid", afterPid);

  const { data: rows } = await query;
  if (!rows?.length) return empty;

  const pids = rows.map((r) => r.pid as string);
  const { data: intelRows } = await db
    .from("cj_product_intelligence")
    .select("pid, linked_product_id, description_length")
    .in("pid", pids);

  const intelMap = new Map((intelRows ?? []).map((r) => [r.pid as string, r]));

  for (const raw of rows) {
    const pid = raw.pid as string;
    await indexProductSearchRow(pid, raw, intelMap.get(pid));
  }

  const lastPid = rows[rows.length - 1]!.pid as string;
  return {
    indexed: rows.length,
    remaining: rows.length >= limit,
    lastPid,
  };
}

/** Search PIDs from index. */
export async function searchIndexPids(query: string, limit = 500): Promise<string[]> {
  if (!(await schemaReady()) || !query.trim()) return [];

  const db = getCatalogDB();
  const pattern = `%${query.trim().replace(/[%_\\]/g, "\\$&")}%`;

  const { data } = await db
    .from("cj_product_search_index")
    .select("pid")
    .ilike("search_text", pattern)
    .order("pid")
    .limit(limit);

  return (data ?? []).map((r) => r.pid as string);
}

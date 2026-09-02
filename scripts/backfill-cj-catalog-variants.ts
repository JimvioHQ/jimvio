/**
 * Idempotent backfill: write product_variants from cj_raw_products.raw_payload.
 * Does not call live CJ /product/query (avoids 429s and real orders).
 *
 * Usage:
 *   npx tsx scripts/backfill-cj-catalog-variants.ts
 *   DRY_RUN=1 npx tsx scripts/backfill-cj-catalog-variants.ts
 *   BATCH=25 LIMIT=50 npx tsx scripts/backfill-cj-catalog-variants.ts
 */
import { config } from "dotenv";
import Module from "node:module";

const originalLoad = (Module as { _load: (...args: unknown[]) => unknown })._load;
(Module as { _load: (...args: unknown[]) => unknown })._load = function (
  request: unknown,
  parent: unknown,
  isMain: unknown,
) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

config({ path: ".env.local" });
config();

function payloadObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function main() {
  const includeExisting = process.env.ALL === "1";
  const dryRun = process.env.DRY_RUN === "1";
  const batchSize = Math.max(1, Number(process.env.BATCH ?? 25));
  const limit = Math.max(0, Number(process.env.LIMIT ?? 0));

  const { getServiceClient } = await import("../lib/cj/client");
  const { catalogVariantRecords } = await import("../lib/cj/catalog-variants");
  const { syncCjVariantsFromPayload } = await import("../lib/cj/sync-catalog-variants");

  const supabase = getServiceClient();

  const productsWithVariants = new Set<string>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data: withVariants, error: variantError } = await supabase
      .from("product_variants")
      .select("product_id")
      .range(offset, offset + pageSize - 1);
    if (variantError) throw variantError;
    for (const row of withVariants ?? []) {
      productsWithVariants.add(String(row.product_id));
    }
    if ((withVariants ?? []).length < pageSize) break;
  }

  const products: Array<{
    id: string;
    name: string;
    price: number | string | null;
    source: string | null;
    source_metadata: Record<string, unknown> | null;
    track_inventory: boolean | null;
    inventory_quantity: number | null;
  }> = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, source, source_metadata, track_inventory, inventory_quantity")
      .eq("source", "cj")
      .eq("status", "active")
      .is("deleted_at", null)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    products.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }

  const brokenOnly = process.env.BROKEN_ONLY === "1";
  const brokenProductIds = new Set<string>();
  if (brokenOnly) {
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("product_variants")
        .select("product_id, options")
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      for (const row of data ?? []) {
        const options = (row.options ?? {}) as Record<string, unknown>;
        if (options.variant_key === "[]" || options.Color === "[]" || options.color === "[]") {
          brokenProductIds.add(String(row.product_id));
        }
      }
      if ((data ?? []).length < pageSize) break;
    }
  }

  const missing: Array<{
    id: string;
    name: string;
    price: number | string | null;
    source: string | null;
    source_metadata: Record<string, unknown> | null;
    track_inventory: boolean | null;
    inventory_quantity: number | null;
    pid: string;
  }> = [];

  for (const product of products ?? []) {
    if (brokenOnly && !brokenProductIds.has(product.id)) continue;
    if (!includeExisting && productsWithVariants.has(product.id)) continue;
    const pid = String(
      (product.source_metadata as { cj_pid?: string } | null)?.cj_pid ?? "",
    ).trim();
    if (!pid) continue;
    missing.push({
      id: product.id,
      name: product.name,
      price: product.price,
      source: product.source,
      source_metadata: (product.source_metadata as Record<string, unknown> | null) ?? null,
      track_inventory: product.track_inventory,
      inventory_quantity: product.inventory_quantity,
      pid,
    });
    if (limit > 0 && missing.length >= limit) break;
  }

  console.log(
    dryRun ? "DRY RUN" : "BACKFILL",
    { missing: missing.length, batchSize, all: includeExisting },
  );

  let synced = 0;
  let skippedNoCatalog = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    const pids = batch.map((row) => row.pid);
    const { data: rawRows, error: rawError } = await supabase
      .from("cj_raw_products")
      .select("pid, sku, raw_payload")
      .in("pid", pids);
    if (rawError) throw rawError;

    const rawByPid = new Map(
      (rawRows ?? []).map((row) => [String(row.pid), row]),
    );

    for (const product of batch) {
      const raw = rawByPid.get(product.pid);
      const payload = payloadObject(raw?.raw_payload);
      const catalogVariants = catalogVariantRecords(payload);
      if (catalogVariants.length === 0) {
        skippedNoCatalog += 1;
        continue;
      }

      if (dryRun) {
        synced += catalogVariants.length;
        continue;
      }

      const result = await syncCjVariantsFromPayload(
        product.id,
        product.pid,
        payload,
        String(raw?.sku ?? product.pid),
      );
      if (result.error) {
        failed += 1;
        console.warn(`fail product=${product.id} pid=${product.pid}: ${result.error}`);
        continue;
      }
      synced += result.upserted;
    }

    console.log(`batch ${Math.floor(i / batchSize) + 1}`, {
      processed: Math.min(i + batchSize, missing.length),
      synced,
      skippedNoCatalog,
      failed,
    });
  }

  console.log("\n=== CJ catalog variant backfill ===");
  console.log(
    JSON.stringify(
      { missing: missing.length, synced, skippedNoCatalog, failed, dryRun },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

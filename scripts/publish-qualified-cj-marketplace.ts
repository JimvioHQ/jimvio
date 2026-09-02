/**
 * Publish ~1000 qualified real CJ catalog products to the Public Marketplace.
 * Usage: npx tsx scripts/publish-qualified-cj-marketplace.ts
 * Optional: TARGET=1000 BATCH=100 DRY_RUN=1
 */
import { config } from "dotenv";
import Module from "node:module";

const originalLoad = (Module as { _load: (...args: unknown[]) => unknown })._load;
(Module as { _load: (...args: unknown[]) => unknown })._load = function (
  request: unknown,
  parent: unknown,
  isMain: unknown
) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

config({ path: ".env.local" });
config();

async function main() {
  const target = Number(process.env.TARGET ?? 1000);
  const batchSize = Number(process.env.BATCH ?? 100);
  const dryRun = process.env.DRY_RUN === "1";

  const { getCJVendorId, getServiceClient } = await import("../lib/cj/client");
  const { publishQualifiedCjCatalog } = await import(
    "../lib/cj/premium-intelligence/publish-qualified-catalog"
  );

  const supabase = getServiceClient();
  const vendorId = await getCJVendorId(supabase);
  const { data: vendor, error } = await supabase
    .from("vendors")
    .select("id, business_name, business_slug")
    .eq("id", vendorId)
    .maybeSingle();

  if (error || !vendor?.id) {
    throw new Error(`Resolved CJ vendor ${vendorId} is not a vendors.id`);
  }

  console.log("CJ vendor:", vendor.business_name, vendor.id);
  console.log(dryRun ? "DRY RUN" : "PUBLISH", { target, batchSize });

  const stats = await publishQualifiedCjCatalog({
    target,
    batchSize,
    dryRun,
    onBatch: (current, batchIndex) => {
      console.log(`batch ${batchIndex}`, {
        processed: current.processed,
        imported: current.imported,
        published: current.published,
        skipped: current.skipped,
        duplicates: current.duplicates,
        failed: current.failed,
        withVideo: current.withVideo,
      });
    },
  });

  console.log("\n=== Qualified CJ marketplace publish ===");
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

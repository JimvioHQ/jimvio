/**
 * Publish 300 additional curated CJ products to the public Marketplace.
 * Target mix: 150 with a real stored video, 150 without.
 *
 * Usage: npx tsx scripts/publish-curated-cj-marketplace.ts
 * Optional: DRY_RUN=1 TARGET=300 VIDEO_TARGET=150 DISCOVERY=200
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
  const target = Number(process.env.TARGET ?? 300);
  const videoTarget = Number(process.env.VIDEO_TARGET ?? 150);
  const batchSize = Number(process.env.BATCH ?? 25);
  const discovery = Number(process.env.DISCOVERY ?? 200);
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
  console.log(dryRun ? "DRY RUN" : "PUBLISH", {
    target,
    videoTarget,
    noVideoTarget: target - videoTarget,
    batchSize,
    discovery,
  });

  const stats = await publishQualifiedCjCatalog({
    target,
    videoTarget,
    batchSize,
    additionalOnly: true,
    videoDiscoveryBudget: discovery,
    dryRun,
    onBatch: (current, batchIndex) => {
      console.log(`batch ${batchIndex}`, {
        processed: current.processed,
        imported: current.imported,
        published: current.published,
        publishedVideo: current.publishedVideo,
        publishedNoVideo: current.publishedNoVideo,
        skipped: current.skipped,
        duplicates: current.duplicates,
        failed: current.failed,
      });
    },
  });

  console.log("\n=== Curated CJ marketplace publish ===");
  console.log(`Selected: ${stats.selected}`);
  console.log(`Published: ${stats.published}`);
  console.log(`Video: ${stats.publishedVideo}`);
  console.log(`No Video: ${stats.publishedNoVideo}`);
  console.log(`Verified Supplier: ${stats.verifiedSuppliers}`);
  console.log(`Trending: ${stats.trending}`);
  console.log(`In Stock: ${stats.inStock}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);
  if (stats.failures.length) {
    console.log("Failures:", stats.failures.slice(0, 20));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

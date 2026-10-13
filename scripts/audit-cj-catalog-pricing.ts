/**
 * Review CJ catalog prices against the approved Jimvio markup.
 *
 * Dry run by default.
 *   APPLY=1 npx tsx scripts/audit-cj-catalog-pricing.ts
 *
 * APPLY updates unlocked products that have a positive supplier cost.
 * It does not unpublish products. Products that cannot be priced are flagged
 * in source_metadata.cj_catalog_review.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function runPool(jobs: Array<() => Promise<void>>, limit = 12): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    while (index < jobs.length) {
      const job = jobs[index];
      index += 1;
      if (job) await job();
    }
  });
  await Promise.all(workers);
}

async function main() {
  const apply = process.env.APPLY === "1";
  const { getServiceClient } = await import("../lib/cj/client");
  const { getUSDToRWFRate, calculateCJPricingAtRate } = await import("../lib/actions/cj_product");
  const { isJimvioPriceLocked } = await import("../lib/pricing/jimvio-base-price");
  const { reviewReasons } = await import("../lib/cj/catalog-operations");
  const { isPlayableVideoUrl, productHasPlayableVideo, videoCoverageRatio } = await import(
    "../lib/cj/video-coverage"
  );

  const db = getServiceClient();
  const rate = await getUSDToRWFRate();
  const pageSize = 200;
  let from = 0;
  let scanned = 0;
  let repriced = 0;
  let variantsRepriced = 0;
  let locked = 0;
  let conflicts = 0;
  let flagged = 0;
  let skipped = 0;
  let eligiblePublished = 0;
  let withVideo = 0;

  for (;;) {
    const { data, error } = await db
      .from("products")
      .select("id, status, is_active, cost_price, price, price_usd, images, source_metadata")
      .eq("source", "cj")
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) break;

    const publishedIds = rows
      .filter((row) => row.status === "active" && row.is_active)
      .map((row) => String(row.id));
    const unlockedIds = new Set<string>();
    const videoIds = new Set<string>();
    if (publishedIds.length > 0) {
      const { data: videos, error: videoError } = await db
        .from("product_videos")
        .select("product_id, url")
        .in("product_id", publishedIds);
      if (videoError) throw new Error(videoError.message);
      for (const video of videos ?? []) {
        if (isPlayableVideoUrl(video.url)) videoIds.add(String(video.product_id));
      }
    }

    const productJobs: Array<() => Promise<void>> = [];
    const variantJobs: Array<() => Promise<void>> = [];

    for (const row of rows) {
      scanned += 1;
      const meta =
        row.source_metadata && typeof row.source_metadata === "object" && !Array.isArray(row.source_metadata)
          ? { ...(row.source_metadata as Record<string, unknown>) }
          : {};
      const cost = Number(row.cost_price ?? 0);
      const images = Array.isArray(row.images) ? row.images.length : 0;
      const pid = typeof meta.cj_pid === "string" ? meta.cj_pid : null;
      const reasons = reviewReasons({ supplierPid: pid, costUsd: cost, imageCount: images });
      const published = row.status === "active" && row.is_active === true;
      if (published) {
        eligiblePublished += 1;
        if (videoIds.has(String(row.id)) || productHasPlayableVideo({ metadataVideos: meta.cj_videos })) {
          withVideo += 1;
        }
      }

      if (reasons.length > 0) {
        flagged += 1;
        if (apply) {
          meta.cj_catalog_review = { reasons, reviewed_at: new Date().toISOString() };
          const { error: flagError } = await db
            .from("products")
            .update({ source_metadata: meta })
            .eq("id", row.id);
          if (flagError) throw new Error(flagError.message);
        }
        skipped += 1;
        continue;
      }

      const priced = calculateCJPricingAtRate(cost, rate);
      if (!priced.calculated_at) {
        skipped += 1;
        continue;
      }

      if (isJimvioPriceLocked(meta)) {
        locked += 1;
        if (Math.abs(Number(row.price_usd ?? 0) - priced.price_usd) > 0.01) conflicts += 1;
      } else {
        const unchanged =
          Number(row.price) === priced.price &&
          Math.abs(Number(row.price_usd ?? 0) - priced.price_usd) <= 0.01;
        if (!unchanged) {
          if (apply) {
            meta.jimvio_pricing = {
              policy_id: "jimvio-cj-markup-2026-10",
              supplier_cost_usd: priced.supplier_cost_usd,
              tier_id: priced.tier_id,
              markup_rate: priced.markup_percent / 100,
              jimvio_base_price_usd: priced.price_usd,
              calculated_at: priced.calculated_at,
              shipping_excluded: true,
              transaction_fees_excluded: true,
            };
            delete meta.jimvio_pricing_conflict;
            const productId = String(row.id);
            const metadata = meta;
            productJobs.push(async () => {
              const { error: updateError } = await db
                .from("products")
                .update({
                  price: priced.price,
                  price_usd: priced.price_usd,
                  cost_price: priced.supplier_cost_usd,
                  affiliate_price: priced.affiliate_price,
                  affiliate_commission_rate: priced.affiliate_commission_rate,
                  source_metadata: metadata,
                })
                .eq("id", productId);
              if (updateError) throw new Error(updateError.message);
            });
          }
          repriced += 1;
        }
      }

      if (!isJimvioPriceLocked(meta)) unlockedIds.add(String(row.id));
    }

    if (unlockedIds.size > 0) {
      const variants: Array<{ id: string; price: number | null; source_metadata: unknown }> = [];
      for (let variantFrom = 0; ; variantFrom += 1000) {
        const { data: variantPage, error: variantError } = await db
          .from("product_variants")
          .select("id, price, source_metadata")
          .in("product_id", [...unlockedIds])
          .order("id", { ascending: true })
          .range(variantFrom, variantFrom + 999);
        if (variantError) throw new Error(variantError.message);
        variants.push(...(variantPage ?? []));
        if ((variantPage ?? []).length < 1000) break;
      }
      for (const variant of variants) {
        const variantMeta =
          variant.source_metadata && typeof variant.source_metadata === "object" && !Array.isArray(variant.source_metadata)
            ? { ...(variant.source_metadata as Record<string, unknown>) }
            : {};
        const variantCost = Number(variantMeta.supplier_cost_usd ?? variantMeta.price_usd ?? 0);
        if (!(variantCost > 0)) continue;
        const variantPrice = calculateCJPricingAtRate(variantCost, rate);
        if (!variantPrice.calculated_at || Number(variant.price) === variantPrice.price) continue;
        if (apply) {
          variantMeta.supplier_cost_usd = variantPrice.supplier_cost_usd;
          variantMeta.jimvio_base_price_usd = variantPrice.price_usd;
          variantMeta.jimvio_markup_rate = variantPrice.markup_percent / 100;
          variantMeta.jimvio_tier_id = variantPrice.tier_id;
          variantMeta.jimvio_price_calculated_at = variantPrice.calculated_at;
          const variantId = String(variant.id);
          const metadata = variantMeta;
          const next = variantPrice;
          variantJobs.push(async () => {
            const { error: variantUpdateError } = await db
              .from("product_variants")
              .update({
                price: next.price,
                affiliate_price: next.affiliate_price,
                affiliate_commission_rate: next.affiliate_commission_rate,
                source_metadata: metadata,
              })
              .eq("id", variantId);
            if (variantUpdateError) throw new Error(variantUpdateError.message);
          });
        }
        variantsRepriced += 1;
      }
    }

    console.log(`page ${from} products=${productJobs.length} variants=${variantJobs.length}`);
    await runPool(productJobs);
    await runPool(variantJobs);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  const coverage = videoCoverageRatio(withVideo, eligiblePublished);
  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry_run",
    usd_to_rwf_rate: rate,
    scanned,
    would_reprice_or_repriced: repriced,
    variants_repriced: variantsRepriced,
    price_locked: locked,
    locked_price_conflicts: conflicts,
    flagged_incomplete: flagged,
    skipped_incomplete: skipped,
    eligible_published: eligiblePublished,
    with_valid_video: withVideo,
    video_coverage: coverage,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

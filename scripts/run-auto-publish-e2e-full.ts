import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const pid = "1460476587618209792";
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const { enrichSingleProduct } = await import("../lib/cj/premium-intelligence/enrich-product");
  const { enrichProduct } = await import("../lib/cj/import-intelligence/filters");
  const { rawRowToCJProduct } = await import("../lib/cj/premium-intelligence/map-to-cj-product");
  const { evaluateV3Intelligence, toV3DbPayload } = await import("../lib/cj/premium-intelligence/v3-pipeline");
  const { updateIntelligence } = await import("../lib/cj/premium-intelligence/catalog-repository");
  const { upsertCJProduct } = await import("../lib/actions/cj_product");
  const { createAdminClient } = await import("../lib/supabase/admin");

  const db = getCatalogDB();
  const admin = createAdminClient();

  // Get vendor from existing CJ product
  const { data: sample } = await admin
    .from("products")
    .select("vendor_id")
    .eq("source", "cj")
    .not("vendor_id", "is", null)
    .limit(1)
    .single();

  const vendorId = sample?.vendor_id as string;
  if (!vendorId) throw new Error("No CJ vendor found");

  console.log("1. Enriching with freight resolution...");
  await enrichSingleProduct(pid);

  const { data: intel } = await db.from("cj_product_intelligence").select("*").eq("pid", pid).single();
  const { data: raw } = await db.from("cj_raw_products").select("*").eq("pid", pid).single();

  console.log("   delivery_days:", intel?.delivery_days);

  const cj = rawRowToCJProduct(raw, intel);
  let productId: string | undefined;

  const detailRes = await (async () => {
    const { getServiceClient, getCJToken, cjFetch } = await import("../lib/cj/client");
    const supabase = getServiceClient();
    const token = await getCJToken(supabase);
    return cjFetch<{ data: Record<string, unknown> }>(
      `/product/query?pid=${encodeURIComponent(pid)}&features=enable_video,enable_inventory`,
      token
    );
  })();

  const { data: existingMap } = await db
    .from("cj_product_map")
    .select("product_id")
    .eq("cj_pid", pid)
    .maybeSingle();

  if (existingMap?.product_id) {
    productId = existingMap.product_id as string;
    // Refresh images from enriched detail so publish validation passes
    const imageSet = Array.isArray(detailRes?.data?.productImageSet)
      ? (detailRes.data.productImageSet as string[])
      : [];
    const bigImage = detailRes?.data?.bigImage as string | undefined;
    const images = [...new Set([...imageSet, ...(bigImage ? [bigImage] : [])])].filter(
      (u) => typeof u === "string" && u.startsWith("http")
    );
    await admin
      .from("products")
      .update({
        status: "draft",
        is_active: false,
        auto_unpublished: false,
        ...(images.length > 0 ? { images } : {}),
      })
      .eq("id", productId);
    console.log("2. Reset existing product to draft:", productId, "images:", images.length);
  } else {
    console.log("2. Importing product...");
    const variants = (detailRes.data?.variants as Array<{ variantKey?: string }>) ?? [];
    const importResult = await upsertCJProduct(admin, cj, vendorId, [], variants);
    if (!importResult.success || !importResult.productId) {
      throw new Error(importResult.error ?? "Import failed");
    }
    productId = importResult.productId;
    console.log("   Imported:", productId);
  }

  const enriched = enrichProduct(cj, { [pid]: { productId } });
  enriched.intelligence.enrichmentStatus = intel?.enrichment_status;
  enriched.intelligence.trending = intel?.trending;

  const v3 = evaluateV3Intelligence(enriched);
  await updateIntelligence(pid, toV3DbPayload(v3));

  console.log("3. Auto publish evaluation:", {
    ready: v3.autoPublish.ready,
    score: v3.autoPublish.score,
    failures: v3.autoPublish.failures,
    blocked: v3.blocked,
  });

  if (!v3.autoPublish.ready || v3.blocked) {
    console.error("Product still not ready — cannot run E2E");
    process.exit(1);
  }

  console.log("\n4. Running auto publish E2E flow...\n");

  // Reset for clean autonomous run
  await admin
    .from("products")
    .update({ status: "draft", is_active: false })
    .eq("id", productId);
  await db.from("cj_auto_publish_queue").delete().eq("pid", pid);
  await db
    .from("cj_product_intelligence")
    .update({ catalog_tier: "HIDDEN" })
    .eq("pid", pid);

  const { triggerAutoPublishEvaluation } = await import(
    "../lib/cj/premium-intelligence/auto-publish-trigger"
  );
  const { runAutoPublishWorker } = await import(
    "../lib/cj/premium-intelligence/auto-publish-worker"
  );

  const trigger = await triggerAutoPublishEvaluation(pid, "signal_recalc");
  console.log("   Queued:", trigger.queued);

  const { data: queueRow } = await db
    .from("cj_auto_publish_queue")
    .select("*")
    .eq("pid", pid)
    .maybeSingle();

  if (queueRow?.next_attempt_at) {
    await db
      .from("cj_auto_publish_queue")
      .update({ next_attempt_at: new Date().toISOString() })
      .eq("id", queueRow.id);
  }

  const worker = await runAutoPublishWorker();
  console.log("   Worker:", worker.queue);

  const { data: productAfter } = await admin
    .from("products")
    .select("status, is_active, name")
    .eq("id", productId)
    .single();

  console.log("\n5. Product after worker:", productAfter);

  const { verifyPublishedProduct } = await import(
    "../lib/cj/premium-intelligence/system-publish"
  );
  const verification = await verifyPublishedProduct(productId);
  console.log("6. Verification:", verification);

  const { data: events } = await db
    .from("cj_auto_publish_events")
    .select("event_type, created_at")
    .eq("pid", pid)
    .order("created_at", { ascending: true });

  const types = (events ?? []).map((e) => e.event_type);
  console.log("7. Events:", types.filter((t) =>
    ["queued", "publishing", "auto_published", "verified"].includes(t)
  ).join(" → "));

  const success =
    productAfter?.status === "active" &&
    productAfter?.is_active &&
    verification.verified &&
    types.includes("queued") &&
    types.includes("publishing") &&
    types.includes("auto_published") &&
    types.includes("verified");

  console.log(success ? "\n✓ E2E SUCCESS" : "\n✗ E2E FAILED");
  process.exit(success ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

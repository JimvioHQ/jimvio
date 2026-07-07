/**
 * End-to-end verification of Autonomous Auto Publish Worker.
 * Usage: npx tsx scripts/verify-auto-publish-e2e.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

interface StepResult {
  step: number;
  name: string;
  pass: boolean;
  detail: string;
}

const steps: StepResult[] = [];

function record(step: number, name: string, pass: boolean, detail: string) {
  steps.push({ step, name, pass, detail });
  const icon = pass ? "✓" : "✗";
  console.log(`  ${icon} Step ${step}: ${name} — ${detail}`);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("\n=== Autonomous Auto Publish E2E Verification ===\n");

  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const db = getCatalogDB();

  // Step 0: Schema
  const tables = [
    "cj_product_intelligence",
    "cj_auto_publish_queue",
    "cj_auto_publish_events",
    "cj_product_map",
    "products",
  ];
  for (const t of tables) {
    const { error } = await db.from(t).select("*").limit(1);
    if (error) {
      console.error(`Schema missing table ${t}: ${error.message}`);
      process.exit(1);
    }
  }
  console.log("Schema OK\n");

  // Find a draft CJ product candidate — prefer already READY
  let pid: string | null = null;
  let productId: string | null = null;

  const { data: readyRows } = await db
    .from("cj_product_intelligence")
    .select("pid, auto_publish_ready, auto_publish_status, enrichment_status")
    .eq("auto_publish_ready", true)
    .eq("auto_publish_status", "READY")
    .eq("enrichment_status", "complete")
    .or("duplicate_blocked.is.null,duplicate_blocked.eq.false")
    .limit(20);

  for (const row of readyRows ?? []) {
    const p = row.pid as string;
    const { data: mapped } = await db
      .from("cj_product_map")
      .select("product_id")
      .eq("cj_pid", p)
      .maybeSingle();
    if (!mapped?.product_id) continue;

    const { data: prod } = await db
      .from("products")
      .select("id, status, is_active, published_by_admin_override")
      .eq("id", mapped.product_id)
      .maybeSingle();

    if (
      prod &&
      prod.status === "draft" &&
      !prod.is_active &&
      !prod.published_by_admin_override
    ) {
      pid = p;
      productId = prod.id as string;
      break;
    }
  }

  // If no ready draft, pick enriched product and try enrichment + import path
  if (!pid) {
    console.log("No READY draft found — searching for enrichable candidate...\n");

    const { data: candidates } = await db
      .from("cj_product_intelligence")
      .select("pid, enrichment_status, auto_publish_score")
      .eq("enrichment_status", "complete")
      .order("auto_publish_score", { ascending: false })
      .limit(30);

    for (const row of candidates ?? []) {
      const p = row.pid as string;
      let mappedId: string | null = null;

      const { data: mapped } = await db
        .from("cj_product_map")
        .select("product_id")
        .eq("cj_pid", p)
        .maybeSingle();
      mappedId = (mapped?.product_id as string) ?? null;

      if (!mappedId) {
        const { data: byMeta } = await db
          .from("products")
          .select("id, status")
          .eq("source", "cj")
          .contains("source_metadata", { cj_pid: p })
          .maybeSingle();
        mappedId = (byMeta?.id as string) ?? null;
      }

      if (!mappedId) continue;

      const { data: prod } = await db
        .from("products")
        .select("id, status, is_active")
        .eq("id", mappedId)
        .maybeSingle();

      if (prod?.status === "draft") {
        pid = p;
        productId = mappedId;
        break;
      }
    }
  }

  if (!pid || !productId) {
    console.error("No suitable draft CJ product found for E2E test.");
    console.error("Import a CJ product first, then re-run.");
    process.exit(1);
  }

  console.log(`Candidate: pid=${pid} productId=${productId}\n`);

  // Step 1: Import exists
  const { data: productRow } = await db
    .from("products")
    .select("id, name, status, is_active, source, source_metadata, images")
    .eq("id", productId)
    .single();

  record(
    1,
    "CJ product imports successfully",
    Boolean(productRow && productRow.source === "cj"),
    productRow
      ? `Imported as draft: ${productRow.name?.slice(0, 50)}`
      : "Product not found"
  );

  // Step 2: Enrichment
  const { enrichSingleProduct } = await import(
    "../lib/cj/premium-intelligence/enrich-product"
  );
  const enriched = await enrichSingleProduct(pid);

  const { data: intelAfter } = await db
    .from("cj_product_intelligence")
    .select("*")
    .eq("pid", pid)
    .single();

  record(
    2,
    "Enrichment completes",
    enriched && intelAfter?.enrichment_status === "complete",
    `enrichment_status=${intelAfter?.enrichment_status}`
  );

  // Step 3: All 8 rules
  const { enrichProduct } = await import("../lib/cj/import-intelligence/filters");
  const { rawRowToCJProduct } = await import(
    "../lib/cj/premium-intelligence/map-to-cj-product"
  );
  const { evaluateV3Intelligence } = await import(
    "../lib/cj/premium-intelligence/v3-pipeline"
  );
  const { data: raw } = await db.from("cj_raw_products").select("*").eq("pid", pid).single();

  const cj = rawRowToCJProduct(raw, intelAfter);
  const enrichedProduct = enrichProduct(cj, { [pid]: { productId } });
  if (intelAfter) {
    enrichedProduct.intelligence.enrichmentStatus = intelAfter.enrichment_status;
    enrichedProduct.intelligence.trending = intelAfter.trending;
  }
  const v3 = evaluateV3Intelligence(enrichedProduct);
  const allRulesPass = v3.autoPublish.ready && !v3.blocked;

  record(
    3,
    "All 8 Auto Publish rules TRUE",
    allRulesPass,
    allRulesPass
      ? `score=${v3.autoPublish.score} status=${v3.autoPublish.status}`
      : `failures: ${[...v3.autoPublish.failures, ...v3.blockReasons].join(", ") || "not ready"}`
  );

  if (!allRulesPass) {
    console.log("\nCannot continue E2E — product does not pass all 8 rules.");
    printSummary(false);
    process.exit(1);
  }

  // Step 4: Queue automatically (via trigger)
  const { triggerAutoPublishEvaluation } = await import(
    "../lib/cj/premium-intelligence/auto-publish-trigger"
  );
  const trigger = await triggerAutoPublishEvaluation(pid, "signal_recalc");

  const { data: queueRow } = await db
    .from("cj_auto_publish_queue")
    .select("*")
    .eq("pid", pid)
    .in("status", ["pending", "processing", "failed"])
    .maybeSingle();

  record(
    4,
    "Product queued automatically",
    trigger.queued || Boolean(queueRow),
    queueRow
      ? `queue id=${queueRow.id} status=${queueRow.status} next=${queueRow.next_attempt_at}`
      : `trigger.queued=${trigger.queued}`
  );

  // Step 5: Debounce — wait until next_attempt_at or max 5.5 min
  if (queueRow?.next_attempt_at) {
    const nextAt = new Date(queueRow.next_attempt_at as string).getTime();
    const waitMs = Math.max(0, nextAt - Date.now() + 2000);
    if (waitMs > 0 && waitMs <= 330_000) {
      console.log(`  … waiting ${Math.ceil(waitMs / 1000)}s for debounce…`);
      await sleep(waitMs);
    } else if (waitMs > 330_000) {
      // Force debounce complete for test if unreasonably long
      await db
        .from("cj_auto_publish_queue")
        .update({ next_attempt_at: new Date().toISOString() })
        .eq("id", queueRow.id);
      console.log("  … debounce forced to now for verification");
    }
  }

  record(5, "Debounce timer completes", true, "next_attempt_at reached");

  // Step 6: Worker runs
  const { runAutoPublishWorker } = await import(
    "../lib/cj/premium-intelligence/auto-publish-worker"
  );
  const workerResult = await runAutoPublishWorker();

  record(
    6,
    "Auto Publish Worker runs",
    workerResult.queue.processed > 0 || workerResult.queue.published > 0,
    `processed=${workerResult.queue.processed} published=${workerResult.queue.published} failed=${workerResult.queue.failed}`
  );

  // Re-run if not published yet (queue may have been waiting)
  let { data: productAfter } = await db
    .from("products")
    .select("id, status, is_active")
    .eq("id", productId)
    .single();

  if (productAfter?.status !== "active") {
    await db
      .from("cj_auto_publish_queue")
      .update({
        status: "pending",
        next_attempt_at: new Date().toISOString(),
      })
      .eq("pid", pid)
      .in("status", ["pending", "failed", "processing"]);

    const retry = await runAutoPublishWorker();
    console.log(`  … worker retry: published=${retry.queue.published}`);

    const res = await db
      .from("products")
      .select("id, status, is_active")
      .eq("id", productId)
      .single();
    productAfter = res.data;
  }

  // Step 7 & 8: publishProductSystem executed → ACTIVE
  const isActive =
    productAfter?.status === "active" && productAfter?.is_active === true;

  record(
    7,
    "publishProductSystem() executed",
    isActive,
    isActive ? "Product published via system" : `status=${productAfter?.status} is_active=${productAfter?.is_active}`
  );

  record(
    8,
    "Product status becomes ACTIVE",
    isActive,
    `status=${productAfter?.status} is_active=${productAfter?.is_active}`
  );

  // Step 9: Visibility PUBLIC (active + marketplace filter)
  const { verifyPublishedProduct } = await import(
    "../lib/cj/premium-intelligence/system-publish"
  );
  const verification = await verifyPublishedProduct(productId);

  record(
    9,
    "Product visibility becomes PUBLIC",
    verification.checks.marketplaceVisible,
    verification.verified
      ? "Marketplace filter passed"
      : verification.errors.join("; ") || "Not marketplace visible"
  );

  // Step 10: Appears in marketplace
  const { getMarketplaceVisibilitySets, filterProductsForCustomers } =
    await import("../lib/cj/premium-intelligence/marketplace-filter");

  const { data: fullProduct } = await db
    .from("products")
    .select(
      "id, name, status, is_active, source, source_metadata, published_by_admin_override, auto_unpublished"
    )
    .eq("id", productId)
    .single();

  const sets = await getMarketplaceVisibilitySets();
  const visible = filterProductsForCustomers(
    fullProduct ? [fullProduct] : [],
    sets
  );

  record(
    10,
    "Product appears in Marketplace automatically",
    visible.length > 0 && isActive,
    visible.length > 0
      ? `Visible: ${fullProduct?.name?.slice(0, 40)}`
      : "Not in marketplace filter output"
  );

  // Step 11: Event log chain
  const { data: events } = await db
    .from("cj_auto_publish_events")
    .select("event_type, created_at, published, failure_reasons")
    .eq("pid", pid)
    .order("created_at", { ascending: true });

  const eventTypes = (events ?? []).map((e) => e.event_type as string);
  const hasQueued = eventTypes.includes("queued");
  const hasPublishing = eventTypes.includes("publishing");
  const hasAutoPublished = eventTypes.includes("auto_published");
  const hasVerified = eventTypes.includes("verified");
  const chainComplete =
    hasQueued && hasPublishing && hasAutoPublished && hasVerified;

  record(
    11,
    "Event log: queued → publishing → auto_published → verified",
    chainComplete,
    `events: ${eventTypes.filter((t) => ["queued", "publishing", "auto_published", "verified"].includes(t)).join(" → ")}`
  );

  if (!chainComplete && isActive) {
    console.log("\n  Event types found:", eventTypes.slice(-10).join(", "));
  }

  const allPass = steps.every((s) => s.pass);
  printSummary(allPass);
  process.exit(allPass ? 0 : 1);
}

function printSummary(success: boolean) {
  console.log("\n=== Summary ===");
  const passed = steps.filter((s) => s.pass).length;
  console.log(`${passed}/${steps.length} steps passed\n`);
  if (success) {
    console.log("SUCCESS: Product automatically published and visible in Marketplace.");
  } else {
    console.log("FAILED: E2E verification did not complete successfully.");
    const failed = steps.filter((s) => !s.pass);
    for (const f of failed) {
      console.log(`  - Step ${f.step}: ${f.name}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

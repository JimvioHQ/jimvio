/**
 * Background worker health — run after crons resume post-migration.
 * Usage: npx tsx scripts/verify-workers.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const MAX_STALE_MS = 20 * 60_000; // 20 min — crons run every 2–5 min

function ageMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Date.now() - t;
}

function fresh(iso: string | null | undefined, label: string): string | null {
  const age = ageMs(iso);
  if (age == null) return `${label}: no timestamp`;
  if (age > MAX_STALE_MS) {
    return `${label}: stale ${Math.round(age / 60_000)}m ago (max ${MAX_STALE_MS / 60_000}m)`;
  }
  console.log(`  OK ${label}: ${Math.round(age / 1000)}s ago`);
  return null;
}

async function main() {
  console.log("\n=== Worker Health (post-cron resume) ===\n");

  const failures: string[] = [];
  const { getCatalogDB } = await import("../lib/cj/premium-intelligence/db");
  const db = getCatalogDB();

  // Scanner (runs inside auto-publish-worker every 2 min)
  const { getCatalogScannerStatus } = await import(
    "../lib/cj/premium-intelligence/catalog-scanner"
  );
  const scanner = await getCatalogScannerStatus();
  if (scanner.status === "schema_missing") {
    failures.push("scanner: schema missing (migration 072)");
  } else {
    const stale = fresh(scanner.lastBatchAt, "scanner last_batch_at");
    if (stale) failures.push(stale);
  }

  // Enrichment worker — recent enriched_at or queue activity
  const { data: recentEnriched } = await db
    .from("cj_product_intelligence")
    .select("enriched_at")
    .eq("enrichment_status", "complete")
    .not("enriched_at", "is", null)
    .order("enriched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const enrichStale = fresh(
    recentEnriched?.enriched_at as string | undefined,
    "enrichment last enriched_at"
  );
  if (enrichStale) {
    const { data: queueTouch } = await db
      .from("cj_enrichment_queue")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const queueStale = fresh(
      queueTouch?.updated_at as string | undefined,
      "enrichment queue updated_at"
    );
    if (queueStale) failures.push(enrichStale);
  }

  // Publish worker — recent queue or event activity
  const { data: queueRow } = await db
    .from("cj_auto_publish_queue")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const publishStale = fresh(
    queueRow?.updated_at as string | undefined,
    "publish queue updated_at"
  );
  if (publishStale) {
    const { data: eventRow } = await db
      .from("cj_auto_publish_events")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const eventStale = fresh(
      eventRow?.created_at as string | undefined,
      "auto_publish_events created_at"
    );
    if (eventStale) failures.push(publishStale);
  }

  // Maintenance worker — must run without error
  try {
    const { runMarketplaceMaintenance } = await import(
      "../lib/cj/premium-intelligence/marketplace-maintenance"
    );
    const start = Date.now();
    const result = await runMarketplaceMaintenance();
    console.log(
      `  OK maintenance dry-run (${Date.now() - start}ms):`,
      JSON.stringify(result).slice(0, 120)
    );
  } catch (e) {
    const msg = (e as Error).message;
    console.log(`  FAIL maintenance: ${msg}`);
    failures.push(`maintenance: ${msg}`);
  }

  console.log("\n=== Summary ===\n");
  if (failures.length === 0) {
    console.log("ALL WORKERS HEALTHY");
    process.exit(0);
  }
  console.log(`FAILURES (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  console.log("\nIf crons were just resumed, wait 2–5 minutes and re-run.\n");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

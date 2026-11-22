import { requireAdmin } from "@/lib/auth/api-helpers";
import { isCjProductIntelligenceProcessingEnabled } from "@/lib/cj/intelligence-kill-switch";
import { bootstrapCatalog } from "@/lib/cj/premium-intelligence/bootstrap";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import {
  processEnrichmentQueue,
  retryFailedEnrichments,
  syncCjListCatalog,
} from "@/lib/cj/premium-intelligence";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  if (!isCjProductIntelligenceProcessingEnabled()) {
    return Response.json(
      {
        success: false,
        disabled: true,
        reason: "cj_product_intelligence_kill_switch",
        message: "Bulk catalog intelligence is disabled. Use Import from CJ with a selected product PID.",
      },
      { status: 409 },
    );
  }

  try {
    const health = await getSchemaHealth();
    if (!health.ready) {
      return Response.json(
        {
          success: false,
          error: `Missing tables: ${health.missingTables.join(", ")}. Apply ${health.migrationFile} first.`,
          missingTables: health.missingTables,
        },
        { status: 503 }
      );
    }

    const bootstrap = await bootstrapCatalog({
      runSyncIfEmpty: true,
      runEnrichment: false,
    });

    const listSync = await syncCjListCatalog({ maxPages: 120 });
    await bootstrapCatalog({ runSyncIfEmpty: false, runEnrichment: false });
    const retried = await retryFailedEnrichments(100);
    const enrichment = await processEnrichmentQueue(30);

    return Response.json({
      success: true,
      bootstrap,
      listSync,
      retried,
      enrichment,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

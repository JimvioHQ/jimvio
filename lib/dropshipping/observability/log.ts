import type { SupabaseClient } from "@supabase/supabase-js";

export async function logIntegration(
  db: SupabaseClient,
  entry: {
    vendorId?: string | null;
    storeId?: string | null;
    supplierCode?: string | null;
    operation: string;
    requestId?: string | null;
    jobId?: string | null;
    externalId?: string | null;
    durationMs?: number | null;
    status: "success" | "error" | "skipped" | "retry";
    errorCode?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  // Never log tokens/secrets — callers must not pass them in metadata
  const safeMeta = { ...(entry.metadata ?? {}) };
  for (const key of Object.keys(safeMeta)) {
    if (/token|secret|password|authorization|api_key|access_token/i.test(key)) {
      delete safeMeta[key];
    }
  }

  await db.from("ds_integration_logs").insert({
    vendor_id: entry.vendorId ?? null,
    store_id: entry.storeId ?? null,
    supplier_code: entry.supplierCode ?? null,
    operation: entry.operation,
    request_id: entry.requestId ?? null,
    job_id: entry.jobId ?? null,
    external_id: entry.externalId ?? null,
    duration_ms: entry.durationMs ?? null,
    status: entry.status,
    error_code: entry.errorCode ?? null,
    message: entry.message ?? null,
    metadata: safeMeta,
  });
}

import type { AutoPublishResult } from "../import-intelligence/auto-publish-engine";
import { getCatalogDB } from "./db";

export type AutoPublishEventType =
  | "evaluation"
  | "auto_publish"
  | "bulk_publish"
  | "force_publish"
  | "retry_publish"
  | "queue_publish"
  | "queue_failed"
  | "unpublished"
  | "duplicate_blocked"
  | "supplier_change"
  | "stock_change"
  | "shipping_change"
  | "supplier_blacklist"
  | "quality_recalc"
  | "catalog_cleanup"
  | "queued"
  | "publishing"
  | "auto_published"
  | "retry"
  | "verified";

export interface AutoPublishEventInput {
  pid?: string;
  productId?: string;
  supplier?: string;
  score?: number;
  ready?: boolean;
  published?: boolean;
  adminOverride?: boolean;
  failureReasons?: string[];
  pendingReasons?: string[];
  status?: string;
  userId?: string;
  processingTimeMs?: number;
  eventType: AutoPublishEventType;
}

export async function logAutoPublishEvent(input: AutoPublishEventInput): Promise<void> {
  const db = getCatalogDB();
  const { error } = await db.from("cj_auto_publish_events").insert({
    pid: input.pid ?? null,
    product_id: input.productId ?? null,
    supplier: input.supplier ?? null,
    score: input.score ?? 0,
    ready: input.ready ?? false,
    published: input.published ?? false,
    admin_override: input.adminOverride ?? false,
    failure_reasons: input.failureReasons ?? [],
    pending_reasons: input.pendingReasons ?? [],
    status: input.status ?? null,
    user_id: input.userId ?? null,
    processing_time_ms: input.processingTimeMs ?? null,
    event_type: input.eventType,
  });

  if (error) {
    console.error("[auto-publish-events]", error.message);
  }
}

export function resultToEventInput(
  result: AutoPublishResult,
  extra: AutoPublishEventInput
): AutoPublishEventInput {
  return {
    score: result.score,
    ready: result.ready,
    failureReasons: result.failures,
    pendingReasons: result.pendingEnrichment,
    status: result.status,
    ...extra,
  };
}

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

/** Keep upstream HTML error pages out of logs while preserving actionable diagnostics. */
function safeDatabaseError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  const rawMessage = error.message ?? "";
  const isHtml = /<!doctype html|<html[\s>]/i.test(rawMessage);
  const statusMatch = rawMessage.match(/(?:^|\D)(522|502|503|504)(?:\D|$)/);
  return {
    code: error.code ?? null,
    status: statusMatch?.[1] ?? null,
    message: isHtml
      ? `Upstream returned an HTML error page${statusMatch ? ` (HTTP ${statusMatch[1]})` : ""}`
      : rawMessage.slice(0, 240),
    details: error.details?.slice(0, 160) ?? null,
    hint: error.hint?.slice(0, 160) ?? null,
  };
}

export async function logAutoPublishEvent(input: AutoPublishEventInput): Promise<void> {
  try {
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
      console.warn("[auto-publish-events] event write failed", safeDatabaseError(error));
    }
  } catch (error) {
    console.warn("[auto-publish-events] event write threw", {
      message: error instanceof Error ? error.message.slice(0, 240) : "unknown error",
    });
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

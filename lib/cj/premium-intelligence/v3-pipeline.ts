/**
 * v3 Intelligence Pipeline — enriches auto-publish evaluation with v3 signals.
 * Additive layer — does not replace v2 evaluateAutoPublish.
 */

import { assessProductQuality } from "../import-intelligence/ai-quality-engine";
import {
  evaluateAutoPublish,
  type AutoPublishResult,
} from "../import-intelligence/auto-publish-engine";
import {
  detectDuplicate,
  type DuplicateMatch,
} from "../import-intelligence/duplicate-detection";
import type { EnrichedProduct } from "../import-intelligence/types";
import { computePublishPriority } from "./smart-queue-priority";
import {
  computeSupplierReputationFromProduct,
  type SupplierReputation,
} from "./supplier-reputation-engine";

export interface V3Intelligence {
  autoPublish: AutoPublishResult;
  qualityConfidence: "very_high" | "high" | "medium" | "low";
  qualityExplanation: string;
  qualityFactors: string[];
  supplierReputation: SupplierReputation;
  duplicate: DuplicateMatch | null;
  publishPriority: number;
  blocked: boolean;
  blockReasons: string[];
}

export function evaluateV3Intelligence(
  product: EnrichedProduct,
  options?: {
    duplicateCandidates?: EnrichedProduct[];
    adminOverride?: boolean;
  }
): V3Intelligence {
  const autoPublish = evaluateAutoPublish(product, {
    adminOverride: options?.adminOverride,
  });
  const quality = assessProductQuality(product, autoPublish);
  const supplierReputation = computeSupplierReputationFromProduct(product);
  const duplicate = options?.duplicateCandidates
    ? detectDuplicate(product, options.duplicateCandidates)
    : null;
  const publishPriority = computePublishPriority(product);

  const blockReasons: string[] = [];
  if (supplierReputation.blacklisted) {
    blockReasons.push("Supplier blacklisted");
  }
  if (duplicate?.blocked) {
    blockReasons.push(`Duplicate detected (${Math.round(duplicate.similarity * 100)}% similar to ${duplicate.duplicatePid})`);
  }

  return {
    autoPublish,
    qualityConfidence: quality.confidence,
    qualityExplanation: quality.explanation,
    qualityFactors: quality.factors,
    supplierReputation,
    duplicate,
    publishPriority,
    blocked: blockReasons.length > 0,
    blockReasons,
  };
}

export function toV3DbPayload(v3: V3Intelligence) {
  return {
    ...{
      auto_publish_ready: v3.autoPublish.ready && !v3.blocked,
      auto_publish_score: v3.autoPublish.score,
      auto_publish_status: v3.blocked
        ? "REQUIREMENTS_MISSING"
        : v3.autoPublish.status,
      auto_publish_failures: [
        ...v3.autoPublish.failures,
        ...v3.blockReasons,
      ],
      pending_enrichment_reasons: v3.autoPublish.pendingEnrichment,
      last_auto_publish_check: new Date().toISOString(),
    },
    quality_confidence: v3.qualityConfidence,
    quality_explanation: v3.qualityExplanation,
    supplier_reputation_score: v3.supplierReputation.score,
    duplicate_blocked: v3.duplicate?.blocked ?? false,
    duplicate_ref_pid: v3.duplicate?.duplicatePid ?? null,
    duplicate_similarity: v3.duplicate?.similarity ?? null,
    publish_priority: v3.publishPriority,
    last_quality_check: new Date().toISOString(),
  };
}

export function attachV3Intelligence(
  product: EnrichedProduct,
  options?: {
    duplicateCandidates?: EnrichedProduct[];
    adminOverride?: boolean;
  }
): EnrichedProduct {
  const v3 = evaluateV3Intelligence(product, options);

  return {
    ...product,
    intelligence: {
      ...product.intelligence,
      autoPublish: {
        ready: v3.autoPublish.ready && !v3.blocked,
        score: v3.autoPublish.score,
        status: v3.blocked ? "REQUIREMENTS_MISSING" : v3.autoPublish.status,
        failures: [...v3.autoPublish.failures, ...v3.blockReasons],
        pendingEnrichment: v3.autoPublish.pendingEnrichment,
        checks: v3.autoPublish.checks,
        decision: v3.blocked
          ? { status: "DRAFT", visibility: "PRIVATE", published: false }
          : v3.autoPublish.decision,
        lastCheck: new Date().toISOString(),
        qualityConfidence: v3.qualityConfidence,
        qualityExplanation: v3.qualityExplanation,
        supplierReputation: v3.supplierReputation,
        duplicateBlocked: v3.duplicate?.blocked,
        duplicateRefPid: v3.duplicate?.duplicatePid,
        publishPriority: v3.publishPriority,
      },
    },
  };
}

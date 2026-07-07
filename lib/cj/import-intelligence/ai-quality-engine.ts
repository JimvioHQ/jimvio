/**
 * AI Quality Engine v3 — confidence scoring with explanations.
 * Rule-based intelligence layer (no external API dependency).
 */

import type { EnrichedProduct } from "./types";
import type { AutoPublishResult } from "./auto-publish-engine";

export type QualityConfidence = "very_high" | "high" | "medium" | "low";

export interface QualityAssessment {
  confidence: QualityConfidence;
  explanation: string;
  factors: string[];
}

function confidenceFromScore(score: number): QualityConfidence {
  if (score >= 90) return "very_high";
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

export function assessProductQuality(
  product: EnrichedProduct,
  autoPublish: AutoPublishResult
): QualityAssessment {
  const factors: string[] = [];
  let score = 0;

  const health = product.intelligence.healthScore ?? 0;
  score += health * 0.25;
  if (health >= 90) factors.push("Excellent health score");
  else if (health >= 75) factors.push("Good health score");
  else factors.push("Health score needs improvement");

  const passed = autoPublish.checks.filter((c) => c.passed).length;
  score += (passed / 8) * 40;
  if (passed === 8) factors.push("All 8 publish requirements met");
  else factors.push(`${8 - passed} requirement(s) failing`);

  const tier = product.intelligence.catalogTier;
  if (tier === "ELITE") {
    score += 20;
    factors.push("Elite catalog tier");
  } else if (tier === "PREMIUM") {
    score += 15;
    factors.push("Premium catalog tier");
  } else if (tier === "STANDARD") {
    score += 8;
  }

  const margin = product.intelligence.profit.marginPercent ?? 0;
  if (margin >= 40) {
    score += 10;
    factors.push("Strong profit margin");
  } else if (margin >= 25) {
    score += 5;
  }

  if (product.intelligence.enrichmentStatus === "complete") {
    score += 5;
    factors.push("Fully enriched product data");
  } else {
    factors.push("Enrichment incomplete — confidence reduced");
  }

  const confidence = confidenceFromScore(Math.min(100, Math.round(score)));

  const labels: Record<QualityConfidence, string> = {
    very_high: "Very High — premium product ready for marketplace",
    high: "High — strong quality signals across requirements",
    medium: "Medium — publishable with some quality gaps",
    low: "Low — significant quality concerns detected",
  };

  return {
    confidence,
    explanation: labels[confidence],
    factors,
  };
}

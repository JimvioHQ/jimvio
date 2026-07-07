/**
 * Marketplace Quality Score v4 — Jimvio Quality 0-100 with badge labels.
 */

import type { MarketplaceProductSignals, QualityLabel } from "./types";

export function qualityLabelFromScore(score: number): QualityLabel {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Poor";
}

export function computeJimvioQualityScore(signals: MarketplaceProductSignals): number {
  let score = 40;

  if (signals.rating > 0) score += signals.rating * 8;
  if (signals.reviewCount >= 10) score += 8;
  else if (signals.reviewCount >= 3) score += 4;

  if (signals.hasVideo) score += 12;
  if (signals.isFreeShipping) score += 5;

  const days = signals.deliveryTime ? parseInt(signals.deliveryTime, 10) : null;
  if (days !== null && days <= 7) score += 10;
  else if (days !== null && days <= 14) score += 5;

  if (signals.supplierReputation) {
    score += (signals.supplierReputation / 100) * 15;
  }

  if (signals.qualityConfidence === "very_high") score += 10;
  else if (signals.qualityConfidence === "high") score += 6;
  else if (signals.qualityConfidence === "medium") score += 3;

  if (signals.autoPublishReady) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

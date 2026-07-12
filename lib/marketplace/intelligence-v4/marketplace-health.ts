/**
 * Marketplace Health v4 — overall marketplace health snapshot.
 */

import type { MarketplaceHealthSnapshot } from "./types";

export interface HealthInputRow {
  rankScore: number;
  qualityScore: number;
  deliveryDays: number | null;
  conversionRate: number;
  refundRate: number;
  supplierReputation: number;
  hasVideo: boolean;
  duplicateHidden: boolean;
  trendingScore: number;
  fastShipping: boolean;
}

export function computeMarketplaceHealth(
  rows: HealthInputRow[],
  revenue7d = 0,
  orders7d = 0
): MarketplaceHealthSnapshot {
  const active = rows.filter((r) => !r.duplicateHidden);
  const total = rows.length;
  const activeCount = active.length;

  if (activeCount === 0) {
    return {
      healthPercent: 0,
      healthLabel: "Critical",
      avgQuality: 0,
      avgShippingDays: null,
      conversionRate: 0,
      refundPrediction: 0,
      supplierHealth: 0,
      videoPercent: 0,
      duplicatePercent: 0,
      trendingPercent: 0,
      fastShippingPercent: 0,
      totalProducts: total,
      activeProducts: 0,
      revenue7d,
      orders7d,
      ctrAvg: 0,
      snapshotAt: new Date().toISOString(),
    };
  }

  const avg = (fn: (r: HealthInputRow) => number) =>
    active.reduce((s, r) => s + fn(r), 0) / activeCount;

  const avgQuality = avg((r) => r.qualityScore);
  const avgRank = avg((r) => r.rankScore);
  const conversionRate = avg((r) => r.conversionRate);
  const refundPrediction = avg((r) => r.refundRate);
  const supplierHealth = avg((r) => r.supplierReputation);

  const shippingRows = active.filter((r) => r.deliveryDays !== null);
  const avgShippingDays =
    shippingRows.length > 0
      ? shippingRows.reduce((s, r) => s + (r.deliveryDays ?? 0), 0) / shippingRows.length
      : null;

  const videoPercent = (active.filter((r) => r.hasVideo).length / activeCount) * 100;
  const duplicatePercent = total > 0 ? ((total - activeCount) / total) * 100 : 0;
  const trendingPercent =
    (active.filter((r) => r.trendingScore >= 60).length / activeCount) * 100;
  const fastShippingPercent =
    (active.filter((r) => r.fastShipping).length / activeCount) * 100;
  const ctrAvg = conversionRate;

  const healthPercent = Math.round(
    avgQuality * 0.25 +
    avgRank * 0.2 +
    supplierHealth * 0.15 +
    (100 - refundPrediction * 100) * 0.15 +
    videoPercent * 0.1 +
    fastShippingPercent * 0.1 +
    trendingPercent * 0.05
  );

  const healthLabel =
    healthPercent >= 85 ? "Excellent"
    : healthPercent >= 70 ? "Good"
    : healthPercent >= 50 ? "Average"
    : "Needs Attention";

  return {
    healthPercent,
    healthLabel,
    avgQuality: Math.round(avgQuality * 10) / 10,
    avgShippingDays: avgShippingDays !== null ? Math.round(avgShippingDays * 10) / 10 : null,
    conversionRate: Math.round(conversionRate * 10000) / 10000,
    refundPrediction: Math.round(refundPrediction * 10000) / 10000,
    supplierHealth: Math.round(supplierHealth * 10) / 10,
    videoPercent: Math.round(videoPercent * 10) / 10,
    duplicatePercent: Math.round(duplicatePercent * 10) / 10,
    trendingPercent: Math.round(trendingPercent * 10) / 10,
    fastShippingPercent: Math.round(fastShippingPercent * 10) / 10,
    totalProducts: total,
    activeProducts: activeCount,
    revenue7d,
    orders7d,
    ctrAvg: Math.round(ctrAvg * 10000) / 10000,
    snapshotAt: new Date().toISOString(),
  };
}
